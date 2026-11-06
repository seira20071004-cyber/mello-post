import {z} from 'zod';
import {photoLayerSchema} from './photo-layers';
import type {Input,SlideAsset} from './schema';
import {templates} from './templates';
export const extraTextBoxSchema=z.object({id:z.string().regex(/^[a-zA-Z0-9-]{1,64}$/),text:z.string().max(300),x:z.number().min(0).max(1),y:z.number().min(0).max(1),width:z.number().min(.12).max(1),height:z.number().min(.045).max(1),fontSize:z.number().min(20).max(160)});
export const appearanceSchema=z.object({
  photoLayers:z.array(photoLayerSchema).max(8).optional(),
  extraTextBoxes:z.array(extraTextBoxSchema).max(30).optional(),
  textFormats:z.record(z.string(),z.object({text:z.string().max(2100),marks:z.array(z.object({start:z.number().int().min(0).max(2100),end:z.number().int().min(1).max(2100),bold:z.boolean().optional(),underline:z.boolean().optional(),color:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()})).max(2100)})).optional(),
  writingMode:z.enum(['horizontal','vertical']).optional(),
  textFont:z.enum(['template','serif','sans','rounded','handwritten','literary']).optional(),
  textColor:z.union([z.enum(['dark','light']),z.string().regex(/^#[0-9a-fA-F]{6}$/)]).optional(),
  textSurface:z.enum(['soft','none']).optional(),
  textSurfaceOpacity:z.number().min(0).max(1).optional(),
  textPlacements:z.record(z.string().regex(/^(text-\d+|box-[a-zA-Z0-9-]{1,64})$/),z.object({x:z.number().min(-1).max(1),y:z.number().min(-1).max(1),width:z.number().min(.12).max(1).optional(),height:z.number().min(.045).max(1).optional()})).optional(),
});
export type Appearance=z.infer<typeof appearanceSchema>;
export const fontOptions={template:'デザインに合わせる',serif:'明朝体 — 上品・やわらかい',sans:'ゴシック体 — すっきり読みやすい',rounded:'丸ゴシック — やさしい丸文字',handwritten:'手書き — 素朴な日記風',literary:'装飾明朝 — 絵本のような雰囲気'} as const;
export const fontFamilies={serif:'Noto Serif JP',sans:'Noto Sans JP',rounded:'Zen Maru Gothic',handwritten:'Yomogi',literary:'Kaisei Decol'} as const;
export function fontFor(asset:SlideAsset,fallback:string){return asset.textFont&&asset.textFont!=='template'?fontFamilies[asset.textFont]:fallback;}
export function colorFor(input:Pick<Input,'template'>,asset:SlideAsset){return asset.textColor==='light'?'#ffffff':asset.textColor&&/^#[0-9a-f]{6}$/i.test(asset.textColor)?asset.textColor:templates[input.template].ink;}
export function surfaceOpacity(asset:SlideAsset,narrative=false){return asset.textSurface==='none'?0:asset.textSurfaceOpacity??(narrative?(asset.textColor==='light'?.76:.92):1);}
export function appearancePatch(asset:SlideAsset):Appearance{return {writingMode:asset.writingMode,textFont:asset.textFont,textColor:asset.textColor,textSurface:asset.textSurface,textSurfaceOpacity:asset.textSurfaceOpacity};}

export function effectiveSurfaceOpacity(input:Pick<Input,'mode'>,asset:SlideAsset){if((input.mode==='comic'||input.mode==='quote')&&asset.textSurfaceOpacity===undefined&&asset.textSurface===undefined)return 0;return surfaceOpacity(asset,!['info','comparison'].includes(input.mode));}
