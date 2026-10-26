import {describe,it,expect} from 'vitest';
import {createCanvas,GlobalFonts} from '@napi-rs/canvas';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {initialInput,inputIssues,planSchema,requestedCount,validatePlan,validateEngagement,inputSchema} from '../lib/schema';
import {samplePlan} from '../lib/sample';
import {compositionFor,generationSchema} from '../lib/composition';
import {drawSlide,wrapText} from '../lib/render';
import {formats,type AspectRatio} from '../lib/formats';
import {readableInk,templates} from '../lib/templates';
const input={...initialInput,theme:'40代女性が知っておきたい美容習慣5選'};
for(const [pkg,family] of [['noto-sans-jp','Noto Sans JP'],['noto-serif-jp','Noto Serif JP']]){
  const dir=`node_modules/@fontsource/${pkg}/files`;
  for(const weight of [400,500,600])GlobalFonts.register(readFileSync(`${dir}/${pkg}-japanese-${weight}-normal.woff2`),family);
}
describe('structured content integrity',()=>{
  it('accepts the exact 6-slide, 5-item acceptance example',()=>{expect(planSchema.safeParse(samplePlan).success).toBe(true);expect(validatePlan(samplePlan,input)).toEqual([]);});
  it.each([['40代女性の美容習慣5選',5],['美容習慣５選',5],['美容習慣五選',5],['5つのケア',5],['40代女性の美容習慣',null]])('parses explicit counts without treating ages as counts: %s',(theme,count)=>expect(requestedCount(theme)).toBe(count));
  it('rejects impossible item counts before any paid call',()=>expect(inputIssues({...input,theme:'習慣20選'})).toHaveLength(1));
  it('rejects duplicate and missing assignments even if the length is unchanged',()=>{const p=structuredClone(samplePlan);p.slides[2].itemIds=[2];expect(validatePlan(p,input).join()).toContain('重複や欠落');});
  it('rejects a numeric cover title inconsistent with the content',()=>{const p=structuredClone(samplePlan);p.slides[0].title='美容習慣7選';expect(validatePlan(p,input).join()).toContain('項目数');});
  it('rejects duplicate body and titles',()=>{const p=structuredClone(samplePlan);p.items[1].body=p.items[0].body;expect(validatePlan(p,input).join()).toContain('重複');});
  it('rejects blank and overlong edited content',()=>{const p=structuredClone(samplePlan);p.slides[0].title='';p.items[0].body='あ'.repeat(101);expect(validatePlan(p,input).length).toBeGreaterThan(0);});
  it('flags unsupported health guarantees',()=>{const p=structuredClone(samplePlan);p.items[0].body='必ず肌が若返ります';expect(validatePlan(p,input).join()).toContain('断定');});
});
describe('composition and download',()=>{
  it('chooses readable text for extreme accent colors',()=>{expect(readableInk('#ffffff')).toBe('#241e24');expect(readableInk('#000000')).toBe('#ffffff');});
  it('wraps Japanese punctuation without starting a line with closing punctuation',()=>{const ctx=createCanvas(1080,1920).getContext('2d');ctx.font='40px "Noto Sans JP"';const lines=wrapText(ctx as unknown as CanvasRenderingContext2D,'美容習慣を、心地よく。「毎日のケア」を大切に。',220);expect(lines.filter(l=>/^[、。）」]/.test(l))).toEqual([]);});
  it.each(Object.keys(formats) as AspectRatio[])('all templates, slides and text scales fit %s',aspectRatio=>{for(const template of Object.keys(templates) as (keyof typeof templates)[])for(const fontScale of [.85,1,1.2])for(let i=0;i<6;i++){
    const canvas=createCanvas(1080,1920);const report=drawSlide(canvas.getContext('2d') as unknown as CanvasRenderingContext2D,samplePlan,{...input,template,aspectRatio},i,{fontScale});expect(report.warnings,`${template}/${i}/${fontScale}`).toEqual([]);expect(canvas.width).toBe(1080);expect(canvas.height).toBe(formats[aspectRatio].height);if(process.env.MELLO_RENDER_PREVIEWS&&template==='petal'&&fontScale===1&&[0,1,5].includes(i))writeFileSync(new URL(`../../../work/carousel-${aspectRatio.replace(':','x')}-${i+1}.png`,import.meta.url),canvas.toBuffer('image/png'));
  }});
  it('reports content that cannot fit instead of silently exporting clipped text',()=>{const p=structuredClone(samplePlan);p.slides[0].title='長い文章'.repeat(120);const canvas=createCanvas(1080,1920);expect(drawSlide(canvas.getContext('2d') as unknown as CanvasRenderingContext2D,p,input,0,{fontScale:1}).warnings.length).toBeGreaterThan(0);});
  it.each(Object.keys(formats) as AspectRatio[])('packages 6 independent PNGs at the selected %s ratio',async aspectRatio=>{const zip=new JSZip(),hashes=new Set<string>();for(let i=0;i<6;i++){
    const canvas=createCanvas(1080,1920);drawSlide(canvas.getContext('2d') as unknown as CanvasRenderingContext2D,samplePlan,{...input,aspectRatio},i,{fontScale:1});const png=canvas.toBuffer('image/png');expect(png.readUInt32BE(16)).toBe(1080);expect(png.readUInt32BE(20)).toBe(formats[aspectRatio].height);hashes.add(createHash('sha256').update(png).digest('hex'));zip.file(`slide-${i+1}.png`,png);
  }zip.file('caption.txt',samplePlan.caption);const reread=await JSZip.loadAsync(await zip.generateAsync({type:'nodebuffer'}));expect(Object.keys(reread.files).filter(n=>n.endsWith('.png'))).toHaveLength(6);expect(hashes.size).toBe(6);expect(await reread.file('caption.txt')!.async('string')).toBe(samplePlan.caption);});
});

describe('reading path and follow invitation',()=>{
  it('uses 4:5 for new posts',()=>expect(inputSchema.parse({theme:'暮らしの習慣'}).aspectRatio).toBe('4:5'));
  it('accepts a complete hook-to-summary path for every format',()=>{for(const aspectRatio of Object.keys(formats) as AspectRatio[])expect(validateEngagement(samplePlan,{...input,aspectRatio})).toEqual([]);});
  it('rejects repeating generic next-page cues',()=>{const p=structuredClone(samplePlan);p.slides[1].nextTeaser=p.slides[0].nextTeaser;expect(validateEngagement(p,input).join()).toContain('使い回さず');});
  it('requires a follow invitation with future value',()=>{const p=structuredClone(samplePlan);p.followCTA='';expect(validateEngagement(p,input).join()).toContain('フォロー案内');});
  it('rejects an imaginary next page after the last slide',()=>{const p=structuredClone(samplePlan);p.slides[5].nextTeaser='次は続きをご紹介します';expect(validateEngagement(p,input).join()).toContain('存在しない');});
  it('requires numbered items to follow their presentation order',()=>{const p=structuredClone(samplePlan);p.slides[1].itemIds=[1,5];p.slides[4].itemIds=[2];expect(validatePlan(p,input)).toEqual([]);expect(validateEngagement(p,input).join()).toContain('1から順');});
});

describe('exact carousel composition',()=>{
  it('allocates 5 points to 6 slides in order',()=>expect(compositionFor(input).slides.map(s=>s.itemIds)).toEqual([[],[1,2],[3],[4],[5],[]]));
  it('uses a concrete-example page when 3 points have 6 slides',()=>{const c=compositionFor({...input,theme:'子育ての声かけ3選'});expect(c.slides.map(s=>s.itemIds)).toEqual([[],[1],[2],[3],[],[]]);expect(c.slides[4].role).toBe('example');});
  it('uses one content step per middle slide for unnumbered topics',()=>expect(compositionFor({...input,theme:'仕事の優先順位のつけ方'}).itemCount).toBe(4));
  it('rejects wrong slide counts at schema level',()=>{const p=structuredClone(samplePlan);p.slides.push(p.slides[5]);expect(generationSchema(input).safeParse(p).success).toBe(false);});
  it('rejects wrong advertised item counts at schema level',()=>{const p=structuredClone(samplePlan);p.items.pop();expect(generationSchema(input).safeParse(p).success).toBe(false);});
});
