'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Flower2,MessageSquareText,PencilLine,Sparkles,X} from 'lucide-react';
import {rememberWelcome,shouldShowWelcome} from '@/lib/onboarding';
import styles from './GettingStarted.module.css';
export default function GettingStarted({launch=0,onStart,disabled=false}:{launch?:number;onStart:()=>Promise<boolean>;disabled?:boolean}){
  const [open,setOpen]=useState(false),[starting,setStarting]=useState(false),[error,setError]=useState(''),[example,setExample]=useState(0);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(shouldShowWelcome(window.localStorage))setOpen(true);},[]);
  useEffect(()=>{if(launch){setError('');setOpen(true);}},[launch]);
  useEffect(()=>{if(open){if(!dialog.current?.open)dialog.current?.showModal();}else dialog.current?.close();},[open]);
  function close(){rememberWelcome(window.localStorage);setOpen(false);}
  async function start(){setStarting(true);setError('');try{if(await onStart())close();else setError('編集中の投稿を保存できませんでした。画面の保存状態を確認して、もう一度お試しください。');}catch{setError('チュートリアルを開けませんでした。もう一度お試しください。');}finally{setStarting(false);}}
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="getting-started-title" onCancel={e=>{e.preventDefault();if(!starting)close();}}>{open&&<>
    <header className={styles.header}><span><Flower2 size={21}/>mellō の使い方</span><button className="icon-button" aria-label="使い方を閉じる" disabled={starting} onClick={close}><X size={21}/></button></header>
    <div className={styles.welcome}><div><span className={styles.eyebrow}>はじめまして、mellōです</span><h2 id="getting-started-title">あなたの想いを、<br/>投稿にするお手伝い。</h2><p className={styles.lead}>テーマや伝えたいことから、Instagramの投稿画像とキャプションをつくるアプリです。</p>
      <ul className={styles.outputs}><li><MessageSquareText size={18}/>投稿に添えるキャプション</li><li><PencilLine size={18}/>あとから自由に直せる文章とデザイン</li></ul>
      <p className={styles.invitation}>実際の画面で、入力から保存まで順番にご案内します。<br/>今の投稿を保存してから、新しい投稿で始めます。</p><p className={styles.invitation}>案内は無料です。実際にAIで文章や画像を生成する際は、API利用料がかかります。途中でも案内を終了できます。</p>{error&&<p role="alert" className={styles.error}>{error}</p>}</div>
      <aside className={styles.welcomeArt}><div className={styles.sampleBadge}>こんな投稿が生成できます！</div><div className={styles.exampleTabs}>{['物語１','物語２'].map((name,i)=><button key={name} type="button" aria-pressed={example===i} onClick={()=>setExample(i)}>{name}</button>)}</div><img className={styles.exampleImage} src={example===0?'/examples/story-watercolor.png':'/examples/story-comic.png'} alt={example===0?'物語１のAI生成作例。親子の小さな幸せを描いた水彩の投稿':'物語２のAI生成作例。親子の日常を描いたゆるい漫画の投稿'} width={1080} height={1350}/><span>AIで背景を生成し、mellōで文字を載せた作例です</span></aside>
    </div><footer className={styles.footer}><button className="button" disabled={starting} onClick={close}>説明をスキップ</button><button className="button primary" disabled={disabled||starting} onClick={()=>void start()}><Sparkles size={17}/>{starting?'準備しています…':'無料のチュートリアル'}<ArrowRight size={17}/></button></footer>
  </>}</dialog>;
}
