import {models} from '@/lib/server/api';
import {googleSession,googleSettings,usesGoogleLogin} from '@/lib/server/google-auth';
import {inviteAccess} from '@/lib/server/invites';

export const runtime='nodejs';
export async function GET(request:Request) {
  const googleLogin=usesGoogleLogin();
  const settings=googleLogin?googleSettings():null;
  const session=googleSession(request,settings);
  const admin=!!session&&session.email===settings?.adminEmail;
  const headers={'Cache-Control':'no-store'};
  try {
    const access=session?(admin?'active':await inviteAccess(session.sub)):null;
    const estimate=Number(process.env.IMAGE_ESTIMATE_USD);
    return Response.json({
      configured:!!process.env.OPENAI_API_KEY?.trim(),
      passwordRequired:!googleLogin&&(!!process.env.APP_PASSWORD||process.env.NODE_ENV==='production'),
      googleLogin,googleReady:!!settings,
      account:session?{email:session.email,admin,access}:null,
      ...models(),imageEstimateUSD:Number.isFinite(estimate)&&estimate>0?estimate:null,
    },{headers});
  } catch {
    return Response.json({error:'アカウント情報を読み込めませんでした。'},{status:503,headers});
  }
}
