'use client';
import {useRef} from 'react';
import type {Input,SlideAsset,TextBox} from '@/lib/schema';
import {textBoxFor,clampTextBox} from '@/lib/text-layout';
export default function ReadingPosition({input,asset,cover,onChange}:{input:Input;asset:SlideAsset;cover:boolean;onChange:(box:TextBox)=>void}){
  const area=useRef<HTMLDivElement>(null),drag=useRef<{id:number;x:number;y:number;box:TextBox}|undefined>(undefined);
  const box=textBoxFor(input,asset,cover);
  return <div className="position-overlay" ref={area}>
    <div className="reading-handle" role="slider" aria-label="文字エリアの位置。矢印キーで移動" aria-valuemin={4} aria-valuemax={96} aria-valuenow={Math.round(box.y*100)} tabIndex={0}
      style={{left:`${box.x*100}%`,top:`${box.y*100}%`,width:`${box.width*100}%`,height:`${box.height*100}%`}}
      onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,box};}}
      onPointerMove={e=>{const d=drag.current,r=area.current?.getBoundingClientRect();if(!d||d.id!==e.pointerId||!r)return;onChange(clampTextBox({...d.box,x:d.box.x+(e.clientX-d.x)/r.width,y:d.box.y+(e.clientY-d.y)/r.height}));}}
      onPointerUp={()=>{drag.current=undefined;}} onPointerCancel={()=>{drag.current=undefined;}}
      onKeyDown={e=>{const offsets:Record<string,[number,number]>={ArrowUp:[0,-.01],ArrowDown:[0,.01],ArrowLeft:[-.01,0],ArrowRight:[.01,0]};const delta=offsets[e.key];if(delta){e.preventDefault();onChange(clampTextBox({...box,x:box.x+delta[0],y:box.y+delta[1]}));}}}>
      <span>文字エリアをドラッグ</span>
    </div>
  </div>;
}
