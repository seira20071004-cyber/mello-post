import {readTransfer,removeTransfer,transferError,transferResponse} from '@/lib/server/transfers';
export const runtime='nodejs';
type Context={params:Promise<{token:string}>};
export async function GET(_r:Request,c:Context){try{const m=await readTransfer((await c.params).token);if(!m.ready)return transferResponse({error:'画像を送信中です。少し待って開き直してください'},409);return transferResponse({title:m.title,caption:m.caption,count:m.count,expiresAt:m.expiresAt});}catch(e){return transferError(e);}}
export async function DELETE(r:Request,c:Context){try{await removeTransfer((await c.params).token,r.headers.get('x-upload-token')||'');return transferResponse({ok:true});}catch(e){return transferError(e);}}
