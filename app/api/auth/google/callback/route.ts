import {finishGoogleLogin,googleSettings,usesGoogleLogin} from '@/lib/server/google-auth';
export const runtime='nodejs';
export function GET(request:Request) {
  const settings=usesGoogleLogin() && googleSettings();
  return settings ? finishGoogleLogin(request,settings) : new Response('Googleログインの設定が必要です。',{status:503});
}
