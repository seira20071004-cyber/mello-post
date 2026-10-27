import {describe,it,expect} from 'vitest';
import {createCanvas,GlobalFonts} from '@napi-rs/canvas';
import {readFileSync,writeFileSync} from 'node:fs';
import JSZip from 'jszip';
import {createHash} from 'node:crypto';
import {initialInput,inputSchema,inputIssues,storedPlanSchema,validatePlan,validateEngagement,type Input,type SlideAsset} from '../lib/schema';
import {comicSample,quoteSample,comparisonSample} from '../lib/additional-samples';
import {generationSchema} from '../lib/composition';
import {pendingImageCalls,isAssetComplete,usesSharedBackground} from '../lib/modes';
import {comparisonImageSize,panelAssetPatch,comparisonAgeDirection} from '../lib/comparison';
import {verticalColumns,fitVertical} from '../lib/vertical-text';
import {drawSlide} from '../lib/render';
import {formats,type AspectRatio} from '../lib/formats';
import {effectiveSurfaceOpacity} from '../lib/appearance';
import {editorPrompt} from '../lib/server/prompts';
const samples={comic:comicSample,quote:quoteSample,comparison:comparisonSample};
for(const pkg of ['noto-serif-jp','noto-sans-jp'])for(const weight of [400,500,600])GlobalFonts.register(readFileSync(`node_modules/@fontsource/${pkg}/files/${pkg}-japanese-${weight}-normal.woff2`),pkg==='noto-serif-jp'?'Noto Serif JP':'Noto Sans JP');
describe('three additional modes',()=>{
 it.each(Object.keys(samples) as (keyof typeof samples)[])('accepts a complete %s post at the strict generation and persistence boundaries',mode=>{const input={...initialInput,mode,theme:samples[mode].title};expect(generationSchema(input).safeParse(samples[mode]).success).toBe(true);expect(storedPlanSchema.safeParse(samples[mode]).success).toBe(true);expect(validatePlan(samples[mode],input)).toEqual([]);expect(validateEngagement(samples[mode],input)).toEqual([]);});
 it('leaves existing modes and defaults intact',()=>{expect(initialInput.mode).toBe('story');expect(inputSchema.parse({theme:'古い投稿'}).mode).toBe('info');expect(initialInput.aspectRatio).toBe('4:5');});
 it('rejects inverted years before any API call',()=>{expect(inputIssues({...initialInput,mode:'comparison',nowYear:2046,futureYear:2026}).join()).toContain('未来の年');});
 it('keeps the selected adult age in the present and advances it in future instructions',()=>{const prompt=editorPrompt({...initialInput,mode:'comparison'});expect(prompt).toContain('32 to about 52');expect(prompt).not.toContain('Keep the same adult age throughout the set');expect(editorPrompt({...initialInput,mode:'quote'})).toContain('Keep the same adult age throughout the set');});
 it('requires one complete scene pair per comparison slide',()=>{const p=structuredClone(comparisonSample);p.comparisons!.pop();expect(validatePlan(p,{...initialInput,mode:'comparison'}).join()).toContain('一組');});
 it('does not allow explanatory body bands to hide the comparison',()=>{const p=structuredClone(comparisonSample);p.slides[2].body='重ねて長く説明します';expect(validateEngagement(p,{...initialInput,mode:'comparison'}).length).toBeGreaterThan(0);});
 it('requires short and nonduplicated words for the quote cards',()=>{const p=structuredClone(quoteSample);p.slides[2].body=p.slides[1].body;p.slides[3].body='あ'.repeat(65);const issues=validateEngagement(p,{...initialInput,mode:'quote'}).join();expect(issues).toContain('繰り返さず');expect(issues).toContain('64文字');});
 it.each(['心を満たして、今日を大切に。','急いで靴を履かせるより、\n隣で待つ。\n笑って見守る。','寝顔を見ながら反省するより、\n明日の朝に伝える言葉を一つずつゆっくりじっくり考える。'])('rejects quote copy that breaks the two-line format, including the last card: %s',body=>{const p=structuredClone(quoteSample);p.slides[5].body=body;expect(validateEngagement(p,{...initialInput,mode:'quote'}).join()).toContain('各行24文字以内の2行');});
 it('preserves editing and export compatibility with older free-form quote drafts',()=>{const p=structuredClone(quoteSample);p.slides[2].body='今日の自分に、少しだけやさしく。';expect(validatePlan(p,{...initialInput,mode:'quote'})).toEqual([]);expect(validateEngagement(p,{...initialInput,mode:'quote'}).length).toBeGreaterThan(0);});
 it('enforces the shorter comic text budget',()=>{const p=structuredClone(comicSample);p.slides[1].body='あ'.repeat(61);expect(validateEngagement(p,{...initialInput,mode:'comic'}).join()).toContain('60文字');});
 it('uses no default text plate for comics and quote cards while preserving the legacy opacity',()=>{expect(effectiveSurfaceOpacity({mode:'comic'},{fontScale:1})).toBe(0);expect(effectiveSurfaceOpacity({mode:'quote'},{fontScale:1})).toBe(0);expect(effectiveSurfaceOpacity({mode:'story'},{fontScale:1})).toBe(.92);expect(effectiveSurfaceOpacity({mode:'comparison'},{fontScale:1})).toBe(1);});
});
describe('paid image accounting and independent retries',()=>{
 it('counts the exact missing panels, and completion requires both images',()=>{const input={mode:'comparison' as const};const assets:SlideAsset[]=[{fontScale:1},{fontScale:1,image:'now'},{fontScale:1,image:'now',futureImage:'future'}];expect(pendingImageCalls(input,assets)).toBe(3);expect(assets.map(a=>isAssetComplete(input,a))).toEqual([false,false,true]);expect(pendingImageCalls(input,[{image:'now',futureImage:undefined}])).toBe(1);});
 it('shares a single quote background and reuses it without a new paid call',()=>{expect(usesSharedBackground({mode:'quote'})).toBe(true);expect(pendingImageCalls({mode:'quote'},Array.from({length:6},()=>({})))).toBe(1);expect(pendingImageCalls({mode:'quote'},[{image:'old'},{}])).toBe(0);});
 it('updates the future only without overwriting the successful current image or its review',()=>{const old:SlideAsset={fontScale:1,image:'current',review:{unexpectedText:false,anatomyConcern:false,styleConcern:false,notes:['current']},futureError:'failed'};const next={...old,...panelAssetPatch('future',{image:'new-future'})};expect(next.image).toBe('current');expect(next.review).toEqual(old.review);expect(next.futureImage).toBe('new-future');expect(next.futureError).toBeUndefined();});
 it.each(Object.keys(formats) as AspectRatio[])('requests safe landscape panel sizes for %s',aspectRatio=>{const [w,h]=comparisonImageSize({aspectRatio},'gpt-image-2.5-flare').split('x').map(Number);expect(w%16).toBe(0);expect(h%16).toBe(0);expect(w*h).toBeGreaterThanOrEqual(655360);expect(w/h).toBeLessThanOrEqual(3);});
 it('ages future adults according to the year gap without claiming a prediction',()=>{const text=comparisonAgeDirection({...initialInput,nowYear:2026,futureYear:2046,characterAge:'30s'});expect(text).toContain('32 to about 52');expect(text).toContain('not a prediction');});
});
describe('vertical Japanese and exported geometry',()=>{
 it('keeps characters and explicit paragraph boundaries in right-to-left column order',()=>{expect(verticalColumns('あいうえお\nかきく',3)).toEqual(['あいう','えお','かきく']);expect(verticalColumns('あいうえお',3).join('')).toBe('あいうえお');});
 it('keeps opening and closing Japanese quotes away from column boundaries',()=>{const cols=verticalColumns('あ「いう」えお、かきく。',3);expect(cols.filter(c=>/^[、。）」』]/.test(c))).toEqual([]);expect(cols.filter(c=>/[（「『]$/.test(c))).toEqual([]);});
 it('reports vertical overflow rather than silently exporting missing text',()=>expect(fitVertical('長い文章'.repeat(100),150,150,50).overflow).toBe(true));
 it.each(Object.keys(formats) as AspectRatio[])('renders every new mode and slide at all font scales for %s',aspectRatio=>{for(const mode of Object.keys(samples) as (keyof typeof samples)[])for(const fontScale of [.85,1,1.2])for(let i=0;i<6;i++){
   const canvas=createCanvas(1080,1920),input:Input={...initialInput,mode,aspectRatio,theme:samples[mode].title};const report=drawSlide(canvas.getContext('2d') as unknown as CanvasRenderingContext2D,samples[mode],input,i,{fontScale});expect(report.warnings,`${mode}/${i}/${fontScale}`).toEqual([]);expect(canvas.height).toBe(formats[aspectRatio].height);
   if(process.env.MELLO_RENDER_PREVIEWS&&fontScale===1&&[0,2,5].includes(i))writeFileSync(new URL(`../../../work/new-${mode}-${aspectRatio.replace(':','x')}-${i+1}.png`,import.meta.url),canvas.toBuffer('image/png'));
 }});
 it.each(Object.keys(samples) as (keyof typeof samples)[])('exports six separate PNGs for %s, with no collage of the entire post',async mode=>{const zip=new JSZip(),hashes=new Set<string>();for(let i=0;i<6;i++){const canvas=createCanvas(1080,1350);drawSlide(canvas.getContext('2d') as unknown as CanvasRenderingContext2D,samples[mode],{...initialInput,mode},i,{fontScale:1});const png=canvas.toBuffer('image/png');expect(png.readUInt32BE(16)).toBe(1080);expect(png.readUInt32BE(20)).toBe(1350);hashes.add(createHash('sha256').update(png).digest('hex'));zip.file(`slide-${i+1}.png`,png);}const restored=await JSZip.loadAsync(await zip.generateAsync({type:'nodebuffer'}));expect(Object.keys(restored.files)).toHaveLength(6);expect(hashes.size).toBe(6);});
});
