import {describe,it,expect} from 'vitest';
import {createCanvas,GlobalFonts} from '@napi-rs/canvas';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {initialInput,inputSchema,validatePlan,validateEngagement,planSchema,type Input,type SlideAsset} from '../lib/schema';
import {storySample,essaySample} from '../lib/reading-samples';
import {samplePlan} from '../lib/sample';
import {compositionFor,generationSchema,finishReadingPath} from '../lib/composition';
import {clampTextBox,textBoxFor,positionTextBox} from '../lib/text-layout';
import {pendingImageCalls} from '../lib/modes';
import {drawSlide} from '../lib/render';
import {formats,imageGenerationSize,type AspectRatio} from '../lib/formats';
for(const pkg of ['noto-serif-jp','noto-sans-jp'])for(const weight of [400,500,600])GlobalFonts.register(readFileSync(`node_modules/@fontsource/${pkg}/files/${pkg}-japanese-${weight}-normal.woff2`),pkg==='noto-serif-jp'?'Noto Serif JP':'Noto Sans JP');
const story={...initialInput,theme:'子どもの小さな宝物',mode:'story' as const};
describe('reading modes',()=>{
  it('starts new posts as stories and treats previous inputs as information posts',()=>{expect(initialInput.mode).toBe('story');expect(inputSchema.parse({theme:'昔の投稿'}).mode).toBe('info');});
  it.each(['story','essay'] as const)('has no list items or forced follow bands in %s',mode=>{const plan=mode==='story'?storySample:essaySample,input={...story,mode,count:plan.slides.length};expect(validatePlan(plan,input)).toEqual([]);expect(validateEngagement(plan,input)).toEqual([]);expect(generationSchema(input).safeParse(plan).success).toBe(true);expect(compositionFor(input).itemCount).toBe(0);expect(finishReadingPath(plan,input)).toEqual(plan);});
  it('allows a short dialogue as an entire page',()=>{const p=structuredClone(storySample);p.slides[2].body='「これ、あげる」';expect(validatePlan(p,story)).toEqual([]);});
  it('rejects excess story text and unnecessary headings, teasers and follow bands',()=>{const p=structuredClone(storySample);p.slides[1].body='あ'.repeat(81);p.slides[1].title='余分な見出し';p.slides[1].nextTeaser='次へどうぞ';p.followCTA='フォローしてね';const errors=validateEngagement(p,story).join();expect(errors).toContain('80文字');expect(errors).toContain('見出し');expect(errors).toContain('予告');expect(errors).toContain('最終ページの本文');});
  it('does not accept empty pages even when interior titles are intentionally blank',()=>{const p=structuredClone(storySample);p.slides[1].body='';expect(validatePlan(p,story).join()).toContain('空のページ');});
  it('continues to require titles and short bodies for information posts',()=>{const p=structuredClone(samplePlan);p.slides[1].title='';expect(validatePlan(p,{...story,mode:'info',theme:samplePlan.title}).join()).toContain('タイトル');});
  it('enforces the smaller square essay text budget',()=>{const p=structuredClone(essaySample);p.slides[1].body='あ'.repeat(221);expect(validateEngagement(p,{...story,mode:'essay',aspectRatio:'1:1'}).join()).toContain('220文字');});
  it('accepts legacy plans without adding reading furniture',()=>expect(planSchema.parse({...storySample,followCTA:undefined}).followCTA).toBe(''));
});
describe('reading area and background reuse',()=>{
  it('requests the selected ratio without cropping for current models, with standard-size fallback',()=>{expect(imageGenerationSize({mode:'story',aspectRatio:'4:5'},'gpt-image-2.5-flare')).toBe('1024x1280');expect(imageGenerationSize({mode:'essay',aspectRatio:'9:16'},'gpt-image-2.5-flare')).toBe('864x1536');expect(imageGenerationSize({mode:'story',aspectRatio:'4:5'},'gpt-image-1')).toBe('1024x1536');expect(imageGenerationSize({mode:'info',aspectRatio:'4:5'},'gpt-image-2.5-flare')).toBe('1024x1024');});
  it('keeps moved and resized text inside the image',()=>{for(const x of [-1,.4,1])for(const y of [-1,.4,1])for(const width of [.1,.6,2]){const b=clampTextBox({x,y,width,height:.7});expect(b.x).toBeGreaterThanOrEqual(.04);expect(b.y).toBeGreaterThanOrEqual(.04);expect(b.x+b.width).toBeLessThanOrEqual(.96000001);expect(b.y+b.height).toBeLessThanOrEqual(.96000001);}});
  it('supports top, bottom, left and right presets without overflow',()=>{const initial=textBoxFor(story,{fontScale:1});for(const pos of ['top','bottom','left','right'] as const){const b=positionTextBox(initial,pos);expect(b.x+b.width).toBeLessThanOrEqual(.96000001);expect(b.y+b.height).toBeLessThanOrEqual(.96000001);}});
  it('requires only one new image for a whole essay and zero when an image exists',()=>{const assets:SlideAsset[]=Array.from({length:6},()=>({fontScale:1}));expect(pendingImageCalls({...story,mode:'essay'},assets)).toBe(1);expect(pendingImageCalls({...story,mode:'essay'},[{image:'existing'},...assets])).toBe(0);expect(pendingImageCalls(story,assets)).toBe(6);});
  it.each(Object.keys(formats) as AspectRatio[])('renders both reading modes with all font scales at %s',aspectRatio=>{for(const mode of ['story','essay'] as const)for(const fontScale of [.85,1,1.2])for(let i=0;i<(mode==='essay'?essaySample:storySample).slides.length;i++){
    const plan=mode==='story'?storySample:essaySample,canvas=createCanvas(1080,1920),input:Input={...story,mode,aspectRatio,count:plan.slides.length};
    const report=drawSlide(canvas.getContext('2d') as unknown as CanvasRenderingContext2D,plan,input,i,{fontScale});expect(report.warnings,`${mode}/${i}/${fontScale}`).toEqual([]);expect(canvas.height).toBe(formats[aspectRatio].height);
    if(process.env.MELLO_RENDER_PREVIEWS&&fontScale===1&&[0,2,5].includes(i))writeFileSync(new URL(`../../../work/${mode}-${aspectRatio.replace(':','x')}-${i+1}.png`,import.meta.url),canvas.toBuffer('image/png'));
  }});
  it('changes rendered pixels when the text moves, without changing its background',()=>{const hashes=new Set<string>();for(const pos of ['top','bottom'] as const){const canvas=createCanvas(1080,1350),asset:SlideAsset={fontScale:1,textBox:positionTextBox(textBoxFor(story,{fontScale:1}),pos)};drawSlide(canvas.getContext('2d') as unknown as CanvasRenderingContext2D,storySample,story,2,asset);hashes.add(createHash('sha256').update(canvas.toBuffer('image/png')).digest('hex'));}expect(hashes.size).toBe(2);});
});

it('keeps faces clear in new comic assets without moving old drafts',async()=>{const {newSlideAsset,textBoxFor}=await import('../lib/text-layout');const input={...initialInput,mode:'comic' as const};expect(textBoxFor(input,newSlideAsset(input,1)).height).toBe(.25);expect(textBoxFor(input,{fontScale:1}).height).toBe(.4);expect(newSlideAsset(input,0)).toEqual({fontScale:1});expect(newSlideAsset(initialInput,1)).toEqual({fontScale:1});});
