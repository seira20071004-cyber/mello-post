import {networkInterfaces} from 'node:os';
import {authorize,AppError,readBody} from '@/lib/server/api';
import {createTransfer,transferInput,transferError,transferResponse} from '@/lib/server/transfers';
export const runtime='nodejs';
const limits=new Map<string,{at:number;count:number}>();
export async function POST(request:Request){try{await authorize(request,false);const host=request.headers.get('host')||new URL(request.url).host;
  const now=Date.now(),old=limits.get(host),limit=old&&now-old.at<3600000?old:{at:now,count:0};if(limit.count>=20)throw new AppError('QRは1時間に20回まで作成できます',429);limit.count++;limits.set(host,limit);
  const parsed=transferInput.safeParse(await readBody(request));if(!parsed.success)throw new AppError('タイトル・画像枚数を確認してください');const result=await createTransfer(parsed.data);
  const url=new URL(request.url);url.host=host;let local=false;
  if(process.env.NODE_ENV==='development'&&['localhost','127.0.0.1'].includes(url.hostname)){const address=Object.values(networkInterfaces()).flat().find(n=>n?.family==='IPv4'&&!n.internal&&/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(n.address))?.address;if(address){url.hostname=address;local=true;}}
  return transferResponse({...result,url:`${url.origin}/receive#${result.token}`,local});
}catch(e){return transferError(e);}}
