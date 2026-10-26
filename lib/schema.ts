import { z } from 'zod';

export const inputSchema = z.object({
  theme: z.string().trim().min(2, 'テーマを2文字以上で入力してください').max(120),
  details: z.string().max(1500).default(''), target: z.string().max(120).default('40〜60代の女性'),
  count: z.number().int().min(3).max(10).default(6),
  template: z.enum(['petal', 'leaf', 'ink']).default('petal'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ba7886'),
  tone: z.string().max(100).default('親しみやすく、わかりやすい'),
  quality: z.enum(['low', 'medium', 'high']).default('low'),
});
export const itemSchema = z.object({id: z.number().int().min(1).max(16), title: z.string().trim().min(1).max(26), body: z.string().trim().min(1).max(100)});
export const slideSchema = z.object({
  title: z.string().trim().min(1).max(44), body: z.string().trim().min(1).max(180),
  emphasis: z.string().trim().min(1).max(26), illustration: z.string().trim().min(1).max(600),
  layout: z.enum(['cover', 'editorial', 'split', 'summary']), itemIds: z.array(z.number().int()).max(2),
});
export const planSchema = z.object({
  title: z.string().trim().min(1).max(60),
  artDirection: z.string().trim().min(1).max(700),
  items: z.array(itemSchema).min(1).max(16),
  slides: z.array(slideSchema).min(3).max(10),
  caption: z.string().trim().min(40).max(2100),
});
export const visualReviewSchema = z.object({
  unexpectedText: z.boolean(), anatomyConcern: z.boolean(), styleConcern: z.boolean(),
  notes: z.array(z.string().max(180)).max(5),
});
export type Input = z.infer<typeof inputSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type Item = z.infer<typeof itemSchema>;
export type VisualReview = z.infer<typeof visualReviewSchema>;
export type Usage = {text: number; image: number; review: number; failed: number; inputTokens: number; outputTokens: number};
export const emptyUsage = (): Usage => ({text: 0, image: 0, review: 0, failed: 0, inputTokens: 0, outputTokens: 0});
export type SlideAsset = {image?: string; error?: string; review?: VisualReview; fontScale: number; sample?: boolean};
export const initialInput: Input = {theme: '', details: '', target: '40〜60代の女性', count: 6, template: 'petal', color: '#ba7886', tone: '親しみやすく、わかりやすい', quality: 'low'};

export function requestedCount(theme: string): number | null {
  const normalized = theme.normalize('NFKC');
  const match = normalized.match(/(\d+)\s*(?:選|つ(?:の|$)|個(?:の|$)|項目)/);
  if (match) return Number(match[1]);
  const kanji = normalized.match(/([一二三四五六七八九十])(?:選|つの|個の)/);
  return kanji ? '一二三四五六七八九十'.indexOf(kanji[1]) + 1 : null;
}
export function inputIssues(input: Input): string[] {
  const count = requestedCount(input.theme);
  return count !== null && (count < 1 || count > (input.count - 2) * 2)
    ? [`${count}項目を読みやすく載せるには枚数を増やしてください（${input.count}枚では最大${(input.count - 2) * 2}項目）。`] : [];
}
const normalized = (s: string) => s.normalize('NFKC').replace(/[\s。、！？!?,.]/g, '').toLowerCase();
export function validatePlan(plan: Plan, input: Input): string[] {
  const issues: string[] = [];
  const parsed = planSchema.safeParse(plan);
  if (!parsed.success) return parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
  if (plan.slides.length !== input.count) issues.push(`スライド枚数を${input.count}枚にしてください`);
  const expected = requestedCount(input.theme);
  if (expected !== null && expected !== plan.items.length) issues.push(`テーマは${expected}項目ですが、内容は${plan.items.length}項目です`);
  for (const title of [plan.title, plan.slides[0].title]) {
    const n = requestedCount(title);
    if (n !== null && n !== plan.items.length) issues.push(`「${title}」の項目数が内容と一致しません`);
  }
  const ids = plan.items.map(i => i.id);
  if (ids.some((id, index) => id !== index + 1)) issues.push('項目番号は1から連番にしてください');
  if (plan.slides[0].layout !== 'cover' || plan.slides.at(-1)?.layout !== 'summary') issues.push('最初は表紙、最後はまとめにしてください');
  if (plan.slides[0].itemIds.length || plan.slides.at(-1)?.itemIds.length) issues.push('表紙とまとめには項目番号を割り当てないでください');
  const middle = plan.slides.slice(1, -1);
  if (middle.some(s => !s.itemIds.length || s.itemIds.length > 2 || ['cover','summary'].includes(s.layout))) issues.push('解説スライドには1〜2項目を配置してください');
  const assigned = middle.flatMap(s => s.itemIds);
  if (assigned.length !== ids.length || ids.some(id => assigned.filter(n => n === id).length !== 1) || assigned.some(id => !ids.includes(id))) issues.push('各項目を重複や欠落なく、解説スライドに1回ずつ配置してください');
  for (const field of ['title', 'body'] as const) {
    const values = plan.items.map(i => normalized(i[field]));
    if (new Set(values).size !== values.length) issues.push(`項目の${field === 'title' ? 'タイトル' : '本文'}が重複しています`);
  }
  const headings = plan.slides.map(s => normalized(s.title));
  if (new Set(headings).size !== headings.length) issues.push('スライドのタイトルが重複しています');
  const allText = [plan.title, plan.caption, ...plan.items.flatMap(i => [i.title,i.body]), ...plan.slides.flatMap(s => [s.title,s.body,s.emphasis])].join('\n');
  if (/(?:必ず|確実に|絶対に)(?:.{0,8})(?:治|痩|若返|効|改善)|副作用(?:が)?(?:ない|なし)|100[%％](?:.{0,5})(?:効果|改善)|シミが消える/.test(allText)) issues.push('根拠のない効果の断定表現を見直してください');
  if (!/#\S+/.test(plan.caption)) issues.push('キャプションに関連するハッシュタグを追加してください');
  return [...new Set(issues)];
}
