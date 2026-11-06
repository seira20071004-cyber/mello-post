import {endGoogleLogin,googleSettings,usesGoogleLogin} from '@/lib/server/google-auth';
export const runtime='nodejs';
export function POST(request:Request) {
  const settings=usesGoogleLogin() && googleSettings();
  return settings ? endGoogleLogin(request,settings) : new Response(null,{status:503});
}
