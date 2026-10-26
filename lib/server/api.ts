import { mkdir, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { timingSafeEqual, createHash } from 'node:crypto';
import { z } from 'zod';
import { emptyUsage, type Usage } from '../schema';

export class AppError extends Error {constructor(message:string, public status=400){super(message);}}
export const models = () => ({text:process.env.OPENAI_TEXT_MODEL || 'gpt-5-mini',image:process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare'});
const state=globalThis as typeof globalThis & {melloLimits?:Map<string,{start:number;calls:number}>,melloJobs?:Map<string,Promise<unknown>>,melloActive?:number};
state.melloLimits ??= new Map();state.melloJobs ??=new Map();state.melloActive ??=0;

export function authorize(request: Request) {
  const origin=request.headers.get('origin');
  // Next may normalize request.url to localhost while the browser uses 127.0.0.1.
  // Match against the HTTP Host actually requested, never arbitrary forwarded headers.
  const host=request.headers.get('host') || new URL(request.url).host;
  if(origin) {
    let parsed:URL;try{parsed=new URL(origin);}catch{throw new AppError('このページから操作し直してください',403);}
    if(!['http:','https:'].includes(parsed.protocol)||parsed.host!==host)throw new AppError('このページから操作し直してください',403);
  }
  if(process.env.NODE_ENV==='development'&&!['localhost','127.0.0.1','[::1]'].includes(host.replace(/:\d+$/,'')))throw new AppError('開発サーバーはローカルホストから利用してください',403);
  const password=process.env.APP_PASSWORD;
  if(process.env.NODE_ENV==='production'&&!password)throw new AppError('本番環境ではサーバーのAPP_PASSWORDを設定してください',503);
  if(password) {
    const sent=request.headers.get('x-app-password') || '';
    const a=Buffer.from(password),b=Buffer.from(sent);
    if(a.length!==b.length || !timingSafeEqual(a,b))throw new AppError('利用パスワードを確認してください',401);
  }
  if(!process.env.OPENAI_API_KEY?.trim())throw new AppError('OpenAI APIキーが未設定です。サーバーの.env.localに設定して再起動してください。操作サンプルはAPIなしで試せます。',503);
}
export async function readBody(request:Request) {
  if(!request.headers.get('content-type')?.includes('application/json'))throw new AppError('JSON形式で送信してください',415);
  const reader=request.body?.getReader();if(!reader)throw new AppError('入力がありません');
  let length=0;const chunks:Uint8Array[]=[];
  while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>8*1024*1024){await reader.cancel();throw new AppError('画像を含むリクエストは8MB以下にしてください',413);}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new AppError('入力データを読み取れませんでした');}
}
export const referenceSchema=z.string().max(7_000_000).regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/).optional();
export async function withJob<T>(request: Request, id:string, data:unknown, task:(usage:Usage)=>Promise<T>) {
  const fingerprint=createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const cacheKey=`${new URL(request.url).pathname}:${id}:${fingerprint}`;
  const cached=state.melloJobs!.get(cacheKey);if(cached)return cached;
  // One local studio instance: global hourly call limit is deliberately conservative.
  const now=Date.now();let limit=state.melloLimits!.get('studio');
  if(!limit || now-limit.start>3600000){limit={start:now,calls:0};state.melloLimits!.set('studio',limit);}
  if(limit.calls>=60)throw new AppError('1時間の操作上限に達しました。時間をおいて再試行してください。',429);
  if(state.melloActive!>=2)throw new AppError('別の生成を処理しています。完了後に再試行してください。',429);
  limit.calls++;state.melloActive!++;
  const usage=emptyUsage();
  const promise=(async()=>{
    try {const result=await task(usage);return {result,usage};}
    catch(error){throw Object.assign(error instanceof Error?error:new Error('生成に失敗しました'),{usage});}
    finally{state.melloActive!--;}
  })();
  state.melloJobs!.set(cacheKey,promise);
  // Retain only in-flight jobs and the last two results; generated images may be large.
  promise.then(()=>{const timer=setTimeout(()=>state.melloJobs!.delete(cacheKey),120000);timer.unref();},()=>state.melloJobs!.delete(cacheKey));
  if(state.melloJobs!.size>4){const oldest=state.melloJobs!.keys().next().value;if(oldest)state.melloJobs!.delete(oldest);}
  return promise;
}
export function errorResponse(error:unknown) {
  const usage=(error as {usage?:Usage})?.usage;
  if(error instanceof z.ZodError)return Response.json({error:'入力内容・文字数を確認してください',details:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`),usage},{status:400});
  if(error instanceof AppError)return Response.json({error:error.message,usage},{status:error.status});
  return Response.json({error:'処理に失敗しました。内容は保持されています。時間をおいて再試行してください。',usage},{status:500});
}
async function record(kind:keyof Pick<Usage,'text'|'image'|'review'>,ok:boolean,usage?:{input_tokens?:number;output_tokens?:number}) {
  const path=process.env.USAGE_LOG_PATH || '.data/usage.jsonl';
  try{await mkdir(dirname(path),{recursive:true});await appendFile(path,JSON.stringify({at:new Date().toISOString(),kind,ok,inputTokens:usage?.input_tokens||0,outputTokens:usage?.output_tokens||0})+'\n',{mode:0o600});}
  catch{console.warn('Usage metadata could not be persisted.');}
}
export async function openai(path:string,body:object|FormData,kind:'text'|'image'|'review',usage:Usage,timeout=120000):Promise<Record<string,unknown>> {
  usage[kind]++;
  let ok=false;let tokens:{input_tokens?:number;output_tokens?:number}|undefined;
  try {
    const response=await fetch(`https://api.openai.com/v1/${path}`,{
      method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},
      body:body instanceof FormData?body:JSON.stringify(body),signal:AbortSignal.timeout(timeout),cache:'no-store',
    });
    if(!response.ok) {
      await response.body?.cancel();
      const messages:Record<number,string>={400:'モデルまたは生成条件が利用できません。サーバーのモデル設定と入力を確認してください。',401:'APIキーを確認してください。',403:'このモデルを利用する権限がありません。OpenAIの組織認証・モデル権限を確認してください。',429:'APIの利用上限または混雑のため失敗しました。料金設定を確認し、時間をおいて再試行してください。'};
      throw new AppError(messages[response.status] || 'OpenAI側でエラーが発生しました。この操作だけ再試行できます。',response.status===429?429:502);
    }
    const data=await response.json();tokens=data.usage;usage.inputTokens+=tokens?.input_tokens||0;usage.outputTokens+=tokens?.output_tokens||0;ok=true;return data;
  }catch(error){usage.failed++;if(error instanceof AppError)throw error;throw new AppError('API接続がタイムアウト、または中断されました。課金されている可能性があるため、自動では再試行しません。',504);}
  finally{await record(kind,ok,tokens);}
}
export async function structured<T extends z.ZodType>(schema:T,instructions:string,input:unknown,usage:Usage,kind:'text'|'review'='text'):Promise<z.infer<T>> {
  const jsonSchema=z.toJSONSchema(schema);delete jsonSchema.$schema;
  const result=await openai('responses',{model:models().text,instructions,input,text:{format:{type:'json_schema',name:'studio_result',strict:true,schema:jsonSchema}},store:false,max_output_tokens:6500,reasoning:{effort:'low'}},kind,usage);
  if(result.status==='incomplete')throw new AppError('文章が長くなり、生成を完了できませんでした。補足を短くして再試行してください。',502);
  const output=result.output as {type:string;content?:{type:string;text?:string}[]}[] | undefined;
  const content=output?.filter(o=>o.type==='message').flatMap(o=>o.content || []) || [];
  if(content.some(c=>c.type==='refusal'))throw new AppError('この内容では生成できません。テーマや説明を見直してください。',422);
  const text=content.filter(c=>c.type==='output_text').map(c=>c.text).join('');
  try{return schema.parse(JSON.parse(text));}catch{throw new AppError('AIの回答が指定形式を満たしませんでした。文章生成を再試行してください。',502);}
}
