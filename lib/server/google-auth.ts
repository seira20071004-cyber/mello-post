import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';

const sessionLifetime = 30 * 24 * 60 * 60;
const flowLifetime = 10 * 60;
const googlePicture = z.string().max(512).refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      url.hostname.endsWith('.googleusercontent.com');
  } catch {
    return false;
  }
});
const sessionSchema = z.object({sub:z.string().min(1).max(255),email:z.email(),picture:googlePicture.optional(),exp:z.number().int()});
const flowSchema = z.object({state:z.string(),verifier:z.string(),exp:z.number().int()});
const googleProfile = z.object({sub:z.string().min(1).max(255),email:z.email(),email_verified:z.literal(true),hd:z.string().optional(),picture:googlePicture.optional().catch(undefined)});
const now = () => Math.floor(Date.now()/1000);

export const usesGoogleLogin = () => process.env.APP_AUTH_MODE === 'google';

export function googleSettings() {
  const {GOOGLE_CLIENT_ID:clientId,GOOGLE_CLIENT_SECRET:clientSecret,APP_SESSION_SECRET:secret,APP_AUTH_ORIGIN:origin} = process.env;
  const adminEmail = process.env.APP_ADMIN_EMAIL?.trim().toLowerCase();
  if (!clientId || !clientSecret || !secret || Buffer.byteLength(secret)<32 || !origin || !z.email().safeParse(adminEmail).success) return null;
  try {
    const url = new URL(origin);
    const local = process.env.NODE_ENV !== 'production' && ['127.0.0.1','localhost','[::1]'].includes(url.hostname);
    if (url.origin !== origin || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) return null;
    return {clientId,clientSecret,secret,origin,adminEmail,secure:url.protocol==='https:',redirectUri:origin+'/api/auth/google/callback'};
  } catch { return null; }
}
type Settings = NonNullable<ReturnType<typeof googleSettings>>;

function cookieName(kind:'flow'|'session', settings:Settings) {
  return (settings.secure?'__Host-':'')+'mello-'+kind;
}
function cookie(request:Request, name:string) {
  return request.headers.get('cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith(name+'='))?.slice(name.length+1);
}
function setCookie(kind:'flow'|'session', value:string, maxAge:number, settings:Settings) {
  return `${cookieName(kind,settings)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${settings.secure?'; Secure':''}`;
}
function mac(value:string, secret:string) {
  return createHmac('sha256',secret).update(value).digest('base64url');
}
function sign(value:object, kind:string, settings:Settings) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return payload+'.'+mac(kind+'.'+payload,settings.secret);
}
function readSigned(request:Request, kind:'flow'|'session', settings:Settings):unknown {
  const value = cookie(request,cookieName(kind,settings));
  if (!value || value.length>2048 || !/^[\w-]+\.[\w-]{43}$/.test(value)) return null;
  const [payload,signature] = value.split('.');
  if (!timingSafeEqual(Buffer.from(signature),Buffer.from(mac(kind+'.'+payload,settings.secret)))) return null;
  try { return JSON.parse(Buffer.from(payload,'base64url').toString()); } catch { return null; }
}

export function googleSession(request:Request, settings=googleSettings()) {
  if (!settings) return null;
  const result = sessionSchema.safeParse(readSigned(request,'session',settings));
  return result.success && result.data.exp>now() ? result.data : null;
}

function redirect(url:string, cookies:string[]=[]) {
  const headers = new Headers({Location:url,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  for (const value of cookies) headers.append('Set-Cookie',value);
  return new Response(null,{status:303,headers});
}

export function startGoogleLogin(settings:Settings) {
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id:settings.clientId,redirect_uri:settings.redirectUri,response_type:'code',
    scope:'openid email profile',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method:'S256',prompt:'select_account',
  }).toString();
  const flow = sign({state,verifier,exp:now()+flowLifetime},'flow',settings);
  return redirect(url.href,[setCookie('flow',flow,flowLifetime,settings)]);
}

export async function finishGoogleLogin(request:Request, settings:Settings) {
  const clearFlow = setCookie('flow','',0,settings);
  const fail = (reason:string, stage:string) => {
    console.error('Google login failed', {stage});
    return redirect(settings.origin+'/?login='+reason,[clearFlow]);
  };
  const params = new URL(request.url).searchParams;
  const flow = flowSchema.safeParse(readSigned(request,'flow',settings));
  const code = params.get('code');
  if (!flow.success || flow.data.exp<=now() || flow.data.state!==params.get('state') || !code) return fail('retry','flow');

  let phase='token-fetch';
  try {
    const token = await fetch('https://oauth2.googleapis.com/token',{
      method:'POST',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(10000),
      body:new URLSearchParams({code,client_id:settings.clientId,client_secret:settings.clientSecret,
        redirect_uri:settings.redirectUri,grant_type:'authorization_code',code_verifier:flow.data.verifier}),
    });
    phase='token-response';
    if (!token.ok) {
      const error = z.object({error:z.string().max(64)}).safeParse(await token.json());
      const category = error.success && ['invalid_client','invalid_grant','invalid_request','unauthorized_client'].includes(error.data.error) ? error.data.error : 'unknown';
      return fail('retry','token:'+category);
    }
    const access = z.object({access_token:z.string().min(1)}).parse(await token.json());
    phase='profile-fetch';
    const info = await fetch('https://openidconnect.googleapis.com/v1/userinfo',{
      headers:{Authorization:'Bearer '+access.access_token},redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(10000),
    });
    phase='profile-response';
    if (!info.ok) return fail('retry','profile');
    // The profile comes directly from Google using the token just exchanged by this server.
    const profile = googleProfile.safeParse(await info.json());
    if (!profile.success) return fail('denied','profile-validation');
    const {sub,hd,picture} = profile.data;
    const email = profile.data.email.toLowerCase();
    if (!email.endsWith('@gmail.com') && !hd) return fail('denied','profile-validation');
    phase='session-cookie';
    const session = sign({sub,email,picture,exp:now()+sessionLifetime},'session',settings);
    return redirect(settings.origin+'/',[clearFlow,setCookie('session',session,sessionLifetime,settings)]);
  } catch (error) {
    const name=error instanceof Error ? error.name : 'UnknownError';
    console.error('Google login exception', {phase,name});
    return fail('retry',phase);
  }
}

export function endGoogleLogin(request:Request, settings:Settings) {
  if (request.headers.get('origin')!==settings.origin) return new Response(null,{status:403});
  return redirect(settings.origin+'/',[setCookie('session','',0,settings),setCookie('flow','',0,settings)]);
}
