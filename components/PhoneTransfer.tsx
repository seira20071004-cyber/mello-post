'use client';
import {useState} from 'react';
import QRCode from 'qrcode';
import {QrCode,LoaderCircle,Copy,X} from 'lucide-react';
import type {Input,Plan,SlideAsset} from '@/lib/schema';
import {pngBlob} from '@/lib/render';
type Session={token:string;uploadSecret:string;url:string;expiresAt:number;local:boolean;qr:string};
export default function PhoneTransfer({plan,input,assets,password,disabled}:{plan:Plan;input:Input;assets:SlideAsset[];password:string;disabled:boolean}){
  const [session,setSession]=useState<Session|null>(null),[busy,setBusy]=useState(''),[error,setError]=useState('');
  async function checked(response:Response){const data=await response.json();if(!response.ok)throw new Error(data.error||'送信できませんでした');return data;}
  async function revoke(s:Session){await checked(await fetch(`/api/transfers/${s.token}`,{method:'DELETE',headers:{'x-upload-token':s.uploadSecret}}));}
  async function create(){let pending:Session|null=null;setBusy('画像を準備しています…');setError('');try{
    if(session){await revoke(session).catch(()=>{});setSession(null);}
    const created=await checked(await fetch('/api/transfers',{method:'POST',headers:{'Content-Type':'application/json','x-app-password':password},body:JSON.stringify({title:plan.title,caption:plan.caption,count:plan.slides.length})}));
    pending={...created,qr:''};
    for(let i=0;i<plan.slides.length;i++){setBusy(`${i+1} / ${plan.slides.length}枚を送信しています…`);const png=await pngBlob(plan,input,i,assets[i]);await checked(await fetch(`/api/transfers/${created.token}/files/${i}`,{method:'PUT',headers:{'Content-Type':'image/png','x-upload-token':created.uploadSecret},body:png}));}
    await checked(await fetch(`/api/transfers/${created.token}/complete`,{method:'POST',headers:{'x-upload-token':created.uploadSecret}}));
    const qr=await QRCode.toDataURL(created.url,{width:256,margin:3,errorCorrectionLevel:'M',color:{dark:'#513a3e',light:'#ffffff'}});setSession({...created,qr});
  }catch(e){if(pending)await revoke(pending).catch(()=>{});setError(e instanceof Error?e.message:'QRを作成できませんでした');}finally{setBusy('');}}
  return <section className="phone-transfer" aria-label="スマホに送る"><div><QrCode size={25}/><h3>QRでスマホに送る</h3></div><p>完成した画像とキャプションを30分だけ受け取れるリンクを作ります。QRを知っている人が受け取れます。作成時点の内容を送信します。</p>
    <button className="button primary" disabled={disabled||!!busy} onClick={()=>void create()}>{busy?<LoaderCircle size={18} className="spin"/>:<QrCode size={18}/>} {busy|| (session?'編集後の内容でQRを作り直す':'画像を送信してQRを表示')}</button>
    {error&&<p role="alert" className="transfer-error">{error}</p>}
    {session&&<div className="transfer-result"><img src={session.qr} alt="スマホで画像を受け取るQRコード" width={256} height={256}/><div><strong>スマホのカメラで読み取ってください</strong><p>受け取り期限：{new Date(session.expiresAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}まで</p>{session.local&&<p>ローカル確認用です。このパソコンと同じWi-Fiにつなぎ、開発サーバーを起動したまま読み取ってください。</p>}<p>スマホでは共有メニューの「画像を保存」、または画像を長押しして写真に保存できます。</p><a href={session.url} target="_blank" rel="noreferrer" className="button">受け取り画面を確認</a><button className="button" onClick={async()=>{try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(session.url);}catch{setError('コピーできませんでした。QRを読み取るか受け取り画面を開いてください。');}}}><Copy size={16}/>リンクをコピー</button><button className="button" disabled={!!busy} onClick={async()=>{setBusy('取り消しています…');try{await revoke(session);setSession(null);}catch(e){setError((e as Error).message);}finally{setBusy('');}}}><X size={16}/>受け取りを取り消す</button></div></div>}
  </section>;
}
