import { z } from 'zod';
import type {Appearance} from './appearance';

export const inputSchema = z.object({
  theme: z.string().trim().min(2, 'テーマを2文字以上で入力してください').max(120),
  details: z.string().max(1500).default(''), target: z.string().max(120).default('40〜60代の女性'),
  count: z.number().int().min(3).max(10).default(6),
  template: z.enum(['petal', 'leaf', 'ink']).default('petal'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ba7886'),
  tone: z.string().max(100).default('親しみやすく、わかりやすい'),
  quality: z.enum(['low', 'medium', 'high']).default('low'),
  aspectRatio:z.enum(['4:5','1:1','9:16']).default('4:5'),
  accountTopic:z.string().trim().max(100).default(''),
  mode:z.enum(['story','essay','info','comic','comparison','quote']).default('info'),
  characterAge:z.enum(['30s','40s','50s','60s']).default('30s'),
  nowYear:z.number().int().min(1900).max(2200).default(2026),
  futureYear:z.number().int().min(1901).max(2250).default(2046),
});
export const itemSchema = z.object({id: z.number().int().min(1).max(16), title: z.string().trim().min(1).max(26), body: z.string().trim().min(1).max(100)});
export const slideSchema = z.object({
  title: z.string().trim().max(44), body: z.string().trim().max(500),
  emphasis: z.string().trim().max(26), illustration: z.string().trim().min(1).max(600),
  layout: z.enum(['cover', 'editorial', 'split', 'summary']), itemIds: z.array(z.number().int()).max(2),
  nextTeaser:z.string().trim().max(48).default(''),
});
export const planSchema = z.object({
  title: z.string().trim().min(1).max(60),
  artDirection: z.string().trim().min(1).max(700),
  items: z.array(itemSchema).max(16),
  slides: z.array(slideSchema).min(3).max(10),
  caption: z.string().trim().min(40).max(2100),
  followCTA:z.string().trim().max(90).default(''),
});
export const comparisonPairSchema=z.object({
  place:z.string().trim().min(1).max(80),
  camera:z.string().trim().min(1).max(200),
  nowIllustration:z.string().trim().min(1).max(600),
  futureIllustration:z.string().trim().min(1).max(600),
  nowCaption:z.string().trim().max(40),futureCaption:z.string().trim().max(40),
});
export const storedPlanSchema=planSchema.extend({comparisons:z.array(comparisonPairSchema).min(3).max(10).optional()});
export type ComparisonPair=z.infer<typeof comparisonPairSchema>;
export const visualReviewSchema = z.object({
  unexpectedText: z.boolean(), anatomyConcern: z.boolean(), styleConcern: z.boolean(),
  notes: z.array(z.string().max(180)).max(5),
});
export type Input = z.infer<typeof inputSchema>;
export type Plan = z.infer<typeof storedPlanSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type Item = z.infer<typeof itemSchema>;
export type VisualReview = z.infer<typeof visualReviewSchema>;
export type Usage = {text: number; image: number; review: number; failed: number; inputTokens: number; outputTokens: number};
export const emptyUsage = (): Usage => ({text: 0, image: 0, review: 0, failed: 0, inputTokens: 0, outputTokens: 0});
export const textBoxSchema=z.object({x:z.number().min(.04).max(.86),y:z.number().min(.04).max(.86),width:z.number().min(.25).max(.92),height:z.number().min(.18).max(.88)});
export type TextBox=z.infer<typeof textBoxSchema>;
export type SlideAsset = Appearance & {image?: string; error?: string; review?: VisualReview; fontScale: number; sample?: boolean; textBox?:TextBox; textAlign?:'left'|'center'; futureImage?:string;futureError?:string;futureReview?:VisualReview};
export const initialInput: Input = {theme: '', details: '', target: '40〜60代の女性', count: 6, template: 'petal', color: '#ba7886', tone: '親しみやすく、わかりやすい', quality: 'low',aspectRatio:'4:5',accountTopic:'',mode:'story',characterAge:'30s',nowYear:2026,futureYear:2046};

export function requestedCount(theme: string): number | null {
  const normalized = theme.normalize('NFKC');
  const match = normalized.match(/(\d+)\s*(?:選|つ(?:の|$)|個(?:の|$)|項目)/);
  if (match) return Number(match[1]);
  const kanji = normalized.match(/([一二三四五六七八九十])(?:選|つの|個の)/);
  return kanji ? '一二三四五六七八九十'.indexOf(kanji[1]) + 1 : null;
}
export function inputIssues(input: Input): string[] {
  if(input.mode==='comparison'&&input.futureYear<=input.nowYear)return ['未来の年は、現在の年より後にしてください'];
  if(input.mode!=='info')return [];
  const count = requestedCount(input.theme);
  return count !== null && (count < 1 || count > (input.count - 2) * 2)
    ? [`${count}項目を読みやすく載せるには枚数を増やしてください（${input.count}枚では最大${(input.count - 2) * 2}項目）。`] : [];
}
const normalized = (s: string) => s.normalize('NFKC').replace(/[\s。、！？!?,.]/g, '').toLowerCase();
export function validatePlan(plan: Plan, input: Input): string[] {
  const issues: string[] = [];
  const parsed = storedPlanSchema.safeParse(plan);
  if (!parsed.success) return parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
  if (plan.slides.length !== input.count) issues.push(`スライド枚数を${input.count}枚にしてください`);
  if(input.mode==='comparison'){const parameters=inputSchema.safeParse(input);if(!parameters.success)issues.push('比較する年は有効な数値で入力してください');issues.push(...inputIssues(input));}
  const narrative=input.mode!=='info';
  if(!narrative&&!plan.items.length)issues.push('情報投稿には具体的な紹介項目を入れてください');
  const expected = narrative?null:requestedCount(input.theme);
  if (expected !== null && expected !== plan.items.length) issues.push(`テーマは${expected}項目ですが、内容は${plan.items.length}項目です`);
  for (const title of narrative?[]:[plan.title, plan.slides[0].title]) {
    const n = requestedCount(title);
    if (n !== null && n !== plan.items.length) issues.push(`「${title}」の項目数が内容と一致しません`);
  }
  const ids = plan.items.map(i => i.id);
  if (ids.some((id, index) => id !== index + 1)) issues.push('項目番号は1から連番にしてください');
  if (plan.slides[0].layout !== 'cover' || plan.slides.at(-1)?.layout !== 'summary') issues.push('最初は表紙、最後はまとめにしてください');
  if (plan.slides[0].itemIds.length || plan.slides.at(-1)?.itemIds.length) issues.push('表紙とまとめには項目番号を割り当てないでください');
  const middle = plan.slides.slice(1, -1);
  if (middle.some(s => s.itemIds.length > 2 || ['cover','summary'].includes(s.layout))) issues.push('解説スライドは最大2項目、補足・具体例は項目を増やさずに配置してください');
  const assigned = middle.flatMap(s => s.itemIds);
  if (assigned.length !== ids.length || ids.some(id => assigned.filter(n => n === id).length !== 1) || assigned.some(id => !ids.includes(id))) issues.push('各項目を重複や欠落なく、解説スライドに1回ずつ配置してください');
  for (const field of ['title', 'body'] as const) {
    const values = plan.items.map(i => normalized(i[field]));
    if (new Set(values).size !== values.length) issues.push(`項目の${field === 'title' ? 'タイトル' : '本文'}が重複しています`);
  }
  if(input.mode==='comparison'&&(!plan.comparisons||plan.comparisons.length!==input.count))issues.push('各スライドに現在と未来の比較を一組ずつ用意してください');
  if(narrative&&plan.items.length)issues.push('物語・エッセイは箇条書きの項目を追加せず、本文だけで構成してください');
  for(const slide of plan.slides){if(input.mode!=='comparison'&&!slide.title&&!slide.body)issues.push('文章が空のページがあります');if(!narrative&&(!slide.title||!slide.body||!slide.emphasis||slide.body.length>180))issues.push('情報投稿のタイトル・本文・強調を確認してください');}
  const headings = plan.slides.map(s => normalized(s.title)).filter(Boolean);
  if (new Set(headings).size !== headings.length) issues.push('スライドのタイトルが重複しています');
  const allText = [plan.title, plan.caption, ...plan.items.flatMap(i => [i.title,i.body]), ...plan.slides.flatMap(s => [s.title,s.body,s.emphasis])].join('\n');
  if (/(?:必ず|確実に|絶対に)(?:.{0,8})(?:治|痩|若返|効|改善)|副作用(?:が)?(?:ない|なし)|100[%％](?:.{0,5})(?:効果|改善)|シミが消える/.test(allText)) issues.push('根拠のない効果の断定表現を見直してください');
  if (!/#\S+/.test(plan.caption)) issues.push('キャプションに関連するハッシュタグを追加してください');
  return [...new Set(issues)];
}

// New AI generations must provide a real reading path. Existing saved posts can
// still be edited/exported with validatePlan without retroactively requiring it.
export function validateEngagement(plan:Plan,input:Input):string[]{
  const issues:string[]=[];
  if(input.mode==='comparison'){
    if(plan.followCTA||plan.slides.some(s=>s.body||s.emphasis||s.nextTeaser))issues.push('比較画像では本文や予告帯を重ねず、年表示と必要な短い説明だけにしてください');
    return [...validatePlan(plan,input),...inputIssues(input),...issues];
  }
  if(input.mode!=='info'){
    const bodies=plan.slides.slice(1).map(s=>normalized(s.body));
    if((input.mode==='quote'||input.mode==='comic')&&new Set(bodies).size!==bodies.length)issues.push('同じ文章を繰り返さず、ページごとに一つの気づきや場面を伝えてください');
    for(const [i,slide] of plan.slides.entries()){
      const limit=readingBodyLimit(input);
      if(input.mode==='essay'&&slide.body.length>90&&!slide.body.includes('\n'))issues.push(`${i+1}枚目のエッセイは段落で改行し、読みやすくしてください`);
      if(slide.body.length>limit)issues.push(`${i+1}枚目の本文は${limit}文字以内にしてください`);
      if(i===0&&(!slide.title||slide.body))issues.push('物語・エッセイの表紙は短いタイトルだけにしてください');
      if(i===0&&slide.title.length>28)issues.push('物語・エッセイの表紙は28文字以内の短いフックにしてください');
      if(i>0&&slide.title)issues.push('物語・エッセイの中面は見出しを付けず、本文だけにしてください');
      if(slide.emphasis||slide.nextTeaser)issues.push('物語・エッセイでは強調帯・次ページ予告を付けず、文章の流れでつないでください');
    }
    if(plan.followCTA)issues.push('物語・エッセイのフォロー案内はキャプションにだけ入れてください');
    return [...new Set(issues)];
  }
  const emptyPromise=/(?:説明|紹介|解説|お伝え)(?:していき|いたし|し)ます|見ていきましょう/;
  for(const [i,slide] of plan.slides.entries())if(i>0&&i<plan.slides.length-1){
    const content=[slide.body,slide.emphasis,slide.nextTeaser,...plan.items.filter(item=>slide.itemIds.includes(item.id)).map(item=>item.body)];
    if(content.some(text=>emptyPromise.test(text)))issues.push(`${i+1}枚目は「説明します・紹介します」で終わらず、実際のやり方・理由・例をその場で伝えてください`);
  }
  const cues=plan.slides.slice(0,-1).map(s=>s.nextTeaser?.trim()||'');
  if(cues.some(c=>c.length<5||/^(?:次(?:のページ|のスライド)?へ|続きはこちら|続きは次へ|スワイプしてね)[\s→！!。]*$/.test(c)))issues.push('表紙から最後の解説まで、次の内容につながる具体的な予告を付けてください');
  if(new Set(cues).size!==cues.length)issues.push('次のスライドの予告を使い回さず、各ページの内容に合わせてください');
  if(plan.slides.at(-1)?.nextTeaser)issues.push('最後のスライドに存在しない次ページを予告しないでください');
  if(!plan.followCTA?.trim()||plan.followCTA.trim().length<20||!/フォロー/.test(plan.followCTA))issues.push('まとめに、次も読むメリットを添えた自然なフォロー案内を入れてください');
  const ids=plan.slides.slice(1,-1).flatMap(s=>s.itemIds);
  if(ids.some((id,i)=>id!==i+1))issues.push('紹介項目を1から順に配置し、読者が流れを追える構成にしてください');
  for(const [index,slide] of plan.slides.entries()){
    if(index===0&&slide.body.length>72)issues.push('表紙の補足は72文字以内にしてください');
    if(index>0&&index<plan.slides.length-1&&slide.body.length>60)issues.push('解説の補足は60文字以内にしてください');
    if(index===plan.slides.length-1&&slide.body.length>100)issues.push('まとめの本文は100文字以内にしてください');
    if(input.aspectRatio==='1:1'&&slide.itemIds.length===2&&slide.body.length>28)issues.push('正方形で2項目を載せる場合、補足は28文字以内にしてください');
    if(input.aspectRatio==='1:1'&&slide.itemIds.length===2&&plan.items.some(item=>slide.itemIds.includes(item.id)&&item.body.length>72))issues.push('正方形で2項目を載せる場合、各項目の本文は72文字以内にしてください');
  }
  return [...new Set(issues)];
}

export function readingBodyLimit(input:Pick<Input,'mode'|'aspectRatio'>){return input.mode==='comic'?60:input.mode==='quote'?64:input.mode==='story'?80:input.aspectRatio==='1:1'?220:320;}
