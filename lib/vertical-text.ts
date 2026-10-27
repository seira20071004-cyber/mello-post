const open=/[（「『【〈《〔［｛]$/;
const close=/^[、。，．！？）」』】〉》〕］｝ーぁぃぅぇぉっゃゅょァィゥェォッャュョ]/;
export function verticalColumns(text:string,rows:number):string[]{
  rows=Math.max(2,Math.floor(rows));const columns:string[]=[];
  for(const paragraph of text.split('\n')){
    let chars=Array.from(paragraph);
    if(!chars.length){columns.push('');continue;}
    while(chars.length){
      let n=Math.min(rows,chars.length);
      while(n>1&&n<chars.length&&(open.test(chars[n-1])||close.test(chars[n])))n--;
      columns.push(chars.slice(0,n).join(''));chars=chars.slice(n);
    }
  }
  return columns;
}
export function fitVertical(text:string,width:number,height:number,size:number){
  let actual=Math.round(size),columns:string[]=[];
  for(;actual>=32;actual--){const rows=Math.floor(height/(actual*1.32));if(rows<3)continue;columns=verticalColumns(text,rows);if(columns.length*actual*1.7<=width)break;}
  return {size:Math.max(32,actual),columns,overflow:actual<32};
}
export function drawVertical(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,w:number,h:number,size:number,font:string,color:string){
  const layout=fitVertical(text,w,h,size),s=layout.size,pitch=s*1.32,columnPitch=s*1.7;
  const right=x+w/2+(layout.columns.length-1)*columnPitch/2;
  ctx.save();ctx.font=`400 ${s}px "${font}"`;ctx.fillStyle=color;ctx.textBaseline='middle';ctx.textAlign='center';ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  layout.columns.forEach((column,c)=>Array.from(column).forEach((char,r)=>{
    const cx=right-c*columnPitch,cy=y+s*.55+r*pitch;
    ctx.save();ctx.translate(cx,cy);
    if(/[ー―〜～…（）「」『』【】〈〉《》〔〕［］｛｝A-Za-z0-9]/.test(char)){ctx.rotate(Math.PI/2);ctx.fillText(char,0,0);}
    else if(/[、。，．]/.test(char))ctx.fillText(char,s*.40,-s*.34);
    else ctx.fillText(char,0,0);
    ctx.restore();
  }));ctx.restore();return layout;
}
