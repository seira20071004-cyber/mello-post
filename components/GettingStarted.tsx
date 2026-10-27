'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,Download,Flower2,Image,LoaderCircle,MessageSquareText,PencilLine,Sparkles,X} from 'lucide-react';
import {createPractice,rememberWelcome,shouldShowWelcome,practiceText,editPractice} from '@/lib/onboarding';
import {modes} from '@/lib/modes';
import {readingBodyLimit,type Input} from '@/lib/schema';
import {pngBlob} from '@/lib/render';
import {download} from '@/lib/drafts';
import SlidePreview from './SlidePreview';
import styles from './GettingStarted.module.css';

const steps=['テーマを選ぶ','文章を直す','画像を保存する'];
export default function GettingStarted({launch=0}:{launch?:number}){
  const [open,setOpen]=useState(false),[step,setStep]=useState(-1),[practice,setPractice]=useState(()=>createPractice());
  const [saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState(''),[warning,setWarning]=useState('');
  const dialog=useRef<HTMLDialogElement>(null),heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{try{if(shouldShowWelcome(window.localStorage))setOpen(true);}catch{setOpen(true);}},[]);
  useEffect(()=>{if(launch){setPractice(createPractice());setStep(-1);setSaved(false);setError('');setWarning('');setOpen(true);}},[launch]);
  useEffect(()=>{if(open){if(!dialog.current?.open)dialog.current?.showModal();}else dialog.current?.close();},[open]);
  useEffect(()=>{if(open&&step>=0)heading.current?.focus();},[step,open]);
  function close(){try{rememberWelcome(window.localStorage);}catch{/* No storage access is required to use the studio. */}setOpen(false);}
  function chooseMode(mode:Input['mode']){setPractice(createPractice(mode));setSaved(false);setWarning('');setError('');}
  function next(){setError('');setStep(s=>Math.min(2,s+1));}
  async function saveSample(){
    setSaving(true);setError('');
    try{download(await pngBlob(practice.plan,practice.input,1,practice.assets[1]),'mello-tutorial.png');setSaved(true);}
    catch{setError('画像を保存できませんでした。文章を短くして、もう一度お試しください。');}
    finally{setSaving(false);}
  }
  const text=practiceText(practice);
  const limit=practice.input.mode==='comparison'?40:practice.input.mode==='info'?60:readingBodyLimit(practice.input);
  const practicePreview=<div className={styles.preview}><SlidePreview input={practice.input} plan={practice.plan} index={step===0?0:1} asset={practice.assets[step===0?0:1]} onWarning={setWarning}/><span>練習用サンプル · {step===0?'表紙':'２枚目'}</span></div>;
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="getting-started-title" onCancel={e=>{e.preventDefault();if(!saving)close();}}>
    {open&&<><header className={styles.header}><span><Flower2 size={21} strokeWidth={1.4}/>mellō の使い方</span><button className="icon-button" aria-label="使い方を閉じる" disabled={saving} onClick={close}><X size={21}/></button></header>
      {step<0?<><div className={styles.welcome}>
        <div><span className={styles.eyebrow}>はじめまして、mellōです</span><h2 id="getting-started-title">あなたの想いを、<br/>投稿にするお手伝い。</h2><p className={styles.lead}>テーマや伝えたいことから、Instagramの<br className={styles.desktopBreak}/>投稿画像とキャプションをつくるアプリです。</p>
          <ul className={styles.outputs}><li><Image size={18}/>１枚ずつ保存できる投稿画像</li><li><MessageSquareText size={18}/>投稿に添えるキャプション</li><li><PencilLine size={18}/>あとから自由に直せる文章とデザイン</li></ul>
          <p className={styles.invitation}>まずはサンプルで、操作を試してみませんか？<br/>サンプルの練習は無料です。途中でも閉じられます。</p><p className={styles.invitation}>本番のAI生成にはAPI利用料がかかります。</p></div>
        <aside className={styles.welcomeArt}><div className={styles.sampleBadge}>こんな投稿がつくれます</div><SlidePreview input={practice.input} plan={practice.plan} index={0} asset={practice.assets[0]}/><span>画像と文章は練習用のサンプルです</span></aside>
      </div><footer className={styles.footer}><button className="button" onClick={close}>説明をスキップ</button><button className="button primary" onClick={next}><Sparkles size={17}/>無料で操作を試す<ArrowRight size={17}/></button></footer></>:<>
        <ol className={styles.steps} aria-label="チュートリアルの手順">{steps.map((label,i)=><li key={label} aria-current={step===i?'step':undefined} className={step===i?styles.current:step>i?styles.completed:''}><span>{step>i?<Check size={14}/>:i+1}</span>{label}</li>)}</ol>
        <div className={styles.practice}>
          <section className={styles.instructions}><span className={styles.free}>練習中 · API料金なし</span>
            <h2 ref={heading} tabIndex={-1} id="getting-started-title">{step===0?'まず、テーマと表現を選びます。':step===1?'文章は、あとから直せます。':'できあがった画像を保存します。'}</h2>
            {step===0?<><p>本番では「どんな投稿にしたいか」を短く入力し、モードを選びます。練習したい表現を選んでみましょう。</p><label className={styles.field}>練習するモード<select aria-label="練習するモード" value={practice.input.mode} onChange={e=>chooseMode(e.target.value as Input['mode'])}>{Object.entries(modes).map(([value,mode])=><option key={value} value={value}>{mode.name}</option>)}</select></label><p className={styles.modeDescription}>{modes[practice.input.mode].description}</p><div className={styles.theme}><span>今回のサンプルテーマ</span><strong>{practice.input.theme}</strong></div><p className={styles.note}>この練習では、用意した文章と画像を使います。実際の投稿は、テーマに合わせてAIが文章を考えます。</p></>:step===1?<><p>{practice.input.mode==='comparison'?'いまの画像に添える短い説明を変えてみてください。プレビューにも反映されます。':'下の文章を少し変えてみてください。プレビューにも反映されます。気に入るまで、何度直しても大丈夫です。'}</p><label className={styles.field}>練習用の本文<textarea aria-label="練習用の本文" rows={4} maxLength={limit} value={text} onChange={e=>{setSaved(false);setPractice(p=>editPractice(p,e.target.value));}}/></label><span className={styles.count}>{text.length} / {limit}文字</span><div className={styles.tip}><PencilLine size={18}/><p>本番の背景は、文章を確認してから生成します。字体・色・文字背景・位置の編集は無料です。</p></div></>:<><p>練習した２枚目を、実際にPNG画像として保存してみましょう。保存先は端末のダウンロード先です。</p><button className={`button primary ${styles.save}`} disabled={saving||!!warning||!text.trim()} onClick={()=>void saveSample()}>{saving?<LoaderCircle size={18} className="spin"/>:saved?<Check size={18}/>:<Download size={18}/>} {saving?'画像を準備しています…':saved?'もう一度サンプルPNGを保存':'サンプルPNGを保存する'}</button>{saved&&<p role="status" className={styles.success}>保存しました！これが１枚の投稿画像になります。</p>}<div className={styles.tip}><Download size={18}/><p>本番では「全スライドをZIPで保存」で、投稿画像とキャプションをまとめて保存できます。Instagramへの投稿はご自身で行います。</p></div><p className={styles.note}>投稿の途中は「マイスタジオ」に自動保存。あとで続きを編集できます。</p></>}
            {(error||warning)&&<p role="alert" className={styles.error}>{error||warning}</p>}
          </section>{practicePreview}
        </div><div className={styles.practiceNote}>練習で変更した文章は、編集中の投稿やマイスタジオには保存されません。</div>
        <footer className={styles.footer}><button className="button" disabled={saving} onClick={()=>setStep(s=>s-1)}><ArrowLeft size={16}/>戻る</button>{step<2?<button className="button primary" disabled={saving||(step===1&&(!text.trim()||!!warning))} onClick={next}>{step===0?'このサンプルで練習する':'保存を試す'}<ArrowRight size={17}/></button>:<button className="button primary" disabled={saving} onClick={close}>スタジオを使ってみる<ArrowRight size={17}/></button>}</footer>
      </>}
    </>}
  </dialog>;
}
