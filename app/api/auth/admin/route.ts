import {z} from 'zod';
import {AppError,errorResponse,readBody} from '@/lib/server/api';
import {googleSession,googleSettings,usesGoogleLogin} from '@/lib/server/google-auth';
import {issueInvite,listInvites,revokeInvite} from '@/lib/server/invites';

export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
function requireAdmin(request:Request,write=false) {
  const settings=usesGoogleLogin() && googleSettings();
  if (!settings || (write && request.headers.get('origin')!==settings.origin) ||
      googleSession(request,settings)?.email!==settings.adminEmail) throw new AppError('管理者のみ操作できます。',403);
}
export async function GET(request:Request) {
  try {requireAdmin(request);return Response.json({invites:await listInvites()},{headers});}
  catch(error) {return errorResponse(error);}
}
export async function POST(request:Request) {
  try {
    requireAdmin(request,true);
    const body=z.discriminatedUnion('action',[z.object({action:z.literal('issue')}),z.object({action:z.literal('revoke'),id:z.uuid()})]).parse(await readBody(request));
    if(body.action==='issue')return Response.json(await issueInvite(),{headers,status:201});
    if(!await revokeInvite(body.id))throw new AppError('対象の招待はすでに停止されているか、見つかりません。',404);
    return Response.json({ok:true},{headers});
  } catch(error) {return errorResponse(error);}
}
