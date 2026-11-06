export function foregroundMask<T>(masks:T[]|undefined){return masks?.[masks.length===1?0:1];}
/** Pixel-only helpers shared by automatic segmentation and the correction brush. */
export function confidenceAlpha(probability:number){const p=Math.max(0,Math.min(1,(probability-.25)/.5));return Math.round(255*p*p*(3-2*p));}
export function applyMaskToPixels(original:Uint8ClampedArray,mask:Uint8Array){
  if(original.length!==mask.length*4)throw new Error('写真とマスクの大きさが一致しません');
  const result=new Uint8ClampedArray(original);for(let i=0;i<mask.length;i++)result[i*4+3]=Math.round(original[i*4+3]*mask[i]/255);return result;
}
export function brushMask(mask:Uint8Array,width:number,height:number,from:{x:number;y:number},to:{x:number;y:number},radius:number,restore:boolean){
  const left=Math.max(0,Math.floor(Math.min(from.x,to.x)-radius)),right=Math.min(width-1,Math.ceil(Math.max(from.x,to.x)+radius));
  const top=Math.max(0,Math.floor(Math.min(from.y,to.y)-radius)),bottom=Math.min(height-1,Math.ceil(Math.max(from.y,to.y)+radius));
  const dx=to.x-from.x,dy=to.y-from.y,length=dx*dx+dy*dy;
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){const t=length?Math.max(0,Math.min(1,((x-from.x)*dx+(y-from.y)*dy)/length)):0;const distance=Math.hypot(x-from.x-t*dx,y-from.y-t*dy);if(distance>radius)continue;const strength=Math.min(1,(radius-distance)/Math.max(1,radius*.18)),i=y*width+x;mask[i]=Math.round(mask[i]+((restore?255:0)-mask[i])*strength);}
}
export function alphaBounds(mask:Uint8Array,width:number,height:number){let left=width,top=height,right=-1,bottom=-1;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(mask[y*width+x]>20){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}if(right<0)throw new Error('人物が残っていません。「戻す」ブラシで残したい部分をなぞってください');left=Math.max(0,left-3);top=Math.max(0,top-3);right=Math.min(width-1,right+3);bottom=Math.min(height-1,bottom+3);return {x:left,y:top,width:right-left+1,height:bottom-top+1};}
export function stopCamera(stream:Pick<MediaStream,'getTracks'>|null|undefined){stream?.getTracks().forEach(track=>track.stop());}
