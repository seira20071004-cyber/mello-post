'use client';
import {useEffect,useRef,useState} from 'react';
import type {Input,Plan,SlideAsset} from '@/lib/schema';
import {renderCanvas} from '@/lib/render';
import {canvasSize} from '@/lib/formats';
export default function SlidePreview({plan,input,index,asset,className='',onWarning}:{plan:Plan;input:Input;index:number;asset:SlideAsset;className?:string;onWarning?:(message:string)=>void}) {
  const size=canvasSize(input);
  const ref=useRef<HTMLCanvasElement>(null);const [error,setError]=useState('');
  useEffect(()=>{let canceled=false;const offscreen=document.createElement('canvas');
    renderCanvas(offscreen,plan,input,index,asset).then(report=>{if(canceled || !ref.current)return;ref.current.width=offscreen.width;ref.current.height=offscreen.height;ref.current.getContext('2d')!.drawImage(offscreen,0,0);const message=report.warnings.join(' ');setError(message);onWarning?.(message);}).catch(()=>{if(!canceled)setError('プレビューを読み込めませんでした');});return()=>{canceled=true;};
  },[plan,input,index,asset,onWarning]);
  return <div className={`slide-preview ${className}`} style={{aspectRatio:`${size.width}/${size.height}`}}><canvas ref={ref} width={size.width} height={size.height} role="img" aria-label={`${index+1}枚目: ${plan.slides[index].title}`}/>{error&&<span className="canvas-error">{error}</span>}</div>;
}
