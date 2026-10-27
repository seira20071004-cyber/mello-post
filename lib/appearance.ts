import {z} from 'zod';
import type {Input,SlideAsset} from './schema';
import {templates} from './templates';
export const appearanceSchema=z.object({
  writingMode:z.enum(['horizontal','vertical']).optional(),
  textFont:z.enum(['template','serif','sans']).optional(),
  textColor:z.union([z.enum(['dark','light']),z.string().regex(/^#[0-9a-fA-F]{6}$/)]).optional(),
  textSurface:z.enum(['soft','none']).optional(),
  textSurfaceOpacity:z.number().min(0).max(1).optional(),
});
export type Appearance=z.infer<typeof appearanceSchema>;
export const fontOptions={template:'デザインに合わせる',serif:'明朝体 — 上品・やわらかい',sans:'ゴシック体 — すっきり読みやすい'} as const;
export function fontFor(asset:SlideAsset,fallback:string){return asset.textFont==='serif'?'Noto Serif JP':asset.textFont==='sans'?'Noto Sans JP':fallback;}
export function colorFor(input:Pick<Input,'template'>,asset:SlideAsset){return asset.textColor==='light'?'#ffffff':asset.textColor&&/^#[0-9a-f]{6}$/i.test(asset.textColor)?asset.textColor:templates[input.template].ink;}
export function surfaceOpacity(asset:SlideAsset,narrative=false){return asset.textSurface==='none'?0:asset.textSurfaceOpacity??(narrative?(asset.textColor==='light'?.76:.92):1);}
export function appearancePatch(asset:SlideAsset):Appearance{return {writingMode:asset.writingMode,textFont:asset.textFont,textColor:asset.textColor,textSurface:asset.textSurface,textSurfaceOpacity:asset.textSurfaceOpacity};}

export function effectiveSurfaceOpacity(input:Pick<Input,'mode'>,asset:SlideAsset){if((input.mode==='comic'||input.mode==='quote')&&asset.textSurfaceOpacity===undefined&&asset.textSurface===undefined)return 0;return surfaceOpacity(asset,!['info','comparison'].includes(input.mode));}
