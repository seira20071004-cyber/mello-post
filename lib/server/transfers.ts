import {randomBytes,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {AppError} from './api';
import {transferStore} from './transfer-store';
export const transferInput=z.object({title:z.string().min(1).max(120),caption:z.string().max(2100),count:z.number().int().min(1).max(10)});
const tokenPattern=/^[a-f0-9]{32}$/;
export const TTL=30*60*1000,MAX_FILE=8*1024*1024;
type Meta=z.infer<typeof transferInput>&{expiresAt:number;uploadSecret:string;ready:boolean};
const enc=new TextEncoder();
function checkToken(token:string){if(!tokenPattern.test(token))throw new AppError('受け取りリンクを確認してください',404);}
export async function createTransfer(input:z.infer<typeof transferInput>){
  const store=transferStore();await store.cleanup?.();const token=randomBytes(16).toString('hex'),uploadSecret=randomBytes(16).toString('hex');
  const meta:Meta={...transferInput.parse(input),expiresAt:Date.now()+TTL,uploadSecret,ready:false};await store.put(`${token}/meta.json`,enc.encode(JSON.stringify(meta)));return {token,uploadSecret,expiresAt:meta.expiresAt};
}
export async function readTransfer(token:string){checkToken(token);const bytes=await transferStore().get(`${token}/meta.json`);if(!bytes)throw new AppError('受け取りリンクが見つかりません。送る側でQRを作り直してください',404);const m=JSON.parse(new TextDecoder().decode(bytes)) as Meta;if(m.expiresAt<=Date.now()){await transferStore().remove(token);throw new AppError('受け取り期限が切れました。QRを作り直してください',410);}return m;}
function uploadAuth(meta:Meta,secret:string){const a=Buffer.from(meta.uploadSecret),b=Buffer.from(secret);if(a.length!==b.length||!timingSafeEqual(a,b))throw new AppError('送信の権限を確認してください',403);}
function checkIndex(index:number,m:Meta){if(!Number.isInteger(index)||index<0||index>=m.count)throw new AppError('画像番号が正しくありません',404);}
export async function putTransferFile(token:string,index:number,secret:string,bytes:Uint8Array){const meta=await readTransfer(token);uploadAuth(meta,secret);checkIndex(index,meta);if(meta.ready)throw new AppError('送信済みです。新しいQRを作成してください',409);
  if(bytes.length<24||bytes.length>MAX_FILE||!Buffer.from(bytes.subarray(0,8)).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new AppError('8MB以下のPNG画像を選んでください',413);
  const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(data.getUint32(16)>4000||data.getUint32(20)>4000)throw new AppError('画像サイズが大きすぎます',413);
  await transferStore().put(`${token}/${index}.png`,bytes);
}
export async function completeTransfer(token:string,secret:string){const m=await readTransfer(token);uploadAuth(m,secret);for(let i=0;i<m.count;i++)if(!await transferStore().get(`${token}/${i}.png`))throw new AppError('まだ送信されていない画像があります',409);m.ready=true;await transferStore().put(`${token}/meta.json`,enc.encode(JSON.stringify(m)));}
export async function getTransferFile(token:string,index:number){const m=await readTransfer(token);checkIndex(index,m);if(!m.ready)throw new AppError('画像を送信中です。少し待って開き直してください',409);const file=await transferStore().get(`${token}/${index}.png`);if(!file)throw new AppError('画像が見つかりません',404);return file;}
export async function removeTransfer(token:string,secret:string){const m=await readTransfer(token);uploadAuth(m,secret);await transferStore().remove(token);}
export function transferResponse(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}
export function transferError(e:unknown){return transferResponse({error:e instanceof Error?e.message:'送信に失敗しました'},e instanceof AppError?e.status:500);}
