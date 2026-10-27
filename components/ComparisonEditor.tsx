'use client';
import type {Input,ComparisonPair,SlideAsset} from '@/lib/schema';
import type {ComparisonPanel} from '@/lib/comparison';
export function ComparisonTextEditor({input,pair,onPairChange,onYearChange}:{input:Input;pair:ComparisonPair;onPairChange:(patch:Partial<ComparisonPair>)=>void;onYearChange:(key:'nowYear'|'futureYear',year:number)=>void}){
  return <div className="comparison-edit"><h3>{pair.place}</h3><p className="muted">人物を描かず、同じ場所の小物や部屋の変化を上下で見せます。説明文は空欄のままでも使えます。</p><div className="two-fields">
    <div className="field"><label className="field-title" htmlFor="edit-now-year">現在の年</label><input id="edit-now-year" type="number" min="1900" max="2200" value={input.nowYear} onChange={e=>onYearChange('nowYear',Number(e.target.value))}/></div>
    <div className="field"><label className="field-title" htmlFor="edit-future-year">未来の年</label><input id="edit-future-year" type="number" min={input.nowYear+1} max="2250" value={input.futureYear} onChange={e=>onYearChange('futureYear',Number(e.target.value))}/></div></div>
    <small className="muted">年表示の変更は無料です。絵の中の年代は、画像を再生成した時に反映されます。</small>
    <div className="field"><label className="field-title" htmlFor="now-caption">現在の短い説明（任意）</label><textarea id="now-caption" rows={2} maxLength={40} value={pair.nowCaption} onChange={e=>onPairChange({nowCaption:e.target.value})}/></div>
    <div className="field"><label className="field-title" htmlFor="future-caption">未来の短い説明（任意）</label><textarea id="future-caption" rows={2} maxLength={40} value={pair.futureCaption} onChange={e=>onPairChange({futureCaption:e.target.value})}/></div>
  </div>;
}
export function ComparisonImages({input,asset,onGenerate,onUpload,onRegeneratePair}:{input:Input;asset:SlideAsset;onGenerate:(panel:ComparisonPanel)=>void;onUpload:(file:File|undefined,panel:ComparisonPanel)=>void;onRegeneratePair:()=>void}){
 return <div className="editor-fields"><h3>現在と未来のイラスト</h3><p className="muted">未来は現在の絵を参考にして、同じ場所・画角で作ります。片方だけの再生成や、手持ち画像への差し替えもできます。</p>
 {(['now','future'] as const).map(panel=>{const future=panel==='future',image=future?asset.futureImage:asset.image,error=future?asset.futureError:asset.error,review=future?asset.futureReview:asset.review;return <section className="comparison-image-panel" key={panel}><strong>{future?input.futureYear:input.nowYear}年 · {future?'未来':'現在'}</strong>
 {image?<img className="background-preview" src={image} alt={`${future?'未来':'現在'}の背景イラスト`}/>:<div className="empty-image">{future?'未来の絵はまだありません':'現在の絵はまだありません'}</div>}
 {error&&<p className="error-banner" role="alert">{error}</p>}{review&&<div className="review-notes"><div><strong>この画像のAI点検</strong>{(review.unexpectedText||review.anatomyConcern||review.styleConcern)&&<p>文字・人物・画風に確認が必要です。</p>}{review.notes.map(note=><p key={note}>{note}</p>)}</div></div>}
 <button className="button full" type="button" disabled={future&&!asset.image} onClick={()=>onGenerate(panel)}>{future?'未来':'現在'}の画像{image?'だけ再生成':'を生成'}<small>有料・画像1枚</small></button>
 <label className="upload-zone compact"><span>{future?'未来':'現在'}の絵を手持ち画像に差し替える（無料）</span><input type="file" aria-label={`${future?'未来':'現在'}の背景画像アップロード`} accept="image/png,image/jpeg,image/webp" onChange={e=>onUpload(e.target.files?.[0],panel)}/></label>
 </section>;})}<button className="button full" type="button" onClick={onRegeneratePair}>この比較の内容・画像2枚を再生成<small>有料</small></button></div>;
}
