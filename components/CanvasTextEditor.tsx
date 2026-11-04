'use client';
import {useRef,useState,useEffect} from 'react';
import type {SlideAsset} from '@/lib/schema';
import type {RenderReport,TextRegion} from '@/lib/render';
import {resizeTextRegion,type Placement,type ResizeHandle} from '@/lib/text-resize';
export default function CanvasTextEditor({index,asset,report,onMove}:{index:number;asset:SlideAsset;report:RenderReport|null;onMove:(p:NonNullable<SlideAsset['textPlacements']>)=>void}){
  const area=useRef<HTMLDivElement>(null),drag=useRef<{pointer:number;x:number;y:number;r:TextRegion;offset:Placement;moved:boolean;corner?:ResizeHandle}|undefined>(undefined);
  const [active,setActive]=useState<string|null>(null);
  useEffect(()=>{setActive(null);drag.current=undefined;},[index]);
  useEffect(()=>{
    const deselect=(event:PointerEvent)=>{if(event.target instanceof Node&&!area.current?.contains(event.target))setActive(null);};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setActive(null);drag.current=undefined;}};
    document.addEventListener('pointerdown',deselect);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',deselect);document.removeEventListener('keydown',escape);};
  },[]);
  if(!report)return null;
  function move(r:TextRegion,x:number,y:number){
    const old=asset.textPlacements?.[r.id]||{x:0,y:0};
    const clampedX=Math.max(0,Math.min(report!.width-r.width,r.x+x)),clampedY=Math.max(0,Math.min(report!.height-r.height,r.y+y));
    onMove({...asset.textPlacements,[r.id]:{...old,x:old.x+(clampedX-r.x)/report!.width,y:old.y+(clampedY-r.y)/report!.height}});
  }
  return <div className="direct-text-overlay" ref={area}>
    {report.textRegions?.filter(r=>r.target).map((r,i)=><div key={r.id} className={`direct-text-frame ${active===r.id?'active':''}`} style={{left:`${r.x/report.width*100}%`,top:`${r.y/report.height*100}%`,width:`${r.width/report.width*100}%`,height:`${r.height/report.height*100}%`}}
      onPointerMove={e=>{const d=drag.current,rect=area.current?.getBoundingClientRect();if(!d||e.pointerId!==d.pointer||!rect)return;const dx=(e.clientX-d.x)/rect.width*report.width,dy=(e.clientY-d.y)/rect.height*report.height;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)<3&&!d.moved)return;d.moved=true;
        if(d.corner){onMove({...asset.textPlacements,[d.r.id]:resizeTextRegion(d.r,report,d.offset,dx,dy,d.corner)});return;}
        const nx=Math.max(0,Math.min(report.width-d.r.width,d.r.x+dx)),ny=Math.max(0,Math.min(report.height-d.r.height,d.r.y+dy));
        onMove({...asset.textPlacements,[d.r.id]:{...d.offset,x:d.offset.x+(nx-d.r.x)/report.width,y:d.offset.y+(ny-d.r.y)/report.height}});
      }}
      onPointerUp={()=>{drag.current=undefined;}} onPointerCancel={()=>{drag.current=undefined;}}>
      <button type="button" className="direct-text-hit" aria-label={`文字枠を選択・移動: ${r.text.slice(0,24)}`} aria-pressed={active===r.id} title="クリック・タップで選択、ドラッグで移動。四隅を斜めに、辺はどこでもドラッグして大きさを変更。"
        onFocus={()=>setActive(r.id)}
        onPointerDown={e=>{if(e.button!==0)return;setActive(r.id);e.currentTarget.setPointerCapture(e.pointerId);drag.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,r,offset:asset.textPlacements?.[r.id]||{x:0,y:0},moved:false};}}
        onClick={()=>setActive(r.id)}
        onKeyDown={e=>{const delta={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[e.key];if(delta){e.preventDefault();move(r,delta[0],delta[1]);}}}/>
      {(['nw','ne','sw','se','n','s','w','e'] as const).map((corner,n)=><button key={corner} type="button" className={`direct-resize-handle handle-${corner}`} aria-label={`${i+1}番目の文字枠を${['左上','右上','左下','右下','上辺','下辺','左辺','右辺'][n]}からサイズ変更`} title="ドラッグで枠のサイズを変更。矢印キーでも調整できます。"
        onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();setActive(r.id);e.currentTarget.setPointerCapture(e.pointerId);drag.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,r,offset:asset.textPlacements?.[r.id]||{x:0,y:0},moved:false,corner};}}
        onFocus={()=>setActive(r.id)}
        onKeyDown={e=>{const delta={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[e.key];if(delta){e.preventDefault();onMove({...asset.textPlacements,[r.id]:resizeTextRegion(r,report,asset.textPlacements?.[r.id]||{x:0,y:0},delta[0],delta[1],corner)});}}}/>) }
    </div>)}

  </div>;
}
