import {completeTransfer,transferError,transferResponse} from '@/lib/server/transfers';
export const runtime='nodejs';
export async function POST(r:Request,c:{params:Promise<{token:string}>}){try{await completeTransfer((await c.params).token,r.headers.get('x-upload-token')||'');return transferResponse({ok:true});}catch(e){return transferError(e);}}
