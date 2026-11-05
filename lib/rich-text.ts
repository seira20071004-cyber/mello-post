import type {TextTarget} from './direct-text';
export type TextMark={start:number;end:number;bold?:boolean;underline?:boolean;color?:string};
export type TextFormat={text:string;marks:TextMark[]};
export type TextFormats=Record<string,TextFormat>;
export const textFormatKey=(target:TextTarget)=>JSON.stringify(target);
export function rebaseMarks(format:TextFormat|undefined,text:string):TextMark[]{
 if(!format)return [];if(format.text===text)return format.marks;
 const old=format.text;let a=0,b=0;while(a<old.length&&a<text.length&&old[a]===text[a])a++;while(b<old.length-a&&b<text.length-a&&old[old.length-1-b]===text[text.length-1-b])b++;
 const end=old.length-b,delta=text.length-old.length;
 return format.marks.flatMap(m=>{const start=m.start>=end?m.start+delta:m.start>a?a:m.start;const finish=m.end>=end?m.end+delta:m.end>a?a:m.end;return finish>start?[{...m,start,end:finish}]:[];});
}
export function markAt(marks:TextMark[],offset:number):Pick<TextMark,'bold'|'underline'|'color'>{return marks.find(m=>offset>=m.start&&offset<m.end)||{};}
export function rangeMarked(marks:TextMark[],start:number,end:number,key:'bold'|'underline'){return end>start&&Array.from({length:end-start},(_,i)=>!!markAt(marks,start+i)[key]).every(Boolean);}
export function toggleMark(format:TextFormat|undefined,text:string,start:number,end:number,key:'bold'|'underline'):TextFormat{
 start=Math.max(0,start);end=Math.min(text.length,end);const marks=rebaseMarks(format,text),enabled=!rangeMarked(marks,start,end,key),result:TextMark[]=[];
 for(let i=0;i<text.length;i++){const old=markAt(marks,i);const value={bold:!!old.bold,underline:!!old.underline,color:old.color};if(i>=start&&i<end)value[key]=enabled;if(!value.bold&&!value.underline&&!value.color)continue;const prev=result.at(-1);if(prev&&prev.end===i&&!!prev.bold===value.bold&&!!prev.underline===value.underline&&prev.color===value.color)prev.end++;else result.push({start:i,end:i+1,...value});}
 return {text,marks:result};
}
function richRuns(text:string,start:number,marks:TextMark[]){const runs:{text:string;bold:boolean;underline:boolean;color?:string}[]=[];let offset=start;for(const ch of text){const mark=markAt(marks,offset),bold=!!mark.bold,underline=!!mark.underline,previous=runs.at(-1);if(previous&&previous.bold===bold&&previous.underline===underline&&previous.color===mark.color)previous.text+=ch;else runs.push({text:ch,bold,underline,color:mark.color});offset+=ch.length;}return runs;}
export function richWidth(ctx:CanvasRenderingContext2D,text:string,start:number,marks:TextMark[],size:number,font:string,weight:number){let width=0;for(const run of richRuns(text,start,marks)){ctx.font=`${run.bold?700:weight} ${size}px "${font}"`;width+=ctx.measureText(run.text).width;}return width;}
export function richWrap(ctx:CanvasRenderingContext2D,text:string,width:number,marks:TextMark[],size:number,font:string,weight:number){const lines:string[]=[];let offset=0;for(const para of text.split('\n')){let line='',start=offset;for(const ch of para){if(line&&richWidth(ctx,line+ch,start,marks,size,font,weight)>width){if(/^[、。，．！？：；）』」】〉》\]ーぁぃぅぇぉっゃゅょァィゥェォッャュョ]/.test(ch)&&richWidth(ctx,line+ch,start,marks,size,font,weight)<=width+8){lines.push(line+ch);start+=line.length+ch.length;line='';continue;}let carry='';if(/[（「『【〈《([]$/.test(line)||/^[、。，．！？）」』】]/.test(ch)){carry=Array.from(line).pop()||'';line=line.slice(0,-carry.length);}if(line)lines.push(line);start+=line.length;line=carry+ch;}else line+=ch;}lines.push(line);offset+=para.length+1;}return lines;}
export function drawRichLine(ctx:CanvasRenderingContext2D,text:string,start:number,x:number,y:number,marks:TextMark[],size:number,font:string,weight:number){let cursor=x;const color=ctx.fillStyle;for(const run of richRuns(text,start,marks)){ctx.font=`${run.bold?700:weight} ${size}px "${font}"`;ctx.fillStyle=run.color||color;ctx.fillText(run.text,cursor,y);const w=ctx.measureText(run.text).width;if(run.underline){ctx.save();ctx.strokeStyle=run.color||color;ctx.lineWidth=Math.max(1.5,size*.045);ctx.beginPath();ctx.moveTo(cursor,y+size*1.12);ctx.lineTo(cursor+w,y+size*1.12);ctx.stroke();ctx.restore();}cursor+=w;}}
export function lineOffsets(text:string,lines:string[]){let cursor=0;return lines.map(line=>{const found=text.indexOf(line,cursor),start=found>=0?found:cursor;cursor=start+line.length;if(text[cursor]==='\n')cursor++;return start;});}

export function colorRange(format:TextFormat|undefined,text:string,start:number,end:number,color?:string):TextFormat{
 const current=rebaseMarks(format,text),marks:TextMark[]=[];
 for(let i=0;i<text.length;i++){const old=markAt(current,i),value={bold:!!old.bold,underline:!!old.underline,color:i>=start&&i<end?color:old.color};if(!value.bold&&!value.underline&&!value.color)continue;const prev=marks.at(-1);if(prev&&prev.end===i&&!!prev.bold===value.bold&&!!prev.underline===value.underline&&prev.color===value.color)prev.end++;else marks.push({start:i,end:i+1,...value});}return {text,marks};
}
