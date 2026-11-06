'use client';
import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {Minus,Plus,Scan} from 'lucide-react';

/** Zoom changes only the editing view; the canvas and export retain their original dimensions. */
export default function EditorViewport({ratio,children}:{ratio:number;children:ReactNode}){
  const viewport=useRef<HTMLDivElement>(null);
  const [bounds,setBounds]=useState({width:0,height:0}),[zoom,setZoom]=useState(100);
  const center=useRef<{x:number;y:number}|null>(null);
  useLayoutEffect(()=>{
    const element=viewport.current;if(!element)return;
    const observer=new ResizeObserver(([entry])=>setBounds({width:entry.contentRect.width,height:entry.contentRect.height}));
    observer.observe(element);return()=>observer.disconnect();
  },[]);
  useLayoutEffect(()=>{
    const element=viewport.current,point=center.current;if(!element||!point)return;
    element.scrollLeft=point.x*element.scrollWidth-element.clientWidth/2;
    element.scrollTop=point.y*element.scrollHeight-element.clientHeight/2;
    center.current=null;
  },[zoom]);
  function changeZoom(next:number){
    const element=viewport.current;
    if(element)center.current={x:(element.scrollLeft+element.clientWidth/2)/element.scrollWidth,y:(element.scrollTop+element.clientHeight/2)/element.scrollHeight};
    setZoom(Math.min(300,Math.max(50,next)));
  }
  const fit=Math.max(1,Math.min(bounds.width-48,(bounds.height-48)*ratio));
  const width=fit*zoom/100,height=width/ratio;
  return <>
    <div className="canvas-zoom-toolbar" data-text-tools role="toolbar" aria-label="スライドの表示倍率">
      <span className="zoom-help">ダブルクリックで文字を編集</span>
      <button type="button" className="icon-button" aria-label="スライドを縮小" disabled={zoom<=50} onClick={()=>changeZoom(zoom-25)}><Minus size={16}/></button>
      <input type="range" aria-label="スライドの表示倍率" aria-valuetext={`${zoom}%`} min="50" max="300" step="5" value={zoom} onChange={e=>changeZoom(Number(e.target.value))}/>
      <output aria-live="polite">{zoom}%</output>
      <button type="button" className="icon-button" aria-label="スライドを拡大" disabled={zoom>=300} onClick={()=>changeZoom(zoom+25)}><Plus size={16}/></button>
      <button type="button" className="button" onClick={()=>changeZoom(100)} title="スライド全体が収まる大きさに戻す"><Scan size={15}/>全体表示</button>
    </div>
    <div className="editor-viewport" ref={viewport} aria-label="スライド編集エリア" tabIndex={0}>
      <div className="zoom-surface" style={{width:width+48,height:height+48}}>
        <div className="position-stage" style={{width,height,visibility:bounds.width?'visible':'hidden'}}>{children}</div>
      </div>
    </div>
  </>;
}
