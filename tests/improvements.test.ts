import {describe,it,expect} from 'vitest';
import {createCanvas,GlobalFonts} from '@napi-rs/canvas';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {drawSlide} from '../lib/render';
import {initialInput,inputSchema,validateEngagement,type SlideAsset} from '../lib/schema';
import {samplePlan} from '../lib/sample';
import {storySample} from '../lib/reading-samples';
import {appearanceSchema,surfaceOpacity,fontFor,colorFor,appearancePatch} from '../lib/appearance';
import {storyResultSchema,assembleStory,storyIssues} from '../lib/server/stories';
import {characterDirection} from '../lib/characters';
for(const pkg of ['noto-serif-jp','noto-sans-jp'])for(const weight of [400,500,600])GlobalFonts.register(readFileSync(`node_modules/@fontsource/${pkg}/files/${pkg}-japanese-${weight}-normal.woff2`),pkg==='noto-serif-jp'?'Noto Serif JP':'Noto Sans JP');
describe('usable typography controls',()=>{
  it('preserves legacy colors and opacity, including explicit zero opacity',()=>{expect(surfaceOpacity({fontScale:1},true)).toBe(.92);expect(surfaceOpacity({fontScale:1,textColor:'light'},true)).toBe(.76);expect(surfaceOpacity({fontScale:1,textSurfaceOpacity:0},true)).toBe(0);expect(surfaceOpacity({fontScale:1,textSurface:'none',textSurfaceOpacity:1})).toBe(0);expect(colorFor(initialInput,{fontScale:1,textColor:'light'})).toBe('#ffffff');});
  it('validates custom colors and opacity bounds before storing them',()=>{expect(appearanceSchema.safeParse({textColor:'#2d5678',textSurfaceOpacity:.37,textFont:'sans'}).success).toBe(true);for(const bad of [{textColor:'red'},{textSurfaceOpacity:1.1},{textSurfaceOpacity:-.1}])expect(appearanceSchema.safeParse(bad).success).toBe(false);});
  it('copies only typography when applying settings to every page',()=>{const a:SlideAsset={fontScale:1,image:'private-image',textFont:'sans',textColor:'#803030',textSurfaceOpacity:.25,textBox:{x:.1,y:.1,width:.8,height:.4}};expect(appearancePatch(a)).toEqual({textFont:'sans',textColor:'#803030',textSurfaceOpacity:.25,textSurface:undefined});expect(fontFor(a,'Noto Serif JP')).toBe('Noto Sans JP');expect(appearancePatch(a)).not.toHaveProperty('image');expect(appearancePatch(a)).not.toHaveProperty('textBox');});
  it.each(['story','info'] as const)('changes actual exported pixels for font, color and opacity in %s mode',mode=>{const p=mode==='story'?storySample:samplePlan;const settings:SlideAsset[]=[{fontScale:1},{fontScale:1,textFont:'sans'},{fontScale:1,textColor:'#1857a3'},{fontScale:1,textSurfaceOpacity:0},{fontScale:1,textSurfaceOpacity:.4}];const hashes=settings.map(asset=>{const c=createCanvas(1080,1350),report=drawSlide(c.getContext('2d') as unknown as CanvasRenderingContext2D,p,{...initialInput,mode,theme:p.title},1,asset);expect(report.warnings).toEqual([]);return createHash('sha256').update(c.toBuffer('image/png')).digest('hex');});expect(new Set(hashes).size).toBe(settings.length);});
});
describe('age and actual explanations',()=>{
  it('defaults adult protagonists to their 30s independently of the reader age',()=>{const input=inputSchema.parse({theme:'子育ての声かけ',target:'40〜60代の女性'});expect(input.characterAge).toBe('30s');expect(characterDirection(input)).toContain('around 32 years old');expect(characterDirection({...input,characterAge:'50s'})).toContain('in their 50s');});
  it.each(['説明します。','紹介します。','詳しく解説します。'])('flags an unfulfilled explanatory announcement: %s',body=>{const p=structuredClone(samplePlan);p.slides[2].body=body;expect(validateEngagement(p,{...initialInput,mode:'info'}).join()).toContain('その場で伝えて');});
  it('also checks declarations in the next-page cue and the item actually typeset',()=>{const p=structuredClone(samplePlan);p.slides[1].nextTeaser='次に声かけのコツを紹介します';p.items[0].body='保湿のやり方を説明します。';expect(validateEngagement(p,{...initialInput,mode:'info'}).join()).toContain('その場で伝えて');});
  it('accepts concrete actions and examples without a hollow promise',()=>{const p=structuredClone(samplePlan);p.items[0].body='洗顔後、肌が乾ききる前に保湿剤を薄く広げます。';p.slides[1].body='肌をこすらず、手のひらでそっとなじませましょう。';expect(validateEngagement(p,{...initialInput,mode:'info'})).toEqual([]);});
});

describe('unambiguous story pagination',()=>{
  it.each([3,6,10])('assembles exactly %i slides with a separate cover and nonempty body pages',count=>{const input={...initialInput,theme:'親子の帰り道',count};const result={publication:{title:'親子の帰り道',hook:'娘が傘を傾けた理由',artDirection:'A mother in her 30s and her daughter, soft watercolor.',coverIllustration:'Mother and child on a rainy walk.',caption:'雨の日の親子の気づきを描いた創作の物語です。日々の温かい場面をまた読んでいただけたらうれしいです。 #親子 #子育て #日々の気づき',pages:Array.from({length:count-1},(_,i)=>({body:`${i+1}歩進むと、娘が私の傘をそっと見上げた。`,illustration:'Mother and daughter walking with umbrellas.'}))},continuity:{transitions:Array.from({length:count-2},(_,i)=>({fromPage:i+2,toPage:i+3,connection:'二人が同じ帰り道で会話と歩みを続けている'})),unresolved:[]}};expect(storyResultSchema(input).safeParse(result).success).toBe(true);const p=assembleStory(result);expect(p.slides).toHaveLength(count);expect(p.slides[0].body).toBe('');expect(p.slides[0].layout).toBe('cover');expect(p.slides.at(-1)!.layout).toBe('summary');expect(p.slides.slice(1).every(s=>s.body&&!s.title)).toBe(true);expect(storyIssues(result,input)).toEqual([]);result.publication.pages[0].body='';expect(storyResultSchema(input).safeParse(result).success).toBe(false);});
});
