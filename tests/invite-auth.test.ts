import {afterEach,expect,it,vi} from 'vitest';
import {GET as config} from '../app/api/config/route';
import {GET as adminList,POST as adminWrite} from '../app/api/auth/admin/route';
import {POST as redeem} from '../app/api/auth/invite/route';
import {authorize} from '../lib/server/api';
import {finishGoogleLogin,googleSettings,startGoogleLogin} from '../lib/server/google-auth';

const origin='https://mello.test';
const admin='owner@gmail.com';
const picture='https://lh3.googleusercontent.com/example-avatar';

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});

async function login(email:string,sub:string) {
  const settings=googleSettings()!;
  const start=startGoogleLogin(settings);
  const googleUrl=new URL(start.headers.get('location')!);
  expect(googleUrl.searchParams.get('scope')?.split(' ')).toContain('profile');
  const state=googleUrl.searchParams.get('state');
  const callback=new Request(origin+'/api/auth/google/callback?code=test&state='+state,{
    headers:{Cookie:start.headers.get('set-cookie')!.split(';')[0]},
  });
  const google=vi.fn().mockResolvedValueOnce(Response.json({access_token:'mock-token'}))
    .mockResolvedValueOnce(Response.json({sub,email,email_verified:true,picture:sub==='other'?'https://example.test/avatar':picture}));
  vi.stubGlobal('fetch',google);
  const result=await finishGoogleLogin(callback,settings);
  expect(google).toHaveBeenCalledTimes(2);
  const session=result.headers.getSetCookie().find(value=>value.startsWith('__Host-mello-session='));
  expect(session).toContain('HttpOnly');
  expect(session).toContain('Secure');
  expect(session).toContain('Max-Age=2592000');
  return session!.split(';')[0];
}

it('allows only the owner to issue codes and enforces redemption and revocation on every session',async()=>{
  const settings={APP_AUTH_MODE:'google',APP_AUTH_ORIGIN:origin,APP_ADMIN_EMAIL:admin,
    APP_SESSION_SECRET:'test-secret-only-for-this-test-32bytes',GOOGLE_CLIENT_ID:'mock',GOOGLE_CLIENT_SECRET:'mock',
    APP_INVITE_DB_PATH:':memory:',APP_D1_ACCOUNT_ID:'',APP_D1_DATABASE_ID:'',APP_D1_TOKEN:''};
  for(const [key,value] of Object.entries(settings))vi.stubEnv(key,value);
  const owner=await login(admin,'owner'),member=await login('member@gmail.com','member'),other=await login('other@gmail.com','other');
  const req=(path:string,cookie:string,body?:object)=>new Request(origin+path,{
    method:body?'POST':'GET',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},
    body:body?JSON.stringify(body):undefined,
  });
  expect((await (await config(req('/api/config',member))).json()).account).toMatchObject({picture});
  expect((await (await config(req('/api/config',other))).json()).account).not.toHaveProperty('picture');
  await expect(authorize(req('/api/plan',member),false)).rejects.toMatchObject({status:403});
  expect((await adminWrite(req('/api/auth/admin',member,{action:'issue'}))).status).toBe(403);
  const issued=await adminWrite(req('/api/auth/admin',owner,{action:'issue'}));
  expect(issued.status).toBe(201);
  const {code}=await issued.json();
  const results=await Promise.all([member,other].map(cookie=>redeem(req('/api/auth/invite',cookie,{code}))));
  expect(results.map(r=>r.status).sort()).toEqual([200,400]);
  const winner=results[0].ok?member:other;
  const signedInAgain=await (results[0].ok?login('member@gmail.com','member'):login('other@gmail.com','other'));
  await expect(authorize(req('/api/plan',signedInAgain),false)).resolves.toBeUndefined();
  const {invites}=await (await adminList(req('/api/auth/admin',owner))).json();
  expect(invites[0]).not.toHaveProperty('code_hash');
  expect((await adminWrite(req('/api/auth/admin',owner,{action:'revoke',id:invites[0].id}))).ok).toBe(true);
  await expect(authorize(req('/api/plan',winner),false)).rejects.toMatchObject({status:403});
});
