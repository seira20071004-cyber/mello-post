import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import type {DatabaseSync} from 'node:sqlite';

type Invite = {
  id:string; created_at:number; expires_at:number; redeemed_by:string|null;
  email:string|null; revoked_at:number|null;
};
type Parameter = string|number;
type Query = <T>(sql:string, ...params:Parameter[])=>Promise<T[]>;
const schema = `CREATE TABLE IF NOT EXISTS mello_invites (
  id TEXT PRIMARY KEY, code_hash TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL, redeemed_by TEXT UNIQUE, email TEXT, revoked_at INTEGER
)`;
let local:Promise<DatabaseSync>|undefined;

function localDatabase() {
  return local ??= import('node:sqlite').then(({DatabaseSync})=>{
    const path=process.env.APP_INVITE_DB_PATH || '.data/invites.sqlite';
    if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
    const db=new DatabaseSync(path);
    db.exec('PRAGMA busy_timeout=5000');
    db.exec(schema);
    return db;
  }).catch(error=>{local=undefined;throw error;});
}

interface InvitationDatabase {
  prepare(sql:string): {
    bind(...values:Parameter[]): {
      all<T>():Promise<{results:T[];success:boolean}>;
    };
  };
}
let hostedDatabase:InvitationDatabase|undefined;
export function configureInviteDatabase(database:InvitationDatabase) {
  hostedDatabase=database;
}

const query:Query = async <T>(sql:string,...params:Parameter[])=>{
  if(hostedDatabase) {
    const result=await hostedDatabase.prepare(sql).bind(...params).all<T>();
    if(!result.success)throw new Error('Invitation database query failed');
    return result.results;
  }
  const {APP_D1_ACCOUNT_ID:account,APP_D1_DATABASE_ID:database,APP_D1_TOKEN:token}=process.env;
  if(account&&database&&token){
    const url=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/d1/database/${encodeURIComponent(database)}/query`;
    const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({sql,params:params.map(String)}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('Invitation database unavailable');
    const data=await response.json() as {success:boolean;result?:{success:boolean;results:T[]}[]};
    if(!data.success||!data.result?.[0]?.success)throw new Error('Invitation database query failed');
    return data.result[0].results;
  }
  if(process.env.NODE_ENV==='production'&&!process.env.APP_INVITE_DB_PATH)throw new Error('A persistent invitation database is required');
  return (await localDatabase()).prepare(sql).all(...params) as T[];
};
const hash = (code:string)=>createHash('sha256').update(code).digest('hex');
const columns = 'id, created_at, expires_at, redeemed_by, email, revoked_at';

export async function inviteAccess(sub:string) {
  const [row]=await query<Pick<Invite,'revoked_at'>>('SELECT revoked_at FROM mello_invites WHERE redeemed_by=?',sub);
  return !row?'invite':row.revoked_at===null?'active':'revoked';
}

export async function issueInvite() {
  const code=randomBytes(16).toString('hex').match(/.{8}/g)!.join('-');
  const now=Date.now(),expiresAt=now+7*24*60*60*1000;
  await query('INSERT INTO mello_invites (id,code_hash,created_at,expires_at) VALUES (?,?,?,?)',randomUUID(),hash(code),now,expiresAt);
  return {code,expiresAt};
}

export async function redeemInvite(code:string,sub:string,email:string) {
  const [row]=await query<{id:string}>(`UPDATE mello_invites SET redeemed_by=?,email=?
    WHERE code_hash=? AND redeemed_by IS NULL AND revoked_at IS NULL AND expires_at>?
      AND NOT EXISTS (SELECT 1 FROM mello_invites WHERE redeemed_by=?)
    RETURNING id`,sub,email,hash(code.trim().toLowerCase()),Date.now(),sub);
  return !!row;
}

export function listInvites() {
  return query<Invite>(`SELECT ${columns} FROM mello_invites ORDER BY created_at DESC`);
}

export async function revokeInvite(id:string) {
  const [row]=await query<{id:string}>('UPDATE mello_invites SET revoked_at=? WHERE id=? AND revoked_at IS NULL RETURNING id',Date.now(),id);
  return !!row;
}
