import {describe,it,expect} from 'vitest';
import {createCanvas} from '@napi-rs/canvas';
import {resizeTextRegion} from '../lib/text-resize';
import {drawSlide} from '../lib/render';
import {initialInput} from '../lib/schema';
import {storySample,essaySample} from '../lib/reading-samples';
import {comicSample,quoteSample,comparisonSample} from '../lib/additional-samples';
import {samplePlan} from '../lib/sample';
import {tutorialSteps} from '../lib/tutorial';
describe('manual text frame sizing',()=>{
 it('holds the opposite corner fixed and preserves existing position offsets',()=>{const region={x:200,y:300,width:400,height:200},canvas={width:1000,height:1000},old={x:.1,y:.2};const size=resizeTextRegion(region,canvas,old,-50,-30,'nw');expect(size).toEqual({x:.05,y:.17,width:.45,height:.23});expect(200+(size.x-old.x)*1000+size.width!*1000).toBe(600);expect(300+(size.y-old.y)*1000+size.height!*1000).toBe(500);});
 it('keeps all four corners within the canvas with a minimum readable frame',()=>{const r={x:100,y:200,width:400,height:300},c={width:1080,height:1350};for(const corner of ['nw','ne','sw','se'] as const)for(const delta of [-10000,10000]){const p=resizeTextRegion(r,c,{x:0,y:0},delta,delta,corner);expect(p.width).toBeGreaterThanOrEqual(.11999);expect(p.height).toBeGreaterThanOrEqual(.04499);const x=r.x+p.x*c.width,y=r.y+p.y*c.height;expect(x).toBeGreaterThanOrEqual(0);expect(y).toBeGreaterThanOrEqual(0);expect(x+p.width!*c.width).toBeLessThanOrEqual(c.width+.001);expect(y+p.height!*c.height).toBeLessThanOrEqual(c.height+.001);}});
 it('resizes only the chosen axis from each edge and holds the opposite edge fixed',()=>{const r={x:200,y:300,width:400,height:200},c={width:1000,height:1000};for(const edge of ['n','s','w','e'] as const){const p=resizeTextRegion(r,c,{x:.1,y:.2},50,30,edge);if(edge==='n'||edge==='s'){expect(p.x).toBe(.1);expect(p.width).toBe(.4);expect(p.height).toBeCloseTo(edge==='n'?.17:.23);expect(p.y).toBeCloseTo(edge==='n'?.23:.2);}else{expect(p.y).toBe(.2);expect(p.height).toBe(.2);expect(p.width).toBeCloseTo(edge==='w'?.35:.45);expect(p.x).toBeCloseTo(edge==='w'?.15:.1);}}});
 it.each([['story',storySample],['essay',essaySample],['comic',comicSample],['quote',quoteSample],['info',samplePlan],['comparison',comparisonSample]] as const)('uses saved frame width and height when rendering %s, including a different aspect ratio',(mode,plan)=>{for(const ratio of ['4:5','1:1','9:16'] as const){const input={...initialInput,mode,aspectRatio:ratio},c=createCanvas(1080,1350),ctx=c.getContext('2d') as unknown as CanvasRenderingContext2D;const before=drawSlide(ctx,plan,input,1,{fontScale:1});const r=before.textRegions!.find(r=>r.target)!;const after=drawSlide(ctx,plan,input,1,{fontScale:1,textPlacements:{[r.id]:{x:0,y:0,width:.55,height:.3}}});const frame=after.textRegions!.find(n=>n.id===r.id)!;expect(frame.width).toBeCloseTo(after.width*.55);expect(frame.height).toBeCloseTo(after.height*.3);expect(frame.target).toEqual(r.target);}});
 it('removes the tone choice from every tutorial without changing mode recommendations',()=>{for(const mode of ['story','essay','comic','quote','info','comparison'] as const)expect(tutorialSteps(mode).some(s=>String(s.id)==='tone')).toBe(false);});
});

describe('reference artwork selection',()=>{
 it('preserves an explicit reference medium and prioritizes the uploaded artwork',async()=>{const {inputSchema}=await import('../lib/schema');const {artStyleDirection}=await import('../lib/art-styles');expect(inputSchema.parse({...initialInput,theme:'親子の日常',artStyle:'reference'}).artStyle).toBe('reference');expect(artStyleDirection('reference','watercolor')).toContain('primary guide');});
});
