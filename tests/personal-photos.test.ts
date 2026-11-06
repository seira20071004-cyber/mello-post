import {describe,it,expect} from 'vitest';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {initialInput,inputSchema,validatePlan,validateEngagement} from '../lib/schema';
import {personalSample} from '../lib/personal-sample';
import {creationModes,modes,usesSharedBackground,pendingImageCalls} from '../lib/modes';
import {generationSchema} from '../lib/composition';
import {newSlideAsset} from '../lib/text-layout';
import {appearanceSchema} from '../lib/appearance';
import {newPhotoLayer,reactions} from '../lib/photo-layers';
import {drawSlide} from '../lib/render';
import {parseProject} from '../lib/projects';
import {editorPrompt,modeReviewPrompt} from '../lib/server/prompts';
const input={...initialInput,mode:'personal' as const,theme:personalSample.title};
const ctx=(canvas:{getContext(type:'2d'):unknown})=>canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
describe('personal mode and legacy story compatibility',()=>{
 it('offers six modes with the former second story as the current story',()=>{expect(creationModes).toHaveLength(6);expect(creationModes.some(([key])=>key==='story')).toBe(false);expect(modes.comic.name).toBe('物語');expect(inputSchema.parse({...initialInput,mode:'story',theme:'以前の物語'}).mode).toBe('story');});
 it('accepts and reviews personal copy without forcing emotional story endings',()=>{expect(generationSchema(input).safeParse(personalSample).success).toBe(true);expect(validatePlan(personalSample,input)).toEqual([]);expect(validateEngagement(personalSample,input)).toEqual([]);expect(editorPrompt(input)).toContain('定型のオチを強制しない');expect(modeReviewPrompt(input)).toContain('本人の話し言葉');expect(usesSharedBackground(input)).toBe(true);expect(pendingImageCalls(input,Array.from({length:6},()=>({})))).toBe(1);});
 it('retains uploaded photo geometry, transparency source and reaction layers in drafts',()=>{const photo=newPhotoLayer('photo','data:image/png;base64,dGVzdA==','写真',400,500,.8);const assets=personalSample.slides.map(()=>({...newSlideAsset(input,0),photoLayers:[photo,{...photo,id:'reaction',source:'/reactions/surprised.svg',mirrored:true}]}));const project=parseProject({version:2,id:'personal-test',createdAt:1,savedAt:1,revision:0,archived:false,input,plan:personalSample,assets,usage:{text:0,image:0,review:0,failed:0,inputTokens:0,outputTokens:0},isSample:true,phase:1,selected:0,tab:'text'});expect(project.assets).toEqual(assets);expect(appearanceSchema.safeParse({photoLayers:[{...photo,source:'https://untrusted.example/image.png'}]}).success).toBe(false);});
});
describe('uploaded photos and final image composition',()=>{
 it.each(['4:5','1:1','9:16'] as const)('keeps photos in the exported canvas at %s',ratio=>{const photo=createCanvas(100,100);photo.getContext('2d').fillStyle='#1234f0';photo.getContext('2d').fillRect(0,0,100,100);const canvas=createCanvas(1,1),asset={...newSlideAsset(input,0),photoLayers:[{id:'photo',label:'写真',source:'data:image/png;base64,dGVzdA==',x:.2,y:.6,width:.3,height:.2}]};const report=drawSlide(ctx(canvas),personalSample,{...input,aspectRatio:ratio},0,asset,undefined,undefined,[photo as unknown as CanvasImageSource]);const pixel=canvas.getContext('2d').getImageData(Math.round(report.width*.3),Math.round(report.height*.7),1,1).data;expect([...pixel]).toEqual([18,52,240,255]);expect(report.warnings).toEqual([]);});
 it('mirrors the actual output image rather than only its editing outline',()=>{const source=createCanvas(20,10),canvas=createCanvas(1,1);source.getContext('2d').fillStyle='red';source.getContext('2d').fillRect(0,0,10,10);source.getContext('2d').fillStyle='blue';source.getContext('2d').fillRect(10,0,10,10);drawSlide(ctx(canvas),personalSample,input,0,{...newSlideAsset(input,0),photoLayers:[{id:'p',label:'写真',source:'data:image/png;base64,dGVzdA==',x:0,y:.6,width:.4,height:.2,mirrored:true}]},undefined,undefined,[source as unknown as CanvasImageSource]);expect(canvas.getContext('2d').getImageData(30,850,1,1).data[2]).toBe(255);});
 it.each(reactions)('loads the $name effect with transparent background support',async effect=>{const image=await loadImage(`public/reactions/${effect.id}.svg`);expect(image.width).toBe(240);expect(image.height).toBe(200);const photo=newPhotoLayer('effect',`/reactions/${effect.id}.svg`,effect.name,240,200,.8);expect(appearanceSchema.safeParse({photoLayers:[photo]}).success).toBe(true);});
 it('loads the bundled original SVG reactions for final image export',async()=>{const image=await loadImage('public/reactions/surprised.svg');expect(image.width).toBe(192);expect(image.height).toBe(176);});
});
