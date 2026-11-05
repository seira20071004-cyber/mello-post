import {describe,it,expect} from 'vitest';
import {createCanvas} from '@napi-rs/canvas';
import {colorRange,toggleMark,textFormatKey,markAt} from '../lib/rich-text';
import {addTextBox,removeTextBox,duplicateTextBox} from '../lib/text-boxes';
import {appearanceSchema} from '../lib/appearance';
import {EditorHistory} from '../lib/editor-history';
import {drawSlide} from '../lib/render';
import {initialInput,type SlideAsset} from '../lib/schema';
import {storySample,essaySample} from '../lib/reading-samples';
import {comicSample,quoteSample,comparisonSample} from '../lib/additional-samples';
import {samplePlan} from '../lib/sample';
describe('editor convenience tools',()=>{
 it('colors only the selected range while preserving bold and underline',()=>{const f=toggleMark(undefined,'abcde',0,3,'bold'),c=colorRange(f,'abcde',1,4,'#ff0000');expect(markAt(c.marks,0)).toMatchObject({bold:true});expect(markAt(c.marks,1)).toMatchObject({bold:true,color:'#ff0000'});expect(markAt(c.marks,4).color).toBeUndefined();const cleared=colorRange(c,'abcde',1,4);expect(markAt(cleared.marks,1).color).toBeUndefined();expect(markAt(cleared.marks,1).bold).toBe(true);});
 it('duplicates a box with position, size and formatting, and deletes only that box',()=>{let asset:SlideAsset={fontScale:1,...addTextBox({fontScale:1},'one')};const key=textFormatKey({kind:'box',id:'one'});asset={...asset,textPlacements:{'box-one':{x:.1,y:.1,width:.5,height:.2}},textFormats:{[key]:colorRange(undefined,'テキストを入力',0,3,'#ff0000')}};asset={...asset,...duplicateTextBox(asset,'one','two')};expect(asset.extraTextBoxes).toHaveLength(2);expect(asset.extraTextBoxes![1]).toMatchObject({id:'two',width:.5,height:.2});expect(asset.textFormats![textFormatKey({kind:'box',id:'two'})]).toEqual(asset.textFormats![key]);const removed={...asset,...removeTextBox(asset,'one')};expect(removed.extraTextBoxes!.map(b=>b.id)).toEqual(['two']);expect(removed.textPlacements!['box-one']).toBeUndefined();expect(appearanceSchema.parse(JSON.parse(JSON.stringify(removed))).extraTextBoxes).toHaveLength(1);});
 it('groups a drag or typing transaction and supports undo, redo and branching',()=>{const h=new EditorHistory(0);h.record(1,1);h.record(2,1);h.record(3,2);expect(h.undo()).toBe(2);expect(h.undo()).toBe(0);expect(h.redo()).toBe(2);h.record(4,3);expect(h.redo()).toBeUndefined();h.reset(5);expect(h.undo()).toBeUndefined();});
 it.each([['story',storySample],['essay',essaySample],['comic',comicSample],['quote',quoteSample],['info',samplePlan],['comparison',comparisonSample]] as const)('renders independent movable text boxes with colored spans in %s',(mode,plan)=>{const input={...initialInput,mode},c=createCanvas(1080,1350),ctx=c.getContext('2d') as unknown as CanvasRenderingContext2D,asset:SlideAsset={fontScale:1,...addTextBox({fontScale:1},'one'),textFormats:{[textFormatKey({kind:'box',id:'one'})]:colorRange(undefined,'テキストを入力',0,3,'#ff0000')},textPlacements:{'box-one':{x:.1,y:0,width:.4,height:.2}}};const r=drawSlide(ctx,plan,input,1,asset).textRegions!.find(r=>r.id==='box-one')!;expect(r.target).toEqual({kind:'box',id:'one'});expect(r.x).toBeCloseTo(1080*.25);expect(r.width).toBeCloseTo(1080*.4);const data=c.getContext('2d').getImageData(0,0,1080,1350).data;let red=0;for(let i=0;i<data.length;i+=4)if(data[i]>200&&data[i+1]<70&&data[i+2]<70)red++;expect(red).toBeGreaterThan(10);});
});
