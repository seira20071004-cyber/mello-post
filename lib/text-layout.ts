import type {Input,SlideAsset,TextBox} from './schema';
export function defaultTextBox(input:Pick<Input,'mode'>,cover=false):TextBox{
  return {x:.08,y:cover?.16:.09,width:.84,height:cover?.55:input.mode==='essay'?.75:.40};
}
export function clampTextBox(box:TextBox):TextBox{
  const width=Math.max(.25,Math.min(.92,box.width)),height=Math.max(.18,Math.min(.88,box.height));
  return {width,height,x:Math.max(.04,Math.min(.96-width,box.x)),y:Math.max(.04,Math.min(.96-height,box.y))};
}
export function textBoxFor(input:Pick<Input,'mode'>,asset:SlideAsset,cover=false):TextBox{return clampTextBox(asset.textBox||defaultTextBox(input,cover));}
export function positionTextBox(box:TextBox,position:'top'|'bottom'|'left'|'right'):TextBox{
  return clampTextBox({...box,...(position==='top'?{x:.08,y:.08}:position==='bottom'?{x:.08,y:.94-box.height}:position==='left'?{x:.06,y:.12,width:.58}: {x:.36,y:.12,width:.58})});
}
