import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {POST as planPost} from '../app/api/plan/route';
import {storySample} from '../lib/reading-samples';
import {comicSample} from '../lib/additional-samples';
import {initialInput,validatePlan,type Plan} from '../lib/schema';
const upstream=(value:unknown)=>{if(value&&typeof value==='object'&&'storyCheck' in value&&'pages' in value&&!('conclusion' in value)){const v=value as {storyCheck:unknown;pages:{body:string;illustration:string}[]};value={...v,pages:v.pages.slice(0,-1),conclusion:{...v.pages.at(-1)!,body:v.pages.at(-1)!.body.split('\n\n')[0]}};}return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});};
const storyCheck={setupEvidence:'最初に母親と子どもが帰り道にいる',turnEvidence:'途中で子どもの言葉から持ち物の意味が分かる',payoffEvidence:'結末で最初の持ち物の受け止め方が変わる',causal:true,earned:true};
let dir='';
beforeEach(async()=>{dir=await mkdtemp(join(tmpdir(),'mello-ending-'));vi.stubEnv('NODE_ENV','test');vi.stubEnv('OPENAI_API_KEY','unit-test-only');vi.stubEnv('APP_PASSWORD','');vi.stubEnv('USAGE_LOG_PATH',join(dir,'usage.jsonl'));});
afterEach(async()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();await rm(dir,{recursive:true,force:true});});
const cases=[['story',storySample],['comic',comicSample]] as const;
function mockStory(plan:Plan,stripEnding=false,reject?:'causal'|'earned',echo=false){
  const pages=plan.slides.slice(1).map(s=>({body:s.body,illustration:s.illustration}));
  const publication={title:plan.title,hook:plan.slides[0].title,artDirection:plan.artDirection,coverIllustration:plan.slides[0].illustration,caption:plan.caption,pages};
  const continuity={discovery:{everydayScene:'帰り道に子どもから小さな宝物を見せてもらう',turningPointPage:2,turningPointLine:pages[0].body,noticedHappiness:'子どもが見つけた物を分けてもらえるうれしさ',endingConnection:'本文で描かれた子どもの贈り物から気づきを伝える'},transitions:Array.from({length:4},(_,i)=>({fromPage:i+2,toPage:i+3,connection:'帰り道の同じ出来事の会話と行動が続いている'})),unresolved:[]};
  return vi.fn().mockResolvedValueOnce(upstream({title:plan.title,characters:[{name:'私',role:'子どもと帰る母親',appearance:'Mother around 32'}],setting:'帰り道',story:pages.map(s=>s.body).join('\n'),arc:{setup:'母親が帰り道で子どもの持ち物を見る',development:'母親と子どもが持ち物について話す',turn:'子どもが大事にしている理由が分かる',resolution:'初めとは違う見方で同じ帰り道を受け止める'},endingMeaning:'子どもの見つけた物を分けてもらう幸せ'})).mockResolvedValueOnce(upstream({publication,continuity})).mockResolvedValueOnce(upstream({storyCheck:{...storyCheck,...(reject?{[reject]:false}:{})},pages:echo?pages.slice(0,-1):pages.map((p,i)=>stripEnding&&i===pages.length-1?{...p,body:'子どもと見つける宝物が、いつもの帰り道にある。'}:p),...(echo?{conclusion:{...pages.at(-1)!,body:'親子で同じ道を歩いていても、思っていることは違った。\n\nまた読むならフォロ'}}:{})}));
}
describe('positive story endings with an invitation on the same card',()=>{
 it.each(cases)('keeps the insight and invitation through all %s generation stages',async(mode,plan)=>{
  const mock=mockStory(plan);vi.stubGlobal('fetch',mock);
  const response=await planPost(new Request('http://localhost:3000/api/plan',{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost:3000'},body:JSON.stringify({requestId:crypto.randomUUID(),input:{...initialInput,mode,theme:plan.title,accountTopic:'親子の小さな幸せ'}})}));
  const data=await response.json();expect(response.status).toBe(200);expect(data.result.slides.at(-1).body).toBe(plan.slides.at(-1)!.body);expect(data.result.slides.slice(0,-1).every((s:{body:string})=>!s.body.includes('フォロー'))).toBe(true);expect(data.usage).toMatchObject({text:1,review:2,image:0});
  const draftSchema=JSON.parse(mock.mock.calls[0][1].body).text.format.schema;expect(draftSchema.required).toContain('arc');expect(draftSchema.properties.arc.required).toEqual(['setup','development','turn','resolution']);
  const reader=JSON.parse(mock.mock.calls[2][1].body);expect(reader.text.format.schema.required).toContain('storyCheck');expect(reader.text.format.schema.required).toContain('conclusion');expect(reader.text.format.schema.properties.pages.maxItems).toBe(plan.slides.length-2);const invitation=plan.slides.at(-1)!.body.split('\n\n').at(-1)!;expect(reader.text.format.schema.properties.conclusion.properties.body.maxLength).toBe((mode==='comic'?60:80)-invitation.length-2);expect(reader.instructions).toContain('単に明るい言葉・フォロー案内があるだけでtrueにしない');
  for(const call of mock.mock.calls){const sent=JSON.parse(call[1].body);expect(sent.instructions).toContain('【最終ページ：この物語から、読者に身近な幸せを届ける】');expect(sent.instructions).toContain('同じ最終ページに、短いフォロー案内');expect(sent.instructions).toContain('input.accountTopic');expect(sent.instructions).toContain('読後の見え方が変わる一言');expect(sent.instructions).toContain('説明的な要約に戻さない');}
 });
 it.each(cases)('retains the invitation if a %s reviewer returns only the conclusion, while legacy drafts still open',async(mode,plan)=>{
  const old=structuredClone(plan);old.slides.at(-1)!.body='子どもと見つける宝物が、いつもの帰り道にある。';expect(validatePlan(old,{...initialInput,mode})).toEqual([]);
  const mock=mockStory(plan,true);vi.stubGlobal('fetch',mock);
  const response=await planPost(new Request('http://localhost:3000/api/plan',{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost:3000'},body:JSON.stringify({requestId:crypto.randomUUID(),input:{...initialInput,mode,theme:plan.title}})}));
  const data=await response.json();expect(response.status).toBe(200);expect(data.result.slides.at(-1).body).toContain('子どもと見つける宝物が');expect(data.result.slides.at(-1).body).toContain('フォロー');expect(mock).toHaveBeenCalledTimes(3);
 });
 for(const criterion of ['causal','earned'] as const)it.each(cases)(`rejects a disconnected ${criterion} assessment in %s despite a positive ending`,async(mode,plan)=>{
  const mock=mockStory(plan,false,criterion);vi.stubGlobal('fetch',mock);
  const response=await planPost(new Request('http://localhost:3000/api/plan',{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost:3000'},body:JSON.stringify({requestId:crypto.randomUUID(),input:{...initialInput,mode,theme:plan.title}})}));
  expect(response.status).toBe(422);expect((await response.json()).error).toContain('起承転結');expect(mock).toHaveBeenCalledTimes(3);
 });

 it.each(cases)('keeps one invitation if the %s conclusion echoes a truncated footer',async(mode,plan)=>{
  const mock=mockStory(plan,false,undefined,true);vi.stubGlobal('fetch',mock);
  const response=await planPost(new Request('http://localhost:3000/api/plan',{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost:3000'},body:JSON.stringify({requestId:crypto.randomUUID(),input:{...initialInput,mode,theme:plan.title}})}));
  const data=await response.json();expect(response.status).toBe(200);expect(data.result.slides.at(-1).body.match(/フォロ/g)).toHaveLength(1);expect(data.result.slides.at(-1).body).toContain('親子で同じ道');
 });

});
