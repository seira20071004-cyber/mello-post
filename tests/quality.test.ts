import {describe,it,expect} from 'vitest';
import {createCanvas,GlobalFonts} from '@napi-rs/canvas';
import {readdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {initialInput,inputIssues,planSchema,requestedCount,validatePlan} from '../lib/schema';
import {samplePlan} from '../lib/sample';
import {drawSlide,wrapText} from '../lib/render';
import {readableInk,templates} from '../lib/templates';
const input={...initialInput,theme:'40代女性が知っておきたい美容習慣5選'};
for(const [pkg,family] of [['noto-sans-jp','Noto Sans JP'],['noto-serif-jp','Noto Serif JP']]){
  const dir=`node_modules/@fontsource/${pkg}/files`;
  for(const file of readdirSync(dir).filter(f=>f.endsWith('-400-normal.woff2')||f.endsWith('-600-normal.woff2')))GlobalFonts.register(readFileSync(`${dir}/${file}`),family);
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
  it('all 3 templates and all 6 slides render at all text scales without overflow',()=>{for(const template of Object.keys(templates) as (keyof typeof templates)[])for(const fontScale of [.85,1,1.2])for(let i=0;i<6;i++){
    const canvas=createCanvas(1080,1920);const report=drawSlide(canvas.getContext('2d') as unknown as CanvasRenderingContext2D,samplePlan,{...input,template},i,{fontScale});expect(report.warnings,`${template}/${i}/${fontScale}`).toEqual([]);expect(canvas.width).toBe(1080);expect(canvas.height).toBe(1920);
  }});
  it('reports content that cannot fit instead of silently exporting clipped text',()=>{const p=structuredClone(samplePlan);p.slides[0].title='長い文章'.repeat(120);const canvas=createCanvas(1080,1920);expect(drawSlide(canvas.getContext('2d') as unknown as CanvasRenderingContext2D,p,input,0,{fontScale:1}).warnings.length).toBeGreaterThan(0);});
  it('packages 6 independent, distinct 1080x1920 PNGs and the caption in ZIP',async()=>{const zip=new JSZip(),hashes=new Set<string>();for(let i=0;i<6;i++){
    const canvas=createCanvas(1080,1920);drawSlide(canvas.getContext('2d') as unknown as CanvasRenderingContext2D,samplePlan,input,i,{fontScale:1});const png=canvas.toBuffer('image/png');expect(png.readUInt32BE(16)).toBe(1080);expect(png.readUInt32BE(20)).toBe(1920);hashes.add(createHash('sha256').update(png).digest('hex'));zip.file(`slide-${i+1}.png`,png);
  }zip.file('caption.txt',samplePlan.caption);const reread=await JSZip.loadAsync(await zip.generateAsync({type:'nodebuffer'}));expect(Object.keys(reread.files).filter(n=>n.endsWith('.png'))).toHaveLength(6);expect(hashes.size).toBe(6);expect(await reread.file('caption.txt')!.async('string')).toBe(samplePlan.caption);});
});
