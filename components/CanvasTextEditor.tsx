'use client';
import {useRef,useState,useEffect} from 'react';
import type {Input,Plan,SlideAsset} from '@/lib/schema';
import type {RenderReport,TextRegion} from '@/lib/render';
import {resizeTextRegion,type Placement,type ResizeHandle} from '@/lib/text-resize';
import {updateDirectText,directTextLimit} from '@/lib/direct-text';
import {fontFor,colorFor} from '@/lib/appearance';
import {textFormatKey,rebaseMarks,toggleMark,rangeMarked} from '@/lib/rich-text';
import {templates} from '@/lib/templates';
export default function CanvasTextEditor({plan,input,index,asset,report,onPlan,onMove,onYear,onFormat}:{plan:Plan;input:Input;index:number;asset:SlideAsset;report:RenderReport|null;onPlan:(p:Plan)=>void;onMove:(p:NonNullable<SlideAsset['textPlacements']>)=>void;onYear:(key:'nowYear'|'futureYear',value:number)=>void;onFormat:(formats:NonNullable<SlideAsset['textFormats']>)=>void}){
  const area=useRef<HTMLDivElement>(null),drag=useRef<{pointer:number;x:number;y:number;r:TextRegion;offset:Placement;moved:boolean;corner?:ResizeHandle}|undefined>(undefined);
  const editor=useRef<HTMLTextAreaElement>(null);
  const [selection,setSelection]=useState({start:0,end:0});
  const [active,setActive]=useState<string|null>(null);
  const [editing,setEditing]=useState<{region:TextRegion;text:string;fontSize:number}|null>(null);
  useEffect(()=>{setActive(null);setEditing(null);drag.current=undefined;},[index]);
  useEffect(()=>{
    const deselect=(event:PointerEvent)=>{if(event.target instanceof Node&&!area.current?.contains(event.target)){setActive(null);setEditing(null);}};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.isComposing){setActive(null);setEditing(null);drag.current=undefined;}};
    document.addEventListener('pointerdown',deselect);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',deselect);document.removeEventListener('keydown',escape);};
  },[]);
  if(!report)return null;
  function startEditing(r:TextRegion){
    if(!r.target)return;
    drag.current=undefined;setActive(r.id);setSelection({start:0,end:0});
    setEditing({region:r,text:r.text,fontSize:Math.max(12,(r.fontSize||report!.minFontSize)*(area.current?.getBoundingClientRect().width||300)/report!.width)});
  }
  function formatSelection(key:'bold'|'underline'){
    if(!editing?.region.target||selection.start===selection.end)return;
    const id=textFormatKey(editing.region.target);onFormat({...asset.textFormats,[id]:toggleMark(asset.textFormats?.[id],editing.text,selection.start,selection.end,key)});
    requestAnimationFrame(()=>{editor.current?.focus({preventScroll:true});editor.current?.setSelectionRange(selection.start,selection.end);});
  }
  const selectedMarks=editing?.region.target?rebaseMarks(asset.textFormats?.[textFormatKey(editing.region.target)],editing.text):[];
  function move(r:TextRegion,x:number,y:number){
    const old=asset.textPlacements?.[r.id]||{x:0,y:0};
    const clampedX=Math.max(0,Math.min(report!.width-r.width,r.x+x)),clampedY=Math.max(0,Math.min(report!.height-r.height,r.y+y));
    onMove({...asset.textPlacements,[r.id]:{...old,x:old.x+(clampedX-r.x)/report!.width,y:old.y+(clampedY-r.y)/report!.height}});
  }
  return <div className="direct-text-overlay" ref={area}>
    {report.textRegions?.filter(r=>r.target).map((r,i)=><div key={r.id} className={`direct-text-frame ${active===r.id?'active':''} ${editing?.region.id===r.id?'editing':''}`} style={{left:`${r.x/report.width*100}%`,top:`${r.y/report.height*100}%`,width:`${r.width/report.width*100}%`,height:`${r.height/report.height*100}%`}}
      onPointerMove={e=>{const d=drag.current,rect=area.current?.getBoundingClientRect();if(!d||e.pointerId!==d.pointer||!rect)return;const dx=(e.clientX-d.x)/rect.width*report.width,dy=(e.clientY-d.y)/rect.height*report.height;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)<3&&!d.moved)return;d.moved=true;
        if(d.corner){onMove({...asset.textPlacements,[d.r.id]:resizeTextRegion(d.r,report,d.offset,dx,dy,d.corner)});return;}
        const nx=Math.max(0,Math.min(report.width-d.r.width,d.r.x+dx)),ny=Math.max(0,Math.min(report.height-d.r.height,d.r.y+dy));
        onMove({...asset.textPlacements,[d.r.id]:{...d.offset,x:d.offset.x+(nx-d.r.x)/report.width,y:d.offset.y+(ny-d.r.y)/report.height}});
      }}
      onPointerUp={()=>{drag.current=undefined;}} onPointerCancel={()=>{drag.current=undefined;}}>
      <button type="button" className="direct-text-hit" aria-label={`文字枠を選択・移動: ${r.text.slice(0,24)}`} aria-pressed={active===r.id} title="クリックで選択、ダブルクリックで文字を編集。ドラッグで移動。四隅を斜めに、辺はどこでもドラッグして大きさを変更。"
        onFocus={()=>setActive(r.id)}
        onPointerDown={e=>{if(e.button!==0)return;setActive(r.id);e.currentTarget.setPointerCapture(e.pointerId);drag.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,r,offset:asset.textPlacements?.[r.id]||{x:0,y:0},moved:false};}}
        onClick={()=>setActive(r.id)}
        onDoubleClick={()=>startEditing(r)}
        onKeyDown={e=>{if(e.key==='Enter'||e.key==='F2'){e.preventDefault();startEditing(r);return;}const delta={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[e.key];if(delta){e.preventDefault();move(r,delta[0],delta[1]);}}}/>
      {(['nw','ne','sw','se','n','s','w','e'] as const).map((corner,n)=><button key={corner} type="button" className={`direct-resize-handle handle-${corner}`} aria-label={`${i+1}番目の文字枠を${['左上','右上','左下','右下','上辺','下辺','左辺','右辺'][n]}からサイズ変更`} title="ドラッグで枠のサイズを変更。矢印キーでも調整できます。"
        onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();setActive(r.id);e.currentTarget.setPointerCapture(e.pointerId);drag.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,r,offset:asset.textPlacements?.[r.id]||{x:0,y:0},moved:false,corner};}}
        onFocus={()=>setActive(r.id)}
        onKeyDown={e=>{const delta={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[e.key];if(delta){e.preventDefault();onMove({...asset.textPlacements,[r.id]:resizeTextRegion(r,report,asset.textPlacements?.[r.id]||{x:0,y:0},delta[0],delta[1],corner)});}}}/>) }
    </div>)}

    {editing?.region.target&&<><div className="direct-format-toolbar" role="toolbar" aria-label="選択した文字の書式">
      <button type="button" aria-label="選択範囲を太字" aria-pressed={rangeMarked(selectedMarks,selection.start,selection.end,'bold')} disabled={selection.start===selection.end} onPointerDown={e=>e.preventDefault()} onClick={()=>formatSelection('bold')}><strong>B</strong><span>太字</span></button>
      <button type="button" aria-label="選択範囲に下線" aria-pressed={rangeMarked(selectedMarks,selection.start,selection.end,'underline')} disabled={selection.start===selection.end} onPointerDown={e=>e.preventDefault()} onClick={()=>formatSelection('underline')}><u>U</u><span>下線</span></button><small>{selection.start===selection.end?'文字をなぞって選択':'選んだ部分だけに適用'}</small>
      <button type="button" onPointerDown={e=>e.preventDefault()} onClick={()=>setEditing(null)}>完了</button>
    </div><textarea ref={editor} className="direct-inline-editor" aria-label="スライド上の文字を編集" autoFocus
      style={{left:`${editing.region.x/report.width*100}%`,top:`${editing.region.y/report.height*100}%`,width:`${editing.region.width/report.width*100}%`,height:`${editing.region.height/report.height*100}%`,fontSize:editing.fontSize,fontFamily:`"${editing.region.fontFamily||fontFor(asset,templates[input.template].font)}"`,fontWeight:editing.region.fontWeight||400,lineHeight:editing.region.lineHeight||1.75,color:'transparent',caretColor:colorFor(input,asset),textAlign:asset.textAlign||'left',writingMode:(asset.writingMode||((input.mode==='comic'&&index>0)?'vertical':'horizontal'))==='vertical'?'vertical-rl':'horizontal-tb'}}
      value={editing.text} maxLength={directTextLimit(editing.region.target,input)}
      onChange={e=>{const text=e.target.value,target=editing.region.target!;setEditing({...editing,text});if(target.kind!=='year'){const id=textFormatKey(target),current=asset.textFormats?.[id];if(current)onFormat({...asset.textFormats,[id]:{text,marks:rebaseMarks(current,text)}});}if(target.kind==='year'){const n=Number(text);if(/^\d{4}$/.test(text)&&n>=(target.key==='nowYear'?1900:1901)&&n<=(target.key==='nowYear'?2200:2250))onYear(target.key,n);}else onPlan(updateDirectText(plan,index,target,text));}}
      onSelect={e=>setSelection({start:e.currentTarget.selectionStart,end:e.currentTarget.selectionEnd})} onBlur={e=>{if(!e.relatedTarget||!area.current?.contains(e.relatedTarget as Node))setEditing(null);}} onKeyDown={e=>{if(!e.nativeEvent.isComposing&&(e.ctrlKey||e.metaKey)&&['b','u'].includes(e.key.toLowerCase())){e.preventDefault();formatSelection(e.key.toLowerCase()==='b'?'bold':'underline');return;}if(!e.nativeEvent.isComposing&&e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();setEditing(null);}}}/></>}

  </div>;
}
