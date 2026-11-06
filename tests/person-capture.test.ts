import {describe,it,expect,vi} from 'vitest';
import {createCanvas} from '@napi-rs/canvas';
import {newPhotoLayer,photoLayerSchema,rotatePhotoLayer,normalizeRotation} from '../lib/photo-layers';
import {foregroundMask,confidenceAlpha,applyMaskToPixels,brushMask,alphaBounds,stopCamera} from '../lib/person-mask';
import {drawSlide} from '../lib/render';
import {initialInput} from '../lib/schema';
import {personalSample} from '../lib/personal-sample';
import {newSlideAsset} from '../lib/text-layout';
describe('rotation preserves edit geometry and exports the same transform',()=>{
 it('preserves older photos without a rotation and normalizes full turns',()=>{const p=newPhotoLayer('old','data:image/png;base64,dGVzdA==','写真',400,500,.8);expect(photoLayerSchema.parse(p).rotation).toBeUndefined();expect(normalizeRotation(405)).toBe(45);expect(normalizeRotation(180)).toBe(180);expect(normalizeRotation(-450)).toBe(-90);});
 it.each([.5625,.8,1])('fits the rotated bounding rectangle at canvas ratio %s',ratio=>{const p={...newPhotoLayer('p','data:image/png;base64,dGVzdA==','写真',500,400,ratio),x:.7,y:.8};const r=rotatePhotoLayer(p,45,ratio),angle=Math.PI/4,bw=r.width*Math.cos(angle)+r.height/ratio*Math.sin(angle),bh=r.width*ratio*Math.sin(angle)+r.height*Math.cos(angle),cx=r.x+r.width/2,cy=r.y+r.height/2;expect(cx-bw/2).toBeGreaterThanOrEqual(-1e-8);expect(cy-bh/2).toBeGreaterThanOrEqual(-1e-8);expect(cx+bw/2).toBeLessThanOrEqual(1+1e-8);expect(cy+bh/2).toBeLessThanOrEqual(1+1e-8);});
 it('renders a rotated image into the saved canvas',()=>{const source=createCanvas(20,20),s=source.getContext('2d');s.fillStyle='red';s.fillRect(0,0,10,20);s.fillStyle='blue';s.fillRect(10,0,10,20);const canvas=createCanvas(1,1);drawSlide(canvas.getContext('2d') as unknown as CanvasRenderingContext2D,personalSample,{...initialInput,mode:'personal'},0,{...newSlideAsset({mode:'personal'},0),photoLayers:[{id:'rotated',label:'写真',source:'data:image/png;base64,dGVzdA==',x:.3,y:.5,width:.2,height:.16,rotation:90}]},undefined,undefined,[source as unknown as CanvasImageSource]);expect([...canvas.getContext('2d').getImageData(432,700,1,1).data]).toEqual([255,0,0,255]);expect([...canvas.getContext('2d').getImageData(432,850,1,1).data]).toEqual([0,0,255,255]);});
});
describe('on-device person mask correction',()=>{
 it('supports both foreground-only and background/person model outputs',()=>{expect(foregroundMask(['person'])).toBe('person');expect(foregroundMask(['background','person'])).toBe('person');expect(foregroundMask(undefined)).toBeUndefined();});
 it('smooths uncertain edges and preserves the original image alpha',()=>{expect(confidenceAlpha(.1)).toBe(0);expect(confidenceAlpha(.5)).toBe(128);expect(confidenceAlpha(.9)).toBe(255);const original=new Uint8ClampedArray([20,30,40,255,20,30,40,128]);expect([...applyMaskToPixels(original,new Uint8Array([0,128]))]).toEqual([20,30,40,0,20,30,40,64]);expect([...original]).toEqual([20,30,40,255,20,30,40,128]);});
 it('erases and restores a continuous brush stroke even between sparse pointer moves',()=>{const mask=new Uint8Array(100*100).fill(255);brushMask(mask,100,100,{x:10,y:50},{x:90,y:50},6,false);expect(mask[50*100+50]).toBe(0);expect(mask[20*100+50]).toBe(255);brushMask(mask,100,100,{x:10,y:50},{x:90,y:50},6,true);expect(mask[50*100+50]).toBe(255);});
 it('trims transparent borders and refuses an entirely erased portrait',()=>{const mask=new Uint8Array(100);mask[5*10+5]=255;expect(alphaBounds(mask,10,10)).toEqual({x:2,y:2,width:7,height:7});expect(()=>alphaBounds(new Uint8Array(100),10,10)).toThrow('人物が残っていません');});
 it('stops every camera track when leaving capture',()=>{const first={stop:vi.fn()},second={stop:vi.fn()};stopCamera({getTracks:()=>[first,second]} as unknown as Pick<MediaStream,'getTracks'>);expect(first.stop).toHaveBeenCalledOnce();expect(second.stop).toHaveBeenCalledOnce();expect(()=>stopCamera(null)).not.toThrow();});
});
