'use client';
import {useEffect,useRef,useState} from 'react';

type Invite={id:string;expires_at:number;email:string|null;revoked_at:number|null};
type Issued={code:string;expiresAt:number};
const date=(time:number)=>new Date(time).toLocaleString('ja-JP',{dateStyle:'medium',timeStyle:'short'});
async function adminRequest(body?:object) {
  const res=await fetch('/api/auth/admin',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
  const data=await res.json();
  if(!res.ok)throw new Error(data.error);
  return data;
}

export default function InviteManager({onClose}:{onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [invites,setInvites]=useState<Invite[]>([]);
  const [issued,setIssued]=useState<Issued|null>(null);
  const [pending,setPending]=useState(true);
  const [error,setError]=useState('');
  const [confirmId,setConfirmId]=useState('');
  useEffect(()=>{
    dialog.current?.showModal();
    void load();
  },[]);
  async function load() {
    try {setInvites((await adminRequest()).invites);}
    catch(e){setError((e as Error).message);}
    finally{setPending(false);}
  }
  async function change(body:{action:'issue'}|{action:'revoke';id:string}) {
    setPending(true);
    setError('');
    try{
      const result=await adminRequest(body);
      if(body.action==='issue')setIssued(result);
      else setConfirmId('');
      await load();
    }catch(e){setError((e as Error).message);}
    finally{setPending(false);}
  }
  return <dialog ref={dialog} className="help-dialog invite-manager" aria-labelledby="invite-heading" onCancel={onClose}>
    <h2 id="invite-heading">招待・利用者管理</h2>
    <p>招待コードは一人につき一回使えます。発行から7日間有効です。</p>
    <div className="dialog-actions">
      <button className="button primary" disabled={pending} onClick={()=>void change({action:'issue'})}>招待コードを発行</button>
      <button className="button" onClick={onClose}>閉じる</button>
    </div>
    {issued&&<div className="issued-invite"><label>新しい招待コード<input readOnly value={issued.code} onFocus={e=>e.target.select()}/></label>
      <small>有効期限 {date(issued.expiresAt)}。コードはここで控えてください。</small></div>}
    {error&&<p role="alert">{error}</p>}
    {!pending&&!invites.length&&<p>招待はまだありません。</p>}
    <ul className="invite-list">{invites.map(invite=>{
      const expired=invite.expires_at<=Date.now()&&!invite.email;
      return <li key={invite.id}><div><strong>{invite.email||'未使用の招待'}</strong>
        <small>{invite.revoked_at?'停止済み':invite.email?'利用中':expired?'期限切れ':'期限 '+date(invite.expires_at)}</small></div>
        {!invite.revoked_at&&!expired&&(confirmId===invite.id?<div>
          <button className="button" disabled={pending} onClick={()=>void change({action:'revoke',id:invite.id})}>停止を確定</button>
          <button className="button" onClick={()=>setConfirmId('')}>戻る</button>
        </div>:<button className="button" disabled={pending} onClick={()=>setConfirmId(invite.id)}>{invite.email?'利用を停止':'コードを無効にする'}</button>)}
      </li>;
    })}</ul>
  </dialog>;
}
