'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,ArrowRight,Sparkles,X} from 'lucide-react';
import {tutorialSteps,type TutorialStep} from '@/lib/tutorial';
import type {Input} from '@/lib/schema';
import styles from './StudioTutorial.module.css';
export default function StudioTutorial({step,mode,screen,disabled,onChange,onEnd}:{step:TutorialStep;mode:Input['mode'];screen:string;disabled:boolean;onChange:(direction:number)=>void;onEnd:()=>void}){
  const steps=tutorialSteps(mode),index=steps.findIndex(s=>s.id===step),hint=steps[index];
  const [slot,setSlot]=useState<Element|null>(null),heading=useRef<HTMLHeadingElement>(null);
  useLayoutEffect(()=>{
    const next=document.querySelector(`[data-guide-slot="${step}"]`),target=document.querySelector(`[data-guide-target="${step}"]`);
    const details=next?.closest('details');if(details)details.open=true;
    target?.setAttribute('data-guide-current','true');setSlot(next);
    return()=>{target?.removeAttribute('data-guide-current');};
  },[step,screen]);
  useEffect(()=>{const id=requestAnimationFrame(()=>{heading.current?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});heading.current?.focus({preventScroll:true});});return()=>cancelAnimationFrame(id);},[slot,step]);
  if(!hint)return null;
  const card=<section className={styles.card} aria-labelledby="tutorial-heading"><span className={styles.label}>STEP {index+1}{hint.optional?' · 任意':''}</span><h3 ref={heading} tabIndex={-1} id="tutorial-heading">{hint.title}</h3><p>{hint.body}</p><div className={styles.actions}>{index>0&&!hint.action&&step!=='library'&&step!=='edit'&&step!=='caption'&&<button type="button" className="button" disabled={disabled} onClick={()=>onChange(-1)}><ArrowLeft size={15}/>前の説明</button>}{step==='library'?<button type="button" className="button primary" onClick={onEnd}>mellōを活用しよう<ArrowRight size={16}/></button>:hint.action?<span className={styles.actionHint}>この説明のそばにある、実際の操作ボタンで進みます。</span>:<button type="button" className="button primary" disabled={disabled} onClick={()=>onChange(1)}>次へ<ArrowRight size={16}/></button>}</div></section>;
  return <><div className={styles.status}><span><Sparkles size={17}/>無料のチュートリアル <small>{index+1} / {steps.length} · AI生成は有料</small></span><button type="button" onClick={onEnd}><X size={16}/>案内を終了</button></div>{slot&&slot.isConnected?createPortal(card,slot):card}</>;
}
