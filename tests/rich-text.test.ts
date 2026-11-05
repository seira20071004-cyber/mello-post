import {describe,it,expect} from 'vitest';
import {createCanvas} from '@napi-rs/canvas';
import {toggleMark,rebaseMarks,rangeMarked,textFormatKey} from '../lib/rich-text';
import {appearanceSchema} from '../lib/appearance';
import {initialInput} from '../lib/schema';
import {drawSlide} from '../lib/render';
import {storySample,essaySample} from '../lib/reading-samples';
import {comicSample,quoteSample,comparisonSample} from '../lib/additional-samples';
import {samplePlan} from '../lib/sample';
describe('selected text formatting',()=>{
 it('toggles overlapping bold and underline independently',()=>{const a=toggleMark(undefined,'abcdef',1,4,'bold'),b=toggleMark(a,'abcdef',2,5,'underline');expect(rangeMarked(b.marks,1,4,'bold')).toBe(true);expect(rangeMarked(b.marks,2,5,'underline')).toBe(true);const c=toggleMark(b,'abcdef',2,3,'bold');expect(rangeMarked(c.marks,2,3,'bold')).toBe(false);expect(rangeMarked(c.marks,2,3,'underline')).toBe(true);expect(rangeMarked(c.marks,1,2,'bold')).toBe(true);});
 it('moves spans with inserted text and drops deleted spans without formatting unrelated words',()=>{const f=toggleMark(undefined,'あいうえお',1,3,'bold');expect(rebaseMarks(f,'前あいうえお')).toEqual([{start:2,end:4,bold:true,underline:false}]);expect(rebaseMarks(f,'あえお')).toEqual([]);});
 it('preserves marks through draft schema round trips while accepting older drafts',()=>{const textFormats={'{"kind":"slide","key":"body"}':toggleMark(undefined,'hello',0,2,'underline')};expect(appearanceSchema.parse(JSON.parse(JSON.stringify({textFormats})))).toEqual({textFormats});expect(appearanceSchema.parse({})).toEqual({});});
 it.each([['story',storySample],['essay',essaySample],['comic',comicSample],['quote',quoteSample],['info',samplePlan],['comparison',comparisonSample]] as const)('renders partial bold and underline into the PNG pixels for %s',(mode,plan)=>{const input={...initialInput,mode},c=createCanvas(1080,1350),ctx=c.getContext('2d') as unknown as CanvasRenderingContext2D;const before=drawSlide(ctx,plan,input,1,{fontScale:1});const baseline=c.toBuffer('image/png');const r=before.textRegions!.find(r=>r.target&&r.text.length>2)!;const bold=toggleMark(undefined,r.text,0,2,'bold');const formatted=toggleMark(bold,r.text,0,2,'underline');const after=drawSlide(ctx,plan,input,1,{fontScale:1,textFormats:{[textFormatKey(r.target!)]:formatted}});expect(c.toBuffer('image/png').equals(baseline)).toBe(false);expect(after.warnings).toEqual(before.warnings);});
});
