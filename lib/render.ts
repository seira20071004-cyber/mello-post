import type { Input, Plan, SlideAsset } from './schema';
import { tokens, readableInk } from './templates';
import {canvasSize} from './formats';
import {isNarrative,hasQuoteFlow} from './modes';
import {drawVertical} from './vertical-text';
import {textBoxFor} from './text-layout';
import {fontFor,colorFor,surfaceOpacity,effectiveSurfaceOpacity} from './appearance';
export const WIDTH = 1080, HEIGHT = 1920;
export type RenderReport = {warnings: string[]; width: number; height: number; minFontSize: number; fontOverride?:string; colorOverride?:string};
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
function paper(ctx:Ctx,x:number,y:number,w:number,h:number,r:number,fill:string,asset:SlideAsset){
  const opacity=surfaceOpacity(asset);if(!opacity)return;
  ctx.save();ctx.globalAlpha*=opacity;round(ctx,x,y,w,h,r,fill);ctx.restore();
}
function appearanceReport(input:Input,asset:SlideAsset):Pick<RenderReport,'fontOverride'|'colorOverride'>{return {fontOverride:asset.textFont&&asset.textFont!=='template'?fontFor(asset,'Noto Sans JP'):undefined,colorOverride:asset.textColor&&asset.textColor!=='dark'?colorFor(input,asset):undefined};}
function block(ctx: Ctx, text: string, x: number, y: number, w: number, h: number, size: number, font: string, color: string, report: RenderReport, weight=400) {
  font=report.fontOverride||font;color=report.colorOverride||color;
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
function drawLegacySlide(ctx: Ctx, plan: Plan, input: Input, index: number, asset: SlideAsset, image?: CanvasImageSource): RenderReport {
  const report: RenderReport={warnings:[],width:WIDTH,height:HEIGHT,minFontSize:200,...appearanceReport(input,asset)};
  const s=plan.slides[index], t=tokens(input), scale=asset.fontScale || 1;
  ctx.canvas.width=WIDTH;ctx.canvas.height=HEIGHT;ctx.clearRect(0,0,WIDTH,HEIGHT);
  botanical(ctx,input,index);
  const cover=s.layout==='cover', summary=s.layout==='summary';
  const imageY=cover?1020:summary&&plan.followCTA?1340:summary?1160:s.itemIds.length===2?1450:1150;
  if(image) {
    const im=image as HTMLImageElement;const iw=im.naturalWidth || im.width, ih=im.naturalHeight || im.height;
    const h=HEIGHT-imageY, ratio=Math.max(WIDTH/iw,h/ih);const sw=WIDTH/ratio,sh=h/ratio;
    ctx.drawImage(image,(iw-sw)/2,(ih-sh)/2,sw,sh,0,imageY,WIDTH,h);
    const fade=ctx.createLinearGradient(0,imageY,0,imageY+220);fade.addColorStop(0,t.bg);fade.addColorStop(1,t.bg+'00');ctx.fillStyle=fade;ctx.fillRect(0,imageY,WIDTH,220);
  }
  ctx.fillStyle=t.bg;ctx.fillRect(0,0,WIDTH,imageY);
  ctx.strokeStyle=t.line;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(90,130);ctx.lineTo(990,130);ctx.stroke();
  ctx.font='500 25px "Noto Sans JP"';ctx.fillStyle=t.muted;ctx.textBaseline='top';ctx.fillText('IDEAS FOR YOUR EVERYDAY',92,81);
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
        paper(ctx,88,y,904,350,t.radius,t.paper,asset);
        round(ctx,118,y+28,64,64,32,t.accent);ctx.fillStyle=readableInk(t.accent);ctx.font='500 32px "Noto Sans JP"';ctx.textBaseline='top';ctx.fillText(String(item.id).padStart(2,'0'),129,y+42);
        block(ctx,item.title,203,y+32,748,104,40*scale,t.font,t.ink,report,600);
        block(ctx,item.body,120,y+136,830,205,(items.length===2?34:40)*scale,'Noto Sans JP',t.ink,report);
        y+=370;
      });
      block(ctx,s.body,94,y+14,880,120,32*scale,'Noto Sans JP',t.muted,report);
    } else block(ctx,s.body,96,565,880,plan.followCTA?300:430,46*scale,'Noto Sans JP',t.ink,report);
    if(summary) {
      const bandY=plan.followCTA?1220:1018;
      if(plan.followCTA){paper(ctx,90,920,900,266,38,t.paper,asset);block(ctx,plan.followCTA,126,950,828,212,38*scale,'Noto Sans JP',t.ink,report);}
      round(ctx,90,bandY,900,98,49,t.accent);
      block(ctx,s.emphasis,130,bandY+25,820,60,34*scale,'Noto Sans JP',readableInk(t.accent),report,500);
    } else {
      const y=imageY-32;paper(ctx,90,y,900,84,42,t.paper,asset);
      block(ctx,s.emphasis,124,y+18,832,53,30*scale,'Noto Sans JP',t.ink,report,500);
    }
  }
  paper(ctx,88,1760,904,112,30,t.paper,asset);
  block(ctx,summary?'保存して、いつでも見返せるように':s.nextTeaser||'次のスライドへ →',116,1774,850,84,27,'Noto Sans JP',t.ink,report);
  return report;
}
export function drawSlide(ctx:Ctx,plan:Plan,input:Input,index:number,asset:SlideAsset,image?:CanvasImageSource,futureImage?:CanvasImageSource):RenderReport{
  const size=canvasSize(input);
  if(input.mode==='comparison')return drawComparisonSlide(ctx,plan,input,index,asset,image,futureImage);
  if(isNarrative(input))return drawReadingSlide(ctx,plan,input,index,asset,image);
  if(size.height===1920)return drawLegacySlide(ctx,plan,input,index,asset,image);
  const H=size.height,W=size.width,t=tokens(input),s=plan.slides[index],scale=asset.fontScale||1;
  const report:RenderReport={warnings:[],width:W,height:H,minFontSize:200,...appearanceReport(input,asset)};
  ctx.canvas.width=W;ctx.canvas.height=H;ctx.clearRect(0,0,W,H);
  const cover=s.layout==='cover',summary=s.layout==='summary',square=H===1080;
  const margin=68,bodyWidth=W-margin*2,footerY=H-146;
  ctx.fillStyle=t.bg;ctx.fillRect(0,0,W,H);
  const gradient=ctx.createLinearGradient(0,H*.45,W,H);gradient.addColorStop(0,t.paper);gradient.addColorStop(1,t.line);ctx.fillStyle=gradient;ctx.fillRect(0,H*.45,W,H*.55);
  if(image){
    const im=image as HTMLImageElement,iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;
    const imageY=cover?H*.53:summary?H*.60:H*.40,h=H-imageY,ratio=Math.max(W/iw,h/ih),sw=W/ratio,sh=h/ratio;
    ctx.save();ctx.globalAlpha=cover?.95:summary?.28:.16;ctx.drawImage(image,(iw-sw)/2,(ih-sh)/2,sw,sh,0,imageY,W,h);ctx.restore();
    const fade=ctx.createLinearGradient(0,imageY,0,imageY+160);fade.addColorStop(0,t.bg);fade.addColorStop(1,t.bg+'00');ctx.fillStyle=fade;ctx.fillRect(0,imageY,W,160);
  }else{
    ctx.save();ctx.translate(W*.77,H*.77);ctx.strokeStyle=t.accent;ctx.globalAlpha=.2;ctx.lineWidth=4;
    for(let n=0;n<3;n++){ctx.beginPath();ctx.ellipse(0,0,92+n*48,110+n*50,n*.5,0,Math.PI*2);ctx.stroke();}ctx.restore();
  }
  ctx.font='500 23px "Noto Sans JP"';ctx.fillStyle=t.muted;ctx.textBaseline='top';ctx.fillText('IDEAS FOR YOUR EVERYDAY',margin,43);ctx.textAlign='right';ctx.fillText(`${String(index+1).padStart(2,'0')} / ${String(plan.slides.length).padStart(2,'0')}`,W-margin,43);ctx.textAlign='left';
  ctx.strokeStyle=t.line;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(margin,91);ctx.lineTo(W-margin,91);ctx.stroke();
  if(cover){
    block(ctx,s.emphasis,margin,132,bodyWidth,66,31,'Noto Sans JP',t.muted,report,500);
    const titleY=226,titleH=square?292:330;
    block(ctx,s.title,margin,titleY,bodyWidth,titleH,(square?80:88)*scale,t.font,t.ink,report,600);
    const y=titleY+titleH+25,h=square?164:198;
    paper(ctx,margin-12,y-12,bodyWidth+24,h+24,24,t.paper,asset);
    block(ctx,s.body,margin+8,y+4,bodyWidth-16,h-8,38*scale,'Noto Sans JP',t.ink,report);
  }else if(summary){
    const titleH=square?188:232;
    block(ctx,s.title,margin,142,bodyWidth,titleH,66*scale,t.font,t.ink,report,600);
    const bodyY=142+titleH+28,bodyH=square?210:260;
    block(ctx,s.body,margin,bodyY,bodyWidth,bodyH,38*scale,'Noto Sans JP',t.ink,report);
    const ctaY=bodyY+bodyH+24,ctaH=Math.max(150,footerY-ctaY-25);
    paper(ctx,margin,ctaY,bodyWidth,ctaH,t.radius,t.paper,asset);
    block(ctx,plan.followCTA||s.emphasis,margin+26,ctaY+22,bodyWidth-52,ctaH-42,35*scale,'Noto Sans JP',t.ink,report,500);
  }else{
    const two=s.itemIds.length===2,titleTop=square&&two?115:137;
    const titleH=square?(two?104:144):180;
    block(ctx,s.title,margin,titleTop,bodyWidth,titleH,60*scale,t.font,t.ink,report,600);
    const items=s.itemIds.map(id=>plan.items.find(item=>item.id===id)).filter(Boolean);
    const startY=titleTop+titleH+(square&&two?18:22),subtitleH=square?(two?70:160):112,gap=16;
    const available=footerY-startY-subtitleH-(square&&two?20:39);
    const cardH=items.length===2?(available-gap)/2:Math.min(available,square?330:410);
    items.forEach((item,n)=>{if(!item)return;const y=startY+n*(cardH+gap);
      paper(ctx,margin,y,bodyWidth,cardH,t.radius,t.paper,asset);
      round(ctx,margin+22,y+23,56,56,28,t.accent);ctx.fillStyle=readableInk(t.accent);ctx.font='500 28px "Noto Sans JP"';ctx.textBaseline='top';ctx.fillText(String(item.id).padStart(2,'0'),margin+31,y+35);
      block(ctx,item.title,margin+98,y+23,bodyWidth-124,100,(items.length===2?38:43)*scale,t.font,t.ink,report,600);
      block(ctx,item.body,margin+26,y+124,bodyWidth-52,cardH-143,(items.length===2?34:40)*scale,'Noto Sans JP',t.ink,report);
    });
    if(items.length){const textY=startY+items.length*cardH+Math.max(0,items.length-1)*gap+19;
      block(ctx,s.body,margin+5,textY,bodyWidth-10,subtitleH,32*scale,'Noto Sans JP',t.muted,report);
    }else{const h=footerY-startY-40;paper(ctx,margin,startY,bodyWidth,h,t.radius,t.paper,asset);block(ctx,s.body,margin+32,startY+36,bodyWidth-64,h-72,44*scale,'Noto Sans JP',t.ink,report);}
  }
  const footer=summary?'保存して実践。次のヒントもお楽しみに。':s.nextTeaser||'次のスライドで、続きを読んでみましょう →';
  paper(ctx,margin,footerY,bodyWidth,108,28,summary?t.accent:t.paper,asset);
  block(ctx,footer,margin+25,footerY+12,bodyWidth-50,84,27,'Noto Sans JP',summary?readableInk(t.accent):t.ink,report,500);
  return report;
}

function drawReadingSlide(ctx:Ctx,plan:Plan,input:Input,index:number,asset:SlideAsset,image?:CanvasImageSource):RenderReport{
  const {width:W,height:H}=canvasSize(input),s=plan.slides[index],t=tokens(input),cover=index===0;
  const report:RenderReport={warnings:[],width:W,height:H,minFontSize:200,...appearanceReport(input,asset)};
  ctx.canvas.width=W;ctx.canvas.height=H;ctx.clearRect(0,0,W,H);ctx.fillStyle=t.bg;ctx.fillRect(0,0,W,H);
  if(image){
    const im=image as HTMLImageElement,iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;
    const ratio=Math.min(W/iw,H/ih),dw=iw*ratio,dh=ih*ratio;
    // Keep complete faces and props when changing ratio or reusing a square image.
    ctx.drawImage(image,(W-dw)/2,H-dh,dw,dh);
  }else{
    const gr=ctx.createLinearGradient(0,0,W,H);gr.addColorStop(0,t.paper);gr.addColorStop(.52,t.bg);gr.addColorStop(1,t.line);ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=.16;ctx.fillStyle=t.accent;
    for(let n=0;n<4;n++){ctx.beginPath();ctx.ellipse(W*(.63+n*.07),H*(.90-n*.035),85,145,.4+n*.25,0,Math.PI*2);ctx.fill();}ctx.restore();
  }
  const quoteFlow=hasQuoteFlow(input,plan),quoteEnding=quoteFlow&&index===plan.slides.length-1;
  if(quoteEnding&&!image){round(ctx,30,30,W-60,H-60,24,t.line);round(ctx,W*.06,H*.12,W*.88,H*.64,16,t.paper);}
  const box=textBoxFor(input,asset,cover,quoteEnding),x=box.x*W,y=box.y*H,w=box.width*W,h=box.height*H;
  const ink=colorFor(input,asset),light=readableInk(ink)==='#241e24',font=fontFor(asset,input.mode==='comic'||(quoteFlow&&cover)?'Noto Sans JP':t.font);
  const scale=asset.fontScale||1,align=asset.textAlign||(quoteEnding?'center':'left'),vertical=(asset.writingMode||(!cover&&input.mode==='comic'?'vertical':'horizontal'))==='vertical';
  const title=cover?s.title:'',body=s.body;
  let bodyY=y;
  function fitReading(text:string,height:number,size:number,weight=400){
    let actual=Math.round(size),lines:string[]=[];
    const pairedLines=text.trim().split(/\r?\n/).map(line=>line.trim());
    const fixedPair=input.mode==='quote'&&!cover&&pairedLines.length===2&&((quoteFlow&&index>=plan.slides.length-2)||(pairedLines[0].endsWith('より、')&&pairedLines[1].endsWith('。')))&&pairedLines.every(line=>line.length<=24);
    for(;actual>=32;actual--){ctx.font=`${weight} ${actual}px "${font}"`;lines=fixedPair?pairedLines:wrapText(ctx,text,w);if(lines.length*actual*1.75<=height&&lines.every(line=>ctx.measureText(line).width<=w+8))break;}
    return {actual:Math.max(32,actual),overflow:actual<32,lines};
  }
  const titleFit=title?fitReading(title,body?h*.56:h,(quoteFlow?112:76)*scale,600):undefined;
  const titleHeight=titleFit?titleFit.lines.length*titleFit.actual*1.75+(body?28:0):0;
  const bodyFit=body?fitReading(body,Math.max(1,h-titleHeight),(input.mode==='essay'?42:49)*scale):undefined;
  const paintedHeight=vertical?h:Math.min(h,titleHeight+(bodyFit?bodyFit.lines.length*bodyFit.actual*1.75:0));
  const opacity=effectiveSurfaceOpacity(input,asset);
  if(opacity>0){
    // Only wash behind actual lines, leaving the unused area of the artwork visible.
    ctx.save();ctx.shadowColor=light?'#15131b':'#fffaf5';ctx.shadowBlur=36;
    round(ctx,x-22,y-24,w+44,paintedHeight+48,24,light?`rgba(20,19,26,${opacity})`:`rgba(255,252,247,${opacity})`);ctx.restore();
  }
  function readingBlock(text:string,top:number,height:number,size:number,weight=400){
    if(!text)return 0;
    const {actual,lines,overflow}=fitReading(text,height,size,weight);
    if(overflow)report.warnings.push('文章が表示領域を超えています。文章を短くするか、文字エリアを広げてください。');
    report.minFontSize=Math.min(report.minFontSize,actual);ctx.font=`${weight} ${actual}px "${font}"`;ctx.fillStyle=ink;ctx.textBaseline='top';
    ctx.save();ctx.beginPath();ctx.rect(x,y,w+8,h);ctx.clip();ctx.textAlign=align;
    lines.forEach((line,n)=>ctx.fillText(line,align==='center'?x+w/2:x,top+n*actual*1.75));ctx.restore();ctx.textAlign='left';
    return lines.length*actual*1.75;
  }
  if(input.mode==='quote'&&!cover&&!quoteEnding)block(ctx,plan.title,W*.10,H*.055,W*.80,74,23,font,ink,report);
  if(vertical){const layout=drawVertical(ctx,title||body,x,y,w,h,(cover?68:46)*scale,font,ink);report.minFontSize=Math.min(report.minFontSize,layout.size);if(layout.overflow)report.warnings.push('縦書きの文章が収まりません。文字エリアを広げるか本文を短くしてください。');return report;}
  if(title)bodyY+=readingBlock(title,y,body?h*.56:h,(quoteFlow?112:76)*scale,600)+(body?28:0);
  if(body)readingBlock(body,bodyY,Math.max(1,y+h-bodyY),(input.mode==='essay'?42:49)*scale);
  // No visible page furniture: the story itself provides the continuation.
  return report;
}

function drawComparisonSlide(ctx:Ctx,plan:Plan,input:Input,index:number,asset:SlideAsset,nowImage?:CanvasImageSource,futureImage?:CanvasImageSource):RenderReport{
  const {width:W,height:H}=canvasSize(input),t=tokens(input),pair=plan.comparisons?.[index];
  const report:RenderReport={warnings:[],width:W,height:H,minFontSize:200,...appearanceReport(input,asset)};
  ctx.canvas.width=W;ctx.canvas.height=H;ctx.clearRect(0,0,W,H);
  const half=(H-8)/2;
  for(const [n,image] of [nowImage,futureImage].entries()){
    const y=n*(half+8);ctx.fillStyle=n?t.line:t.bg;ctx.fillRect(0,y,W,half);
    if(image){const im=image as HTMLImageElement,iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,scale=Math.max(W/iw,half/ih),sw=W/scale,sh=half/scale;ctx.drawImage(image,(iw-sw)/2,(ih-sh)/2,sw,sh,0,y,W,half);}
    else{ctx.fillStyle=n?t.paper:t.line;ctx.fillRect(140,y+half*.32,800,half*.68);ctx.fillStyle=t.bg;ctx.fillRect(240,y+half*.43,190,half*.34);ctx.fillRect(650,y+half*.40,180,half*.37);ctx.fillStyle=t.accent;ctx.globalAlpha=.25;ctx.fillRect(n?530:460,y+half*.88,n?120:260,28);ctx.globalAlpha=1;for(let prop=0;prop<(n?2:index+3);prop++){ctx.fillStyle=prop%2?t.accent:t.muted;ctx.fillRect(460+prop*31,y+half*.75,20,half*.11);}}
    const opacity=surfaceOpacity(asset);ctx.save();ctx.globalAlpha=opacity;round(ctx,58,y+42,230,87,18,t.paper);ctx.restore();
    block(ctx,String(n?input.futureYear:input.nowYear),78,y+53,190,68,44*(asset.fontScale||1),fontFor(asset,t.font),colorFor(input,asset),report,600);
    const caption=n?pair?.futureCaption:pair?.nowCaption;
    if(caption){paper(ctx,58,y+half-123,W-116,100,18,t.paper,asset);block(ctx,caption,78,y+half-113,W-156,82,32*(asset.fontScale||1),fontFor(asset,t.font),colorFor(input,asset),report);}
  }
  ctx.fillStyle=t.paper;ctx.fillRect(0,half,W,8);return report;
}
let fontsReady: Promise<void> | undefined;
export function loadFonts() {
  fontsReady ??= Promise.all(['400 40px "Noto Sans JP"','400 40px "Noto Serif JP"','500 40px "Noto Sans JP"','600 70px "Noto Serif JP"'].map(font=>document.fonts.load(font,'美容習慣わたしをいたわる'))).then(()=>document.fonts.ready).then(()=>undefined);
  return fontsReady;
}
export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('画像を読み込めませんでした'));im.src=src;});
}
export async function renderCanvas(canvas: HTMLCanvasElement, plan: Plan, input: Input, index: number, asset: SlideAsset) {
  // Load all Japanese unicode subsets needed for this particular slide, not just the font family.
  const s=plan.slides[index];const content=[plan.title,plan.comparisons?.[index]?.nowCaption,plan.comparisons?.[index]?.futureCaption,`${input.nowYear} ${input.futureYear}`,s.title,s.body,s.emphasis,s.nextTeaser,plan.followCTA,'保存して、いつでも見返せるように自分のペースで心地よい毎日へ保存して実践。次のヒントもお楽しみに。次のスライドで、続きを読んでみましょう →',...plan.items.filter(i=>s.itemIds.includes(i.id)).flatMap(i=>[i.title,i.body])].join('');
  await loadFonts();
  await Promise.all(['400 40px "Noto Sans JP"','400 40px "Noto Serif JP"','500 40px "Noto Sans JP"','600 70px "Noto Serif JP"','600 70px "Noto Sans JP"'].map(font=>document.fonts.load(font,content)));
  const image=asset.image?await loadImage(asset.image):undefined;
  const futureImage=input.mode==='comparison'&&asset.futureImage?await loadImage(asset.futureImage):undefined;
  return drawSlide(canvas.getContext('2d')!,plan,input,index,asset,image,futureImage);
}
export async function pngBlob(plan: Plan,input: Input,index: number,asset: SlideAsset) {
  const canvas=document.createElement('canvas'); const report=await renderCanvas(canvas,plan,input,index,asset);
  if(report.warnings.length) throw new Error(`${index+1}枚目: ${report.warnings[0]}`);
  return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNGの作成に失敗しました')),'image/png'));
}
