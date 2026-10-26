'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,Flower2,LoaderCircle,LockKeyhole} from 'lucide-react';
import Studio from './Studio';

export default function PasswordGate(){
  const [loading,setLoading]=useState(true),[required,setRequired]=useState(true),[password,setPassword]=useState(''),[accepted,setAccepted]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{fetch('/api/config',{cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error();return response.json();}).then(config=>setRequired(config.passwordRequired)).catch(()=>setError('接続できませんでした。時間をおいてページを再読み込みしてください。')).finally(()=>setLoading(false));},[]);
  if(!loading&&(!required||accepted))return <Studio accessPassword={accepted}/>;
  async function unlock(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');
    try{const response=await fetch('/api/access',{method:'POST',headers:{'Content-Type':'application/json','x-app-password':password},body:'{}'});const data=await response.json();if(!response.ok)throw new Error(data.error||'パスワードを確認してください');setAccepted(password);setPassword('');}
    catch(e){setError(e instanceof Error?e.message:'接続に失敗しました。もう一度お試しください。');}finally{setBusy(false);}
  }
  return <main className="access-page"><section className="access-card"><div className="brand"><Flower2 size={33} strokeWidth={1.2}/><span>mellō<span className="brand-dot">.</span></span></div><div className="eyebrow">YOUR PRIVATE CREATIVE STUDIO</div><h1>あなたの想いを、<br/>美しい投稿に。</h1><p>専用の投稿スタジオへようこそ。<br/>共有された利用パスワードを入力してください。</p>{loading?<div className="access-loading" role="status"><LoaderCircle size={22} className="spin"/>スタジオに接続しています…</div>:<form onSubmit={unlock}><label htmlFor="access-password"><LockKeyhole size={17}/>利用パスワード</label><input id="access-password" aria-label="利用パスワード" type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="パスワードを入力" disabled={busy}/>{error&&<p className="access-error" role="alert">{error}</p>}<button type="submit" className="button primary full" disabled={busy||!password}>{busy?<LoaderCircle size={18} className="spin"/>:<>スタジオを開く<ArrowRight size={18}/></>}</button></form>}<small>大切なアイデアを、あなたのペースで。</small></section></main>;
}
