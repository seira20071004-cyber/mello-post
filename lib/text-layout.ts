import type {Input,SlideAsset,TextBox} from './schema';
export function defaultTextBox(input:Pick<Input,'mode'>,cover=false,ending=false):TextBox{
  if(input.mode==='comic')return cover?{x:.10,y:.12,width:.80,height:.40}:{x:.18,y:.09,width:.64,height:.40};
  if(input.mode==='quote'&&ending)return {x:.12,y:.28,width:.76,height:.38};
  if(input.mode==='quote')return cover?{x:.10,y:.16,width:.80,height:.48}:{x:.10,y:.28,width:.80,height:.34};
  return {x:.08,y:cover?.16:.09,width:.84,height:cover?.55:input.mode==='essay'?.75:.40};
}
export function clampTextBox(box:TextBox):TextBox{
  const width=Math.max(.25,Math.min(.92,box.width)),height=Math.max(.18,Math.min(.88,box.height));
  return {width,height,x:Math.max(.04,Math.min(.96-width,box.x)),y:Math.max(.04,Math.min(.96-height,box.y))};
}
export function textBoxFor(input:Pick<Input,'mode'>,asset:SlideAsset,cover=false,ending=false):TextBox{return clampTextBox(asset.textBox||defaultTextBox(input,cover,ending));}
// New comics use a shallower text area to leave faces clear. Store it on the
// new asset so opening an older draft keeps that draft's existing defaults.
export function newSlideAsset(input:Pick<Input,'mode'>,index:number):SlideAsset{
  return input.mode==='comic'&&index>0?{fontScale:1,textBox:{...defaultTextBox(input),height:.25}}:{fontScale:1};
}
export function positionTextBox(box:TextBox,position:'top'|'bottom'|'left'|'right'):TextBox{
  return clampTextBox({...box,...(position==='top'?{x:.08,y:.08}:position==='bottom'?{x:.08,y:.94-box.height}:position==='left'?{x:.06,y:.12,width:.58}: {x:.36,y:.12,width:.58})});
}
