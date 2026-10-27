import {z} from 'zod';
import {inputIssues,itemSchema,planSchema,requestedCount,slideSchema,type Input,type Plan,comparisonPairSchema,readingBodyLimit} from './schema';

export function compositionFor(input:Input,itemCount=requestedCount(input.theme)??input.count-2){
  if(input.mode!=='info')return {slideCount:input.count,itemCount:0,slides:Array.from({length:input.count},(_,i)=>({slide:i+1,role:i===0?'cover':i===input.count-1?'ending':input.mode==='story'?'scene':'reflection',itemIds:[] as number[]}))};
  if(inputIssues(input).length||itemCount<1||itemCount>(input.count-2)*2)throw new Error('指定の枚数に項目を配置できません');
  let next=1,extra=Math.max(0,itemCount-(input.count-2));
  const middle=Array.from({length:input.count-2},(_,index)=>{const count=next>itemCount?0:extra-->0?2:1;return {slide:index+2,role:count?'content':'example',itemIds:Array.from({length:count},()=>next++)};});
  return {slideCount:input.count,itemCount,slides:[{slide:1,role:'cover',itemIds:[]},...middle,{slide:input.count,role:'summary',itemIds:[]}]};
}
export function generationSchema(input:Input,itemCount?:number){
  const composition=compositionFor(input,itemCount);
  if(input.mode==='comparison')return planSchema.extend({items:z.array(itemSchema).length(0),slides:z.array(slideSchema.extend({body:z.literal(''),emphasis:z.literal(''),nextTeaser:z.literal(''),itemIds:z.array(z.number().int()).length(0)})).length(input.count),followCTA:z.literal(''),comparisons:z.array(comparisonPairSchema).length(input.count)});
  const outputSlide=input.mode==='info'?slideSchema.extend({title:z.string().trim().min(1).max(44),body:z.string().trim().min(1).max(180),emphasis:z.string().trim().min(1).max(26)}):slideSchema.extend({body:z.string().trim().max(readingBodyLimit(input)),emphasis:z.literal(''),nextTeaser:z.literal(''),itemIds:z.array(z.number().int()).length(0)});
  return planSchema.extend({items:z.array(itemSchema).length(composition.itemCount),slides:z.array(outputSlide).length(composition.slideCount),followCTA:input.mode==='info'?planSchema.shape.followCTA:z.literal('')});
}

export function finishReadingPath(plan:Plan,input?:Input):Plan{
  if(input&&input.mode!=='info')return plan;
  const penultimate=plan.slides.length-2;
  return {...plan,slides:plan.slides.map((slide,index)=>index===penultimate?{...slide,nextTeaser:'最後に、今日からできることをまとめます →'}:index===plan.slides.length-1?{...slide,nextTeaser:''}:slide)};
}
