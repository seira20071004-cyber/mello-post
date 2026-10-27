import {describe,it,expect} from 'vitest';
import {initialInput,inputSchema,validatePlan,type Input} from '../lib/schema';
import {inputForMode,recommendedSlideCount,pendingImageCalls} from '../lib/modes';
import {compositionFor} from '../lib/composition';
import {essayEndingIssues} from '../lib/server/essays';
import {editorPrompt,modeReviewPrompt} from '../lib/server/prompts';
import {essaySample,storySample} from '../lib/reading-samples';
import {tutorialSteps} from '../lib/tutorial';
describe('essay summary and seven-slide recommendation',()=>{
 it('starts an essay at seven through the shared mode transition without changing the source input',()=>{
  const next=inputForMode(initialInput,'essay');expect(next.count).toBe(7);expect(initialInput.count).toBe(6);expect(recommendedSlideCount('essay')).toBe(7);
  const custom={...next,count:9};expect(inputForMode(custom,'essay')).toBe(custom);expect(inputForMode(next,'story').count).toBe(6);expect(inputForMode(custom,'story').count).toBe(9);
 });
 it('keeps the other mode recommendations and quote minimum',()=>{for(const mode of ['story','comic','info','comparison','quote'] as const)expect(recommendedSlideCount(mode)).toBe(6);expect(inputForMode({...initialInput,count:3},'quote').count).toBe(4);});
 it('allocates a summary within the chosen count instead of adding an eighth page',()=>{
  for(const count of [3,6,7,10]){const input={...initialInput,mode:'essay' as const,count},c=compositionFor(input);expect(c.slides).toHaveLength(count);expect(c.slides.at(-1)?.role).toBe('summary');}
  expect(essaySample.slides).toHaveLength(7);expect(essayEndingIssues(essaySample,{mode:'essay'})).toEqual([]);
 });
 it('requires both the summary text and invitation only on explicit essay generation checks',()=>{
  const old=structuredClone(essaySample);old.slides=old.slides.slice(0,6);old.slides.at(-1)!.layout='summary';old.slides.at(-1)!.body='言葉にできなくても、自分の気持ちは否定しなくていい。';
  const input=inputSchema.parse({...initialInput,mode:'essay',theme:old.title,count:6});expect(input.count).toBe(6);expect(validatePlan(old,input)).toEqual([]);expect(essayEndingIssues(old,input).join()).toContain('フォロー');
  const onlyInvitation=structuredClone(essaySample);onlyInvitation.slides.at(-1)!.body='また読みたい方はフォローを。';expect(essayEndingIssues(onlyInvitation,input).join()).toContain('まとめ');expect(essayEndingIssues(storySample,{mode:'story'})).toEqual([]);
 });
 it('carries the same closing rule through writing, review and the tutorial',()=>{
  const input:Input={...initialInput,mode:'essay',count:7};for(const prompt of [editorPrompt(input),modeReviewPrompt(input)]){expect(prompt).toContain('結局何を伝えたかったか');expect(prompt).toContain('最後の同じbody');expect(prompt).not.toContain('画像内フォロー案内は追加しない');}
  expect(tutorialSteps('essay').find(s=>s.id==='count')!.body).toContain('７枚');expect(tutorialSteps('story').find(s=>s.id==='count')!.body).toContain('６枚');
 });
 it('continues to share one generated background for all seven slides',()=>{expect(pendingImageCalls({mode:'essay'},Array.from({length:7},()=>({})))).toBe(1);expect(pendingImageCalls({mode:'essay'},[{image:'saved'},...Array.from({length:6},()=>({}))])).toBe(0);});
});
