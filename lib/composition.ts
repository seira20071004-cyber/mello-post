import {z} from 'zod';
import {inputIssues,itemSchema,planSchema,requestedCount,slideSchema,type Input,type Plan} from './schema';

export function compositionFor(input:Input,itemCount=requestedCount(input.theme)??input.count-2){
  if(inputIssues(input).length||itemCount<1||itemCount>(input.count-2)*2)throw new Error('指定の枚数に項目を配置できません');
  let next=1,extra=Math.max(0,itemCount-(input.count-2));
  const middle=Array.from({length:input.count-2},(_,index)=>{const count=next>itemCount?0:extra-->0?2:1;return {slide:index+2,role:count?'content':'example',itemIds:Array.from({length:count},()=>next++)};});
  return {slideCount:input.count,itemCount,slides:[{slide:1,role:'cover',itemIds:[]},...middle,{slide:input.count,role:'summary',itemIds:[]}]};
}
export function generationSchema(input:Input,itemCount?:number){
  const composition=compositionFor(input,itemCount);
  return planSchema.extend({items:z.array(itemSchema).length(composition.itemCount),slides:z.array(slideSchema).length(composition.slideCount)});
}

export function finishReadingPath(plan:Plan):Plan{
  const penultimate=plan.slides.length-2;
  return {...plan,slides:plan.slides.map((slide,index)=>index===penultimate?{...slide,nextTeaser:'最後に、今日からできることをまとめます →'}:index===plan.slides.length-1?{...slide,nextTeaser:''}:slide)};
}
