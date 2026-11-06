import {z} from 'zod';
import {AppError,errorResponse,readBody} from '@/lib/server/api';
import {googleSession,googleSettings,usesGoogleLogin} from '@/lib/server/google-auth';
import {inviteAccess,redeemInvite} from '@/lib/server/invites';

export const runtime='nodejs';
export async function POST(request:Request) {
  try {
    const settings=usesGoogleLogin() && googleSettings();
    if (!settings || request.headers.get('origin')!==settings.origin) throw new AppError('このページから操作し直してください。',403);
    const session=googleSession(request,settings);
    if (!session) throw new AppError('Googleでログインし直してください。',401);
    const {code}=z.object({code:z.string().trim().regex(/^[a-f0-9]{8}(?:-[a-f0-9]{8}){3}$/i)}).parse(await readBody(request));
    const access=await inviteAccess(session.sub);
    if (access==='revoked') throw new AppError('利用が停止されています。管理者にお問い合わせください。',403);
    if (access!=='active' && !await redeemInvite(code,session.sub,session.email) && await inviteAccess(session.sub)!=='active') {
      throw new AppError('招待コードを使えません。期限切れ、使用済み、または入力間違いの可能性があります。',400);
    }
    return Response.json({ok:true});
  } catch(error) {return errorResponse(error);}
}
