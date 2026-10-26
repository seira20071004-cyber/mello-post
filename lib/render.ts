import type { Input, Plan, SlideAsset } from './schema';
import { tokens, readableInk } from './templates';
export const WIDTH = 1080, HEIGHT = 1920;
export type RenderReport = {warnings: string[]; width: number; height: number; minFontSize: number};
type Ctx = CanvasRenderingContext2D;
const opening = /[（「『【〈《([]$/;
const closing = /^[、。，．！？：；）』」】〉》\]ーぁぃぅぇぉっゃゅょァィゥェォッャュョ]/;
export function wrapText(ctx: Pick<Ctx, 'measureText'>, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const char of Array.from(para)) {
      if (line && ctx.measureText(line + char).width > width) {
        if (closing.test(char) && ctx.measureText(line + char).width <= width + 8) { lines.push(line + char); line = ''; continue; }
        let carry = '';
        if (opening.test(line) || closing.test(char)) { carry = Array.from(line).pop() || ''; line = line.slice(0, -carry.length); }
        if (line) lines.push(line);
        line = carry + char;
      } else line += char;
    }
    lines.push(line);
  }
  return lines;
}
function round(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fillStyle=fill; ctx.fill();
}
function block(ctx: Ctx, text: string, x: number, y: number, w: number, h: number, size: number, font: string, color: string, report: RenderReport, weight=400) {
  let lines: string[]=[]; let actual = Math.round(size); const minimum=Math.min(actual,32);
  for (; actual >= minimum; actual--) {
    ctx.font=`${weight} ${actual}px "${font}"`;
    lines=wrapText(ctx,text,w);
    if (lines.length*actual*1.55<=h && lines.every(line=>ctx.measureText(line).width<=w+8)) break;
  }
  if (actual<minimum) { report.warnings.push('文章が表示領域を超えています。本文を短くしてください。'); actual=minimum; }
  report.minFontSize = Math.min(report.minFontSize, actual);
  ctx.font=`${weight} ${actual}px "${font}"`; ctx.fillStyle=color; ctx.textBaseline='top';
  ctx.save(); ctx.beginPath(); ctx.rect(x,y,w+8,h); ctx.clip();
  lines.forEach((line,i)=>ctx.fillText(line,x,y+i*actual*1.55)); ctx.restore();
  return Math.min(lines.length*actual*1.55,h);
}
function botanical(ctx: Ctx, input: Input, index: number) {
  const t=tokens(input); ctx.fillStyle=t.bg; ctx.fillRect(0,0,WIDTH,HEIGHT);
  const gr=ctx.createLinearGradient(100,900,950,1880); gr.addColorStop(0,t.paper); gr.addColorStop(1,t.line);
  ctx.fillStyle=gr; ctx.fillRect(0,850,WIDTH,HEIGHT-850);
  ctx.save(); ctx.translate(580,1490); ctx.rotate((index%2 ? -1:1)*.12);
  ctx.strokeStyle=t.muted; ctx.lineWidth=4;
  for(let stem=0;stem<4;stem++) {
    const x=(stem-1.5)*120; ctx.beginPath();ctx.moveTo(0,320);ctx.quadraticCurveTo(x-140,90,x,-220-stem*40);ctx.stroke();
    for(let leaf=0;leaf<4;leaf++) {
      ctx.save();ctx.translate(x*(leaf/4),240-leaf*120);ctx.rotate((leaf%2?-1:1)*.85);
      ctx.fillStyle=leaf%2?t.line:t.accent;ctx.globalAlpha=.3;ctx.beginPath();ctx.ellipse(40,0,68,25,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    ctx.save();ctx.translate(x,-220-stem*40);ctx.fillStyle=t.paper;ctx.globalAlpha=.85;
    for(let petal=0;petal<5;petal++) {ctx.rotate(Math.PI*2/5);ctx.beginPath();ctx.ellipse(0,37,34,53,0,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle=t.accent;ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();ctx.restore();
  } ctx.restore();
}
export function drawSlide(ctx: Ctx, plan: Plan, input: Input, index: number, asset: SlideAsset, image?: CanvasImageSource): RenderReport {
  const report: RenderReport={warnings:[],width:WIDTH,height:HEIGHT,minFontSize:200};
  const s=plan.slides[index], t=tokens(input), scale=asset.fontScale || 1;
  ctx.canvas.width=WIDTH;ctx.canvas.height=HEIGHT;ctx.clearRect(0,0,WIDTH,HEIGHT);
  botanical(ctx,input,index);
  const cover=s.layout==='cover', summary=s.layout==='summary';
  const imageY=cover?1020:summary?1160:s.itemIds.length===2?1450:1150;
  if(image) {
    const im=image as HTMLImageElement;const iw=im.naturalWidth || im.width, ih=im.naturalHeight || im.height;
    const h=HEIGHT-imageY, ratio=Math.max(WIDTH/iw,h/ih);const sw=WIDTH/ratio,sh=h/ratio;
    ctx.drawImage(image,(iw-sw)/2,(ih-sh)/2,sw,sh,0,imageY,WIDTH,h);
    const fade=ctx.createLinearGradient(0,imageY,0,imageY+220);fade.addColorStop(0,t.bg);fade.addColorStop(1,t.bg+'00');ctx.fillStyle=fade;ctx.fillRect(0,imageY,WIDTH,220);
  }
  ctx.fillStyle=t.bg;ctx.fillRect(0,0,WIDTH,imageY);
  ctx.strokeStyle=t.line;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(90,130);ctx.lineTo(990,130);ctx.stroke();
  ctx.font='500 25px "Noto Sans JP"';ctx.fillStyle=t.muted;ctx.textBaseline='top';ctx.fillText('A LITTLE CARE, EVERY DAY',92,81);
  ctx.textAlign='right';ctx.fillText(`${String(index+1).padStart(2,'0')} / ${String(plan.slides.length).padStart(2,'0')}`,988,81);ctx.textAlign='left';
  if(cover) {
    block(ctx,s.emphasis,94,198,880,100,32,'Noto Sans JP',t.muted,report,500);
    block(ctx,s.title,88,340,900,430,88*scale,t.font,t.ink,report,600);
    block(ctx,s.body,94,805,870,200,37*scale,'Noto Sans JP',t.ink,report);
  } else {
    block(ctx,s.title,88,205,900,295,(summary?77:68)*scale,t.font,t.ink,report,600);
    const items=s.itemIds.map(id=>plan.items.find(item=>item.id===id)).filter(Boolean);
    if(items.length) {
      let y=535;
      items.forEach(item=>{
        if(!item)return;
        round(ctx,88,y,904,350,t.radius,t.paper);
        round(ctx,118,y+28,64,64,32,t.accent);ctx.fillStyle=readableInk(t.accent);ctx.font='500 32px "Noto Sans JP"';ctx.textBaseline='top';ctx.fillText(String(item.id).padStart(2,'0'),129,y+42);
        block(ctx,item.title,203,y+32,748,104,40*scale,t.font,t.ink,report,600);
        block(ctx,item.body,120,y+136,830,205,(items.length===2?34:40)*scale,'Noto Sans JP',t.ink,report);
        y+=370;
      });
      block(ctx,s.body,94,y+14,880,120,32*scale,'Noto Sans JP',t.muted,report);
    } else block(ctx,s.body,96,565,880,430,46*scale,'Noto Sans JP',t.ink,report);
    if(summary) {
      round(ctx,90,1018,900,98,49,t.accent);
      block(ctx,s.emphasis,130,1043,820,60,34*scale,'Noto Sans JP',readableInk(t.accent),report,500);
    } else {
      const y=imageY-32;round(ctx,90,y,900,84,42,t.paper);
      block(ctx,s.emphasis,124,y+18,832,53,30*scale,'Noto Sans JP',t.ink,report,500);
    }
  }
  round(ctx,88,1794,904,70,35,t.paper);ctx.font='400 25px "Noto Sans JP"';ctx.fillStyle=t.ink;ctx.textBaseline='top';
  ctx.fillText(summary?'保存して、いつでも見返せるように':'自分のペースで、心地よい毎日へ',116,1813);
  ctx.textAlign='right';ctx.fillText(summary?'♡':'SWIPE  →',961,1813);ctx.textAlign='left';
  return report;
}
let fontsReady: Promise<void> | undefined;
export function loadFonts() {
  fontsReady ??= Promise.all(['400 40px "Noto Sans JP"','500 40px "Noto Sans JP"','600 70px "Noto Serif JP"'].map(font=>document.fonts.load(font,'美容習慣わたしをいたわる'))).then(()=>document.fonts.ready).then(()=>undefined);
  return fontsReady;
}
export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('画像を読み込めませんでした'));im.src=src;});
}
export async function renderCanvas(canvas: HTMLCanvasElement, plan: Plan, input: Input, index: number, asset: SlideAsset) {
  // Load all Japanese unicode subsets needed for this particular slide, not just the font family.
  const s=plan.slides[index];const content=[s.title,s.body,s.emphasis,'保存して、いつでも見返せるように自分のペースで心地よい毎日へ',...plan.items.filter(i=>s.itemIds.includes(i.id)).flatMap(i=>[i.title,i.body])].join('');
  await loadFonts();
  await Promise.all(['400 40px "Noto Sans JP"','500 40px "Noto Sans JP"','600 70px "Noto Serif JP"','600 70px "Noto Sans JP"'].map(font=>document.fonts.load(font,content)));
  const image=asset.image?await loadImage(asset.image):undefined;
  return drawSlide(canvas.getContext('2d')!,plan,input,index,asset,image);
}
export async function pngBlob(plan: Plan,input: Input,index: number,asset: SlideAsset) {
  const canvas=document.createElement('canvas'); const report=await renderCanvas(canvas,plan,input,index,asset);
  if(report.warnings.length) throw new Error(`${index+1}枚目: ${report.warnings[0]}`);
  return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNGの作成に失敗しました')),'image/png'));
}
