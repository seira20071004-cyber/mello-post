import type {SlideAsset} from './schema';
export type Placement=NonNullable<SlideAsset['textPlacements']>[string];
export type ResizeHandle='nw'|'ne'|'sw'|'se'|'n'|'s'|'w'|'e';
export function resizeTextRegion(region:{x:number;y:number;width:number;height:number},canvas:{width:number;height:number},old:Placement,dx:number,dy:number,corner:ResizeHandle):Placement{
  const minWidth=canvas.width*.12,minHeight=canvas.height*.045;
  let left=region.x,top=region.y,right=region.x+region.width,bottom=region.y+region.height;
  if(corner.endsWith('w'))left=Math.max(0,Math.min(right-minWidth,left+dx));else if(corner.endsWith('e'))right=Math.min(canvas.width,Math.max(left+minWidth,right+dx));
  if(corner.startsWith('n'))top=Math.max(0,Math.min(bottom-minHeight,top+dy));else if(corner.startsWith('s'))bottom=Math.min(canvas.height,Math.max(top+minHeight,bottom+dy));
  return {...old,x:old.x+(left-region.x)/canvas.width,y:old.y+(top-region.y)/canvas.height,width:(right-left)/canvas.width,height:(bottom-top)/canvas.height};
}
