'use client';
import type {Input,SlideAsset} from '@/lib/schema';
import {fontOptions,colorFor,surfaceOpacity,type Appearance} from '@/lib/appearance';
export default function AppearanceControls({input,asset,onChange,onApplyAll}:{input:Input;asset:SlideAsset;onChange:(patch:Appearance)=>void;onApplyAll:()=>void}){
  const opacity=surfaceOpacity(asset,input.mode!=='info'),transparency=Math.round((1-opacity)*100);
  return <div className="reading-settings appearance-controls">
    <div className="field"><label className="field-title" htmlFor="text-font">字体</label><select id="text-font" aria-label="字体" value={asset.textFont||'template'} onChange={e=>onChange({textFont:e.target.value as Appearance['textFont']})}>{Object.entries(fontOptions).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>
    <div className="field"><label className="field-title" htmlFor="text-color">文字の色</label><div className="color-field"><input id="text-color" aria-label="文字の色" type="color" value={colorFor(input,asset)} onChange={e=>onChange({textColor:e.target.value})}/><span>{colorFor(input,asset).toUpperCase()}</span><button className="button" type="button" onClick={()=>onChange({textColor:'dark'})}>標準色</button><button className="button" type="button" onClick={()=>onChange({textColor:'light'})}>白</button></div></div>
    <div className="field"><label className="field-title" htmlFor="text-transparency">文字背景の透明度 <span className="field-hint">{transparency}%</span></label><input id="text-transparency" aria-label="文字背景の透明度" type="range" min="0" max="100" step="1" value={transparency} onChange={e=>onChange({textSurface:'soft',textSurfaceOpacity:1-Number(e.target.value)/100})}/><small className="muted">0%は背景を濃く、100%は完全に透明にします。文字が読める濃さに調整してください。</small></div>
    <button className="button full" type="button" onClick={onApplyAll}>この文字設定を全ページに適用</button><small className="muted">字体・色・文字背景をまとめて変更します。画像の再生成・課金はありません。</small>
  </div>;
}
