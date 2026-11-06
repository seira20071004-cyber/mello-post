import {googleSettings,startGoogleLogin,usesGoogleLogin} from '@/lib/server/google-auth';
export const runtime='nodejs';
export function GET() {
  const settings=usesGoogleLogin() && googleSettings();
  return settings ? startGoogleLogin(settings) : new Response('Googleログインの設定が必要です。',{status:503});
}
