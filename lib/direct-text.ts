import {readingBodyLimit,type Plan,type Input} from './schema';
export type TextTarget={kind:'year';key:'nowYear'|'futureYear'}|{kind:'slide';key:'title'|'body'|'emphasis'|'nextTeaser'}|{kind:'item';id:number;key:'title'|'body'}|{kind:'plan';key:'title'|'followCTA'}|{kind:'comparison';key:'nowCaption'|'futureCaption'};
export function updateDirectText(plan:Plan,index:number,target:TextTarget,value:string):Plan{
  if(target.kind==='year')return plan;
  if(target.kind==='slide')return {...plan,slides:plan.slides.map((s,i)=>i===index?{...s,[target.key]:value}:s)};
  if(target.kind==='item')return {...plan,items:plan.items.map(item=>item.id===target.id?{...item,[target.key]:value}:item)};
  if(target.kind==='comparison')return {...plan,comparisons:plan.comparisons?.map((pair,i)=>i===index?{...pair,[target.key]:value}:pair)};
  return {...plan,[target.key]:value};
}
export function directTextLimit(t:TextTarget,input?:Input){return t.kind==='year'?4:t.kind==='item'?(t.key==='title'?26:100):t.kind==='comparison'?40:t.kind==='plan'?(t.key==='title'?60:90):t.key==='title'?44:t.key==='emphasis'?26:t.key==='nextTeaser'?48:input?(input.mode==='info'?180:readingBodyLimit(input)):320;}
