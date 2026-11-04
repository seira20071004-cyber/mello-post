import {describe,it,expect} from 'vitest';
import {createCanvas} from '@napi-rs/canvas';
import {createHash} from 'node:crypto';
import {drawSlide} from '../lib/render';
import {initialInput,inputSchema,type SlideAsset} from '../lib/schema';
import {storySample} from '../lib/reading-samples';
import {comicSample,comparisonSample} from '../lib/additional-samples';
import {samplePlan} from '../lib/sample';
import {fontFor,appearanceSchema} from '../lib/appearance';
import {updateDirectText} from '../lib/direct-text';
import {artStyleDirection} from '../lib/art-styles';
describe('direct canvas editing',()=>{
 it('binds identical visible words to the correct separate item fields',()=>{const plan=structuredClone(samplePlan);plan.slides[1].itemIds=[1,2];plan.items[0].title='同じ言葉';plan.items[1].title='同じ言葉';const c=createCanvas(1080,1350),report=drawSlide(c.getContext('2d') as unknown as CanvasRenderingContext2D,plan,{...initialInput,mode:'info'},1,{fontScale:1});expect(report.textRegions!.filter(r=>r.text==='同じ言葉').map(r=>r.target)).toEqual([{kind:'item',id:1,key:'title'},{kind:'item',id:2,key:'title'}]);});
 it.each([['story',storySample],['comic',comicSample],['info',samplePlan],['comparison',comparisonSample]] as const)('exports the same moved region in %s', (mode,plan)=>{const input={...initialInput,mode},canvas=createCanvas(1080,1350),ctx=canvas.getContext('2d') as unknown as CanvasRenderingContext2D;const original=drawSlide(ctx,plan,input,1,{fontScale:1});const before=createHash('sha256').update(canvas.toBuffer('image/png')).digest('hex');const r=original.textRegions!.find(r=>r.target)!;expect(r).toBeTruthy();const moved=drawSlide(ctx,plan,input,1,{fontScale:1,textPlacements:{[r.id]:{x:.01,y:.02}}});const after=moved.textRegions!.find(n=>n.id===r.id)!;expect(after.x).toBeCloseTo(r.x+10.8);expect(after.y).toBeCloseTo(r.y+27);expect(createHash('sha256').update(canvas.toBuffer('image/png')).digest('hex')).not.toBe(before);});
 it('edits only the intended item and preserves the rest of the post',()=>{const item=samplePlan.items[0];const index=samplePlan.slides.findIndex(s=>s.itemIds.includes(item.id));const target={kind:'item' as const,id:item.id,key:'body' as const};const next=updateDirectText(samplePlan,index,target,'新しい本文');expect(next.items[0].body).toBe('新しい本文');expect(next.slides).toEqual(samplePlan.slides);expect(next.caption).toBe(samplePlan.caption);expect(samplePlan.items[0].body).toBe(item.body);});
 it('accepts all new fonts and placement data, and retains legacy defaults',()=>{for(const [font,family] of [['rounded','Zen Maru Gothic'],['handwritten','Yomogi'],['literary','Kaisei Decol']] as const){const asset={fontScale:1,textFont:font,textPlacements:{'text-0':{x:.1,y:-.1}}} satisfies SlideAsset;expect(appearanceSchema.safeParse(asset).success).toBe(true);expect(fontFor(asset,'fallback')).toBe(family);}expect(fontFor({fontScale:1},'legacy')).toBe('legacy');expect(appearanceSchema.safeParse({textPlacements:{'../../bad':{x:0,y:0}}}).success).toBe(false);});
 it('keeps old image styles by default and explicitly chosen styles override conflicting media',()=>{expect(artStyleDirection('auto','legacy')).toBe('legacy');expect(artStyleDirection('pencil','legacy')).toContain('colored-pencil');expect(inputSchema.parse({...initialInput,theme:'テスト',artStyle:undefined}).artStyle).toBe('auto');});
});
