'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,ArrowLeft,ArrowUpRight,Check,ChevronDown,ChevronRight,Copy,Download,Flower2,HelpCircle,ImagePlus,Layers,Leaf,LoaderCircle,Palette,Plus,RefreshCw,Settings2,ShieldCheck,Sparkles,Type,Upload,X,ZoomIn,FileText,Bookmark,CheckCircle2,AlertCircle,LockKeyhole} from 'lucide-react';
import JSZip from 'jszip';
import {emptyUsage,initialInput,inputSchema,inputIssues,validatePlan,type Input,type Plan,type Usage,type SlideAsset} from '@/lib/schema';
import {templates} from '@/lib/templates';
import {samplePlan} from '@/lib/sample';
import {download,prepareUpload} from '@/lib/drafts';
import {pngBlob} from '@/lib/render';
import SlidePreview from './SlidePreview';
import ProjectLibrary from './ProjectLibrary';
import {readProject,setProjectArchived,type ProjectContent} from '@/lib/projects';
import {useProjects} from '@/lib/use-projects';

type Config={configured:boolean;passwordRequired:boolean;text:string;image:string;imageEstimateUSD:number|null};
const freshAssets=(count:number):SlideAsset[]=>Array.from({length:count},()=>({fontScale:1}));
const previewInput:Input={...initialInput,theme:samplePlan.title};
const previewAsset:SlideAsset={fontScale:1,sample:true};
const examples=['40代女性が知っておきたい美容習慣5選','心地よい暮らしをつくる小さな習慣','大人の春コーデ、着こなしのコツ'];
function Button({children,className='',...props}:React.ButtonHTMLAttributes<HTMLButtonElement>){return <button className={`button ${className}`} {...props}>{children}</button>;}
function Field({label,hint,children,required=false}:{label:string;hint?:string;children:React.ReactNode;required?:boolean}){return <div className="field"><div className="field-title">{label}{required&&<span className="required">必須</span>}{hint&&<span className="field-hint">{hint}</span>}</div>{children}</div>;}

export default function Studio(){
  const [input,setInput]=useState<Input>(initialInput),[plan,setPlan]=useState<Plan|null>(null),[assets,setAssets]=useState<SlideAsset[]>([]);
  const [phase,setPhase]=useState(0),[selected,setSelected]=useState(0),[tab,setTab]=useState<'text'|'image'>('text');
  const [reference,setReference]=useState<string>(),[usage,setUsage]=useState<Usage>(emptyUsage),[config,setConfig]=useState<Config|null>(null);
  const [busy,setBusy]=useState(''),[progress,setProgress]=useState({done:0,total:0}),[error,setError]=useState(''),[toast,setToast]=useState('');
  const [isSample,setIsSample]=useState(false),[password,setPassword]=useState('');
  const [view,setView]=useState<'editor'|'library'>('editor'),[switching,setSwitching]=useState(false);
  const projectContent=useMemo<ProjectContent>(()=>({input,plan,assets,usage,reference,isSample,phase,selected,tab}),[input,plan,assets,usage,reference,isSample,phase,selected,tab]);
  const library=useProjects(projectContent,view==='editor');
  const previous=library.projects.find(p=>!p.archived);
  const [help,setHelp]=useState(false),[zoom,setZoom]=useState(false),[exporting,setExporting]=useState(false);
  const lock=useRef(false),stop=useRef(false),top=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null),zoomDialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{fetch('/api/config').then(r=>r.json()).then(setConfig).catch(()=>setError('サーバーに接続できませんでした'));},[]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(t);},[toast]);
  useEffect(()=>{if(help)dialog.current?.showModal();else dialog.current?.close();},[help]);
  useEffect(()=>{if(zoom)zoomDialog.current?.showModal();else zoomDialog.current?.close();},[zoom]);
  const issues=plan?validatePlan(plan,input):[];
  const done=assets.filter(a=>a.image).length;
  const editable=!!plan&&!busy&&!exporting&&!switching;
  function patchInput<K extends keyof Input>(key:K,value:Input[K]){setInput(p=>({...p,[key]:value}));}
  function changeTemplate(value:Input['template']){setInput(p=>({...p,template:value,color:templates[value].accent}));}
  function move(next:number){setView('editor');setPhase(next);top.current?.scrollIntoView({behavior:'smooth'});}
  function account(u?:Usage){if(u)setUsage(prev=>Object.fromEntries(Object.keys(prev).map(k=>[k,prev[k as keyof Usage]+(u[k as keyof Usage]||0)])) as Usage);}
  async function api<T>(path:string,payload:object):Promise<T>{
    const response=await fetch(`/api/${path}`,{method:'POST',headers:{'Content-Type':'application/json','x-app-password':password},body:JSON.stringify({...payload,requestId:crypto.randomUUID()}),signal:AbortSignal.timeout(370000)});
    const data=await response.json();account(data.usage);if(!response.ok)throw new Error([data.error,...(data.details||[])].join(' / '));return data.result;
  }
  async function run(label:string,fn:()=>Promise<void>){if(lock.current)return;lock.current=true;stop.current=false;setError('');setBusy(label);try{await fn();}catch(e){setError(e instanceof Error?e.message:'処理に失敗しました');}finally{lock.current=false;setBusy('');setProgress({done:0,total:0});}}
  async function generatePlan(){
    const parsed=inputSchema.safeParse(input);if(!parsed.success){setError(parsed.error.issues[0].message);return;}
    const problems=inputIssues(input);if(problems.length){setError(problems.join(' / '));return;}
    await run('構成と文章を考え、日本語を校正しています',async()=>{const next=await api<Plan>('plan',{input,reference});setPlan(next);setAssets(freshAssets(next.slides.length));setIsSample(false);setSelected(0);move(1);});
  }
  async function showLibrary(){
    if(busy||exporting||switching)return;setSwitching(true);
    try{if(view==='editor'&&!await library.flush())return;await library.refresh();setView('library');setError('');top.current?.scrollIntoView({behavior:'smooth'});}catch(e){setError((e as Error).message);}finally{setSwitching(false);}
  }
  async function startNew(){
    if(busy||exporting||switching)return;setSwitching(true);
    try{if(view==='editor'&&!await library.flush())return;library.begin();setInput(initialInput);setPlan(null);setAssets([]);setUsage(emptyUsage());setReference(undefined);setIsSample(false);setSelected(0);setTab('text');setError('');move(0);}finally{setSwitching(false);}
  }
  async function openProject(id:string){
    if(busy||exporting||switching)return;setSwitching(true);
    try{if(view==='editor'&&!await library.flush())return;const p=await readProject(id);library.activate(p);setInput(p.input);setPlan(p.plan);setAssets(p.assets);setUsage(p.usage);setReference(p.reference);setIsSample(p.isSample);setSelected(Math.min(p.selected,Math.max(0,p.assets.length-1)));setTab(p.tab);setError('');move(p.plan?p.phase:0);}catch(e){setError((e as Error).message);}finally{setSwitching(false);}
  }
  async function archiveProject(id:string,archived:boolean){
    setSwitching(true);try{await setProjectArchived(id,archived);await library.refresh();if(library.activeId===id)library.begin();setToast(archived?'アーカイブに移動しました。いつでも元に戻せます。':'マイスタジオに戻しました。');}catch(e){setError((e as Error).message);}finally{setSwitching(false);}
  }
  async function loadSample(){
    if(!await library.flush())return;library.begin();setInput(previewInput);setPlan(structuredClone(samplePlan));setAssets(freshAssets(6).map(a=>({...a,sample:true})));setUsage(emptyUsage());setIsSample(true);setReference(undefined);setSelected(0);setError('');move(1);setToast('固定の操作サンプルを開きました。AI生成・課金は行っていません。');
  }
  function updateAsset(index:number,patch:Partial<SlideAsset>){setAssets(prev=>prev.map((a,i)=>i===index?{...a,...patch}:a));}
  async function imageFor(index:number,currentPlan:Plan,ref?:string){
    try{const result=await api<{image:string;review:SlideAsset['review']}>('image',{input,plan:currentPlan,index,reference:ref});updateAsset(index,{...result,error:undefined,sample:false});return result.image;}
    catch(e){const message=e instanceof Error?e.message:'画像生成に失敗しました';updateAsset(index,{error:message});return undefined;}
  }
  async function generateImages(indices:number[]){if(!plan || issues.length || !indices.length)return;
    await run('イラストを描いています',async()=>{setProgress({done:0,total:indices.length});let styleReference=reference || assets.find(a=>a.image)?.image;for(let n=0;n<indices.length;n++){if(stop.current)break;setBusy(`${indices[n]+1}枚目のイラストを生成・点検しています`);const image=await imageFor(indices[n],plan,styleReference);if(!styleReference&&image)styleReference=image;setProgress({done:n+1,total:indices.length});}setToast(stop.current?'処理を停止しました。完成した画像は保存されています。':'画像の処理が終わりました。各スライドを確認してください。');});
  }
  async function regenerateSlide(){if(!plan)return;await run(`${selected+1}枚目を作り直しています`,async()=>{const next=await api<Plan>('plan',{input,plan,index:selected});setPlan(next);await imageFor(selected,next,reference||assets.find(a=>a.image)?.image);});}
  function editSlide(key:'title'|'body'|'emphasis',value:string){setPlan(p=>p?{...p,slides:p.slides.map((s,i)=>i===selected?{...s,[key]:value}:s)}:p);}
  function editItem(id:number,key:'title'|'body',value:string){setPlan(p=>p?{...p,items:p.items.map(item=>item.id===id?{...item,[key]:value}:item)}:p);}
  async function upload(file:File|undefined,background=false){if(!file)return;await run('画像を読み込んでいます',async()=>{const image=await prepareUpload(file);if(background){updateAsset(selected,{image,error:undefined,review:undefined,sample:false});setToast('画像を差し替えました。API料金はかかりません。');}else setReference(image);});}
  async function exportImages(single?:number){if(!plan || issues.length)return;if(!isSample && (single!==undefined?!assets[single]?.image:done!==assets.length)){setError('未生成の背景があります。画像を生成するか、お手持ちの画像を設定してください。');return;}
    setExporting(true);setError('');try{if(single!==undefined){download(await pngBlob(plan,input,single,assets[single]),`mello-${String(single+1).padStart(2,'0')}.png`);}else{const zip=new JSZip();for(let i=0;i<plan.slides.length;i++)zip.file(`slide-${String(i+1).padStart(2,'0')}.png`,await pngBlob(plan,input,i,assets[i]));zip.file('caption.txt',plan.caption);zip.file('readme.txt',`${plan.title}\n${plan.slides.length} separate PNG images, 1080 x 1920 pixels each.\n${isSample?'Offline sample project; not AI-generated.':''}`);download(await zip.generateAsync({type:'blob',compression:'STORE'}),'mello-instagram.zip');}setToast(single!==undefined?'PNGを保存しました':'各スライドのPNGとキャプションをZIPにまとめました');}catch(e){setError((e as Error).message);}finally{setExporting(false);}}
  async function copyCaption(){if(!plan)return;try{await navigator.clipboard.writeText(plan.caption);setToast('キャプションをコピーしました');}catch{setError('コピーできませんでした。キャプションを選択してコピーしてください。');}}

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="mello ホーム"><span className="brand-icon"><Flower2 size={29} strokeWidth={1.25}/></span><span>mellō<span className="brand-dot">.</span></span></a>
      <div className="brand-caption">あなたらしさを、かたちに。</div>
      <div className="nav-label">WORKSPACE</div>
      <button className={`nav-item ${view==='editor'?'active':''}`} disabled={!!busy||exporting||switching||!library.ready} onClick={()=>void startNew()}><Sparkles size={19}/>投稿をつくる<Plus size={16}/></button>
      <button className={`nav-item ${view==='library'?'active':''}`} disabled={!!busy||exporting||switching||!library.ready} onClick={()=>void showLibrary()}><Layers size={19}/>マイスタジオ{library.projects.filter(p=>!p.archived).length>0&&<span className="nav-count">{library.projects.filter(p=>!p.archived).length}</span>}</button>
      <button className="nav-item" disabled={!!busy||exporting} onClick={async()=>{if(view==='library')await startNew();else move(0);setTimeout(()=>document.getElementById('designs')?.scrollIntoView({behavior:'smooth',block:'center'}),100);}}><Palette size={19}/>デザインを選ぶ</button>
      <div className="sidebar-bottom"><div className="sidebar-note"><Leaf size={21}/><strong>ひとつの想いから、<br/>広がるあなたの世界。</strong><p>言葉も、デザインも。<br/>mellōがそっとお手伝い。</p></div>
        <button className="nav-item" onClick={()=>setHelp(true)}><HelpCircle size={19}/>使い方ガイド<ArrowUpRight size={15}/></button>
        <div className="profile"><div className="avatar">M</div><div>マイワークスペース<small>プライベートスタジオ</small></div><Settings2 size={16}/></div>
      </div>
    </aside>
    <main className="main" ref={top}>
      <header className="topbar"><span className="breadcrumb">ワークスペース <ChevronRight size={14}/><strong>{view==='library'?'マイスタジオ':'投稿をつくる'}</strong></span><span className="top-status"><span className="status-dot"/>{view==='library'?'このブラウザに保存':library.status||'テーマを入力すると自動保存'}</span><button className="mobile-studio button" disabled={!!busy||exporting||switching||!library.ready} onClick={()=>void showLibrary()}><Layers size={16}/>マイスタジオ</button><button className="mobile-help icon-button" aria-label="使い方" onClick={()=>setHelp(true)}><HelpCircle size={21}/></button></header>
      <div className="content">
        {view==='editor'&&<section className={`intro ${phase?'intro-compact':''}`}><div><div className="eyebrow"><span/> YOUR IDEAS, BEAUTIFULLY TOLD</div><h1>{phase===0?<>伝えたい想いを、<br/><em>美しい投稿に。</em></>:phase===1?<>あなたらしく、<em>仕上げましょう。</em></>:<>できあがった想いを、<em>届けましょう。</em></>}</h1><p>{phase===0?'テーマをひとつ。言葉も、イラストも、デザインも。':'文章の修正は何度でも。あなたの言葉を大切に。'}<br/>{phase===0?'あなたの「伝えたい」に、AIがそっと寄り添います。':'日本語の文字とイラストを、美しくひとつに。'}</p>{phase===0&&<div className="intro-meta"><span><Check size={14}/>日本語をきれいに</span><span><Check size={14}/>統一感のあるデザイン</span><span><Check size={14}/>PNGでそのまま保存</span></div>}</div>
        {phase===0&&<div className="hero-art" aria-label="テンプレートの作例"><span className="floating-sparkle">✧</span><div className="hero-card card-left"><SlidePreview plan={samplePlan} input={{...previewInput,template:'leaf',color:templates.leaf.accent}} index={2} asset={previewAsset}/></div><div className="hero-card card-right"><SlidePreview plan={samplePlan} input={{...previewInput,template:'ink',color:templates.ink.accent}} index={5} asset={previewAsset}/></div><div className="hero-card card-center"><SlidePreview plan={samplePlan} input={previewInput} index={0} asset={previewAsset}/></div><span className="art-label"><Flower2 size={15}/>小さな想いが、素敵な一枚に。</span></div>}</section>}
        {view==='editor'&&<nav className="steps" aria-label="作成手順">{['テーマを入力','確認・編集する','ダウンロード'].map((label,i)=><button key={label} className={`step ${phase===i?'current':''} ${phase>i?'completed':''}`} disabled={i>0&&!plan || !!busy || exporting || switching} onClick={()=>move(i)}><span>{phase>i?<Check size={17}/>:String(i+1).padStart(2,'0')}</span>{label}{i<2&&<ChevronRight size={18}/>}</button>)}</nav>}
        {view==='editor'&&previous&&!plan&&!input.theme&&<div className="restore-banner"><Bookmark size={19}/><span>前回の投稿「{previous.title}」が保存されています。</span><button disabled={switching} onClick={()=>void openProject(previous.id)}>続きを開く <ArrowRight size={15}/></button></div>}
        {view==='editor'&&(input.theme.trim()||plan)&&<div className="save-project-bar"><span><Bookmark size={17}/>{library.status||'変更を保存します…'}</span><button className="button" disabled={!!busy||exporting||switching||!library.ready} onClick={()=>void showLibrary()}>{switching?<LoaderCircle size={16} className="spin"/>:<Layers size={16}/>}保存してマイスタジオへ<ArrowRight size={16}/></button></div>}
        {library.failure&&<div className="error-banner" role="alert"><AlertCircle size={20}/><span>{library.failure}</span><button className="button" disabled={switching} onClick={()=>void (library.ready?library.flush():library.refresh().catch(e=>setError((e as Error).message)))}>保存を再試行</button>{library.failure.includes('別のタブ')&&<button className="button" onClick={()=>void library.saveCopy()}>別セットとして保存</button>}</div>}
        {config?.passwordRequired&&<div className="password-bar"><LockKeyhole size={18}/><label htmlFor="password">スタジオの利用パスワード</label><input id="password" type="password" autoComplete="current-password" placeholder="サーバーで設定したパスワード" value={password} onChange={e=>setPassword(e.target.value)}/><small>この画面を閉じると消去されます</small></div>}
        {error&&<div className="error-banner" role="alert"><AlertCircle size={20}/><span>{error}</span><button className="icon-button" aria-label="エラーを閉じる" onClick={()=>setError('')}><X size={17}/></button></div>}
        {busy&&<div className="progress-panel" role="status" aria-live="polite"><LoaderCircle className="spin" size={24}/><div><strong>{busy}</strong><p>{progress.total?`${progress.done} / ${progress.total}枚 完了 · 1枚ずつ大切に作っています。`:'文章の構成と表現を確認しています。しばらくお待ちください。'}</p>{progress.total>0&&<progress value={progress.done} max={progress.total}/>}</div>{progress.total>0&&<Button onClick={()=>{stop.current=true;setToast('処理中の1枚が終わったら停止します');}}>この1枚で停止</Button>}</div>}

        {view==='library'&&<ProjectLibrary projects={library.projects} ready={library.ready} disabled={switching||!!busy||exporting} onOpen={id=>void openProject(id)} onNew={()=>void startNew()} onArchive={(id,archived)=>void archiveProject(id,archived)}/>}
        {view==='editor'&&phase===0&&<div className="create-grid"><section className="panel input-panel"><div className="panel-heading"><span className="section-number">01</span><div><h2>どんな投稿をつくりますか？</h2><p>思いついたことを、あなたの言葉で。</p></div><Sparkles className="soft-icon" size={23}/></div>
          <form onSubmit={e=>{e.preventDefault();void generatePlan();}}><fieldset disabled={!!busy||switching}>
          <Field label="投稿テーマ" required><textarea aria-label="投稿テーマ" className="theme-input" rows={3} maxLength={120} value={input.theme} onChange={e=>patchInput('theme',e.target.value)} placeholder={'例：40代女性が知っておきたい\n美容習慣5選'}/><div className="input-footer"><span>まずは、テーマだけでも大丈夫です。</span><span>{input.theme.length} / 120</span></div></Field>
          <div className="examples"><span>こんなテーマも</span>{examples.slice(1).map((text,i)=><button type="button" key={text} onClick={()=>patchInput('theme',text)}>{i===0?'暮らしの小さな習慣':'大人のファッション'}<Plus size={13}/></button>)}<button type="button" onClick={()=>patchInput('theme',examples[0])}>美容習慣5選<Plus size={13}/></button></div>
          <Field label="もう少し詳しく" hint="任意"><textarea aria-label="投稿内容の補足" rows={3} maxLength={1500} value={input.details} onChange={e=>patchInput('details',e.target.value)} placeholder="伝えたいこと、入れたい内容などがあれば教えてください。"/></Field>
          <div className="two-fields"><Field label="届けたい相手" hint="任意"><input aria-label="ターゲット層" maxLength={120} value={input.target} onChange={e=>patchInput('target',e.target.value)} placeholder="例：40代女性"/></Field><Field label="投稿の枚数"><select aria-label="投稿枚数" value={input.count} onChange={e=>patchInput('count',Number(e.target.value))}>{Array.from({length:8},(_,i)=>i+3).map(n=><option key={n} value={n}>{n}枚{n===6?'（おすすめ）':''}</option>)}</select></Field></div>
          <div className="form-divider"/>
          <div className="section-title" id="designs"><Palette size={20}/><h3>あなたらしい雰囲気を選ぶ</h3></div><div className="template-options">{Object.entries(templates).map(([key,t])=><button key={key} type="button" className={`template-option ${input.template===key?'selected':''}`} onClick={()=>changeTemplate(key as Input['template'])}><span className={`template-swatch swatch-${key}`}><span>{key==='petal'?<Flower2/>:key==='leaf'?<Leaf/>:<Layers/>}</span><i>Aa</i><span className="swatch-lines"/></span><span className="template-title">{t.name}{input.template===key&&<CheckCircle2 size={17}/>}</span><small>{t.label}</small></button>)}</div>
          <div className="two-fields"><Field label="メインカラー"><div className="color-field"><input type="color" aria-label="メインカラー" value={input.color} onChange={e=>patchInput('color',e.target.value)}/><span>{input.color.toUpperCase()}</span><small>お好みで調整</small></div></Field><Field label="文章の雰囲気"><select aria-label="文章の雰囲気" value={input.tone} onChange={e=>patchInput('tone',e.target.value)}><option>親しみやすく、わかりやすい</option><option>上品で、落ち着いた</option><option>明るく、前向きな</option><option>簡潔で、実用的な</option></select></Field></div>
          <details className="optional-settings"><summary><Plus size={16}/>参考画像・画像の品質<span>任意</span><ChevronDown size={16}/></summary><div className="optional-body"><p className="muted">参考画像の色使いや雰囲気を取り入れます。生成時にOpenAIへ送信されます。</p><label className="upload-zone"><Upload size={21}/><span>{reference?'参考画像を変更する':'参考画像をアップロード'}</span><small>PNG / JPG / WebP · 10MBまで</small><input aria-label="参考画像アップロード" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void upload(e.target.files?.[0])}/></label>{reference&&<div className="reference-preview"><img src={reference} alt="アップロードした参考画像"/><button type="button" onClick={()=>setReference(undefined)}>削除</button></div>}<Field label="画像の品質"><select aria-label="画像の品質" value={input.quality} onChange={e=>patchInput('quality',e.target.value as Input['quality'])}><option value="low">お試し（低コスト）</option><option value="medium">標準</option><option value="high">高品質（料金が高くなります）</option></select></Field></div></details>
          <div className="generate-action"><Button className="primary" type="submit" disabled={!!busy}><Sparkles size={19}/>AIで投稿の構成をつくる<ArrowRight size={19}/></Button><p><ShieldCheck size={14}/>まず文章を確認。画像はそのあとに生成できます。</p></div>
          </fieldset></form>
        </section>
        <aside className="creation-aside"><section className="preview-panel"><div className="eyebrow">A LITTLE PREVIEW</div><h3>こんな投稿が、あなたにも。</h3><div className="example-cover"><SlidePreview plan={samplePlan} input={{...previewInput,template:input.template,color:input.color}} index={0} asset={previewAsset}/><span className="sample-badge">テンプレート作例</span></div><div className="preview-spec"><span><Layers size={15}/>{input.count}枚の投稿セット</span><span>9:16 · PNG</span></div><p>イラストと文字を別々につくるから、<br/>日本語も、レイアウトも美しく。</p><button className="text-button" disabled={!!busy||switching||!library.ready} onClick={()=>void loadSample()}>操作サンプルを試す <ArrowRight size={16}/></button></section>
        <section className="gentle-note"><Flower2 size={24}/><div><h4>「うまく書けない」も、大丈夫。</h4><p>短い言葉から、伝わる文章へ。<br/>できあがったあとも、自由に直せます。</p></div></section>
        <div className="privacy-note"><ShieldCheck size={18}/><p>投稿セットはこのブラウザに自動保存。<br/>APIキーをブラウザに公開しません。</p></div>
        </aside></div>}

        {view==='editor'&&phase===1&&plan&&<>
          <div className="workspace-heading"><div><span className="eyebrow">YOUR POST COLLECTION</span><h2>{plan.title}</h2><p>{plan.slides.length}枚のストーリー · {plan.items.length}項目{isSample&&<span className="pill">操作サンプル · 固定データ</span>}</p></div><Button onClick={()=>move(2)} disabled={!editable}>保存へ進む<ArrowRight size={17}/></Button></div>
          {issues.length>0&&<div className="validation-box" role="alert"><strong>画像生成・保存の前に確認してください</strong><ul>{issues.map(s=><li key={s}>{s}</li>)}</ul></div>}
          <div className="image-action-bar"><div><span className="round-icon"><ImagePlus size={21}/></span><div><strong>{done===assets.length?'イラストがそろいました':'文章が整ったら、イラストを添えましょう'}</strong><p>{done} / {assets.length}枚の背景を生成済み · {input.quality==='low'?'お試し画質':input.quality==='high'?'高品質':'標準画質'}</p></div></div><Button className="primary" disabled={!editable||!!issues.length||done===assets.length} onClick={()=>void generateImages(assets.map((a,i)=>!a.image?i:-1).filter(i=>i>=0))}><Sparkles size={17}/>{done?'未生成の背景をつくる':`${assets.length}枚の背景をつくる`}<small>API利用料が発生</small></Button></div>
          <div className="slide-strip">{plan.slides.map((s,i)=><button className={`thumbnail ${selected===i?'selected':''}`} key={i} disabled={!!busy} onClick={()=>setSelected(i)}><SlidePreview plan={plan} input={input} index={i} asset={assets[i]}/><span className="thumb-label"><strong>{String(i+1).padStart(2,'0')}</strong>{i===0?'表紙':i===plan.slides.length-1?'まとめ':`内容 ${i}`}{assets[i].image?<CheckCircle2 size={14}/>:assets[i].error?<AlertCircle size={14}/>:<span className="pending-dot"/>}</span></button>)}</div>
          <div className="editor-grid"><section className="panel canvas-panel"><div className="canvas-toolbar"><span>スライド {String(selected+1).padStart(2,'0')}<small>1080 × 1920 px</small></span><button className="icon-button" aria-label="スライドを拡大" onClick={()=>setZoom(true)}><ZoomIn size={20}/></button></div><div className="editor-canvas"><SlidePreview plan={plan} input={input} index={selected} asset={assets[selected]}/></div><div className="canvas-footer"><button className="icon-button" aria-label="前のスライド" disabled={!selected||!!busy} onClick={()=>setSelected(i=>i-1)}><ArrowLeft size={19}/></button><span>{selected+1} / {assets.length}</span><button className="icon-button" aria-label="次のスライド" disabled={selected===assets.length-1||!!busy} onClick={()=>setSelected(i=>i+1)}><ArrowRight size={19}/></button><Button disabled={!editable||(!assets[selected].image&&!isSample)||!!issues.length} onClick={()=>void exportImages(selected)}><Download size={16}/>PNG</Button></div></section>
          <section className="panel editing-panel"><div className="editor-tabs"><button className={tab==='text'?'active':''} onClick={()=>setTab('text')}><Type size={18}/>文字・デザイン</button><button className={tab==='image'?'active':''} onClick={()=>setTab('image')}><ImagePlus size={18}/>イラスト</button></div><fieldset disabled={!editable}>
          {tab==='text'?<div className="editor-fields"><p className="local-edit-note"><Check size={15}/>文字の修正は無料。その場で画像に反映します。</p><Field label="タイトル" hint={`${plan.slides[selected].title.length}/44`}><textarea aria-label="スライドのタイトル" maxLength={44} rows={3} value={plan.slides[selected].title} onChange={e=>editSlide('title',e.target.value)}/></Field>
          {plan.slides[selected].itemIds.map(id=>{const item=plan.items.find(i=>i.id===id);return item&&<div className="item-edit" key={id}><span className="item-badge">POINT {String(id).padStart(2,'0')}</span><Field label="項目タイトル" hint={`${item.title.length}/26`}><input aria-label={`項目${id}のタイトル`} maxLength={26} value={item.title} onChange={e=>editItem(id,'title',e.target.value)}/></Field><Field label="項目本文" hint={`${item.body.length}/100`}><textarea aria-label={`項目${id}の本文`} rows={3} maxLength={100} value={item.body} onChange={e=>editItem(id,'body',e.target.value)}/></Field></div>;})}
          <Field label={plan.slides[selected].itemIds.length?'補足の一文':'本文'} hint={`${plan.slides[selected].body.length}/180`}><textarea aria-label="スライドの本文" rows={3} maxLength={180} value={plan.slides[selected].body} onChange={e=>editSlide('body',e.target.value)}/></Field><Field label="強調する言葉"><input aria-label="強調する言葉" maxLength={26} value={plan.slides[selected].emphasis} onChange={e=>editSlide('emphasis',e.target.value)}/></Field>
          <Field label="文字の大きさ" hint={`${Math.round(assets[selected].fontScale*100)}%`}><input type="range" aria-label="文字サイズ" min="0.85" max="1.2" step="0.05" value={assets[selected].fontScale} onChange={e=>updateAsset(selected,{fontScale:Number(e.target.value)})}/><small className="muted">はみ出す場合は、自動で読みやすいサイズに調整します。</small></Field>
          <div className="two-fields"><Field label="セット全体のデザイン"><select aria-label="デザインテンプレートの変更" value={input.template} onChange={e=>changeTemplate(e.target.value as Input['template'])}>{Object.entries(templates).map(([k,t])=><option key={k} value={k}>{t.name} — {t.label}</option>)}</select></Field><Field label="メインカラー"><input type="color" aria-label="編集メインカラー" value={input.color} onChange={e=>patchInput('color',e.target.value)}/></Field></div><p className="muted">テンプレート変更では既存のイラストを再利用します。</p>
          </div>:<div className="editor-fields"><h3>このスライドのイラスト</h3><p className="muted">人物・指の形や、意図しない文字がないか確認してください。AIによる点検は完全ではありません。</p>{assets[selected].error&&<div className="error-banner"><AlertCircle size={18}/>{assets[selected].error}</div>}
          {assets[selected].image?<img className="background-preview" src={assets[selected].image} alt="文字を合成する前の背景イラスト"/>:<div className="empty-image"><ImagePlus size={30}/><span>背景イラストはまだありません</span></div>}
          {assets[selected].review&&<div className="review-notes"><ShieldCheck size={18}/><div><strong>AI画像チェック</strong><p>{assets[selected].review!.unexpectedText?'文字が混入している可能性があります。':''}{assets[selected].review!.anatomyConcern?'人物の形に確認が必要です。':''}{assets[selected].review!.styleConcern?'画風の統一を確認してください。':''}</p>{assets[selected].review!.notes.map(n=><p key={n}>{n}</p>)}{!assets[selected].review!.notes.length&&<p>目立つ問題は検出されませんでした。最後に目視でもご確認ください。</p>}</div></div>}
          <Field label="画像の品質"><select aria-label="再生成の画質" value={input.quality} onChange={e=>patchInput('quality',e.target.value as Input['quality'])}><option value="low">お試し（低コスト）</option><option value="medium">標準</option><option value="high">高品質</option></select></Field>
          <Button className="full" disabled={!!issues.length} onClick={()=>void generateImages([selected])}><RefreshCw size={17}/>{assets[selected].image?'背景だけ再生成する':'この背景を生成する'}<small>有料</small></Button>
          <Button className="full" disabled={!!issues.length} onClick={()=>void regenerateSlide()}><Sparkles size={17}/>このスライドの文章・背景を再生成<small>有料</small></Button>
          <div className="form-divider"/><Field label="別のスライドの背景を再利用"><select aria-label="背景を再利用" value="" onChange={e=>{if(e.target.value!==''){const a=assets[Number(e.target.value)];updateAsset(selected,{image:a.image,review:a.review,error:undefined,sample:false});setToast('背景を再利用しました。API料金はかかりません。');}}}><option value="">生成済みの背景から選ぶ</option>{assets.map((a,i)=>a.image&&i!==selected?<option key={i} value={i}>{i+1}枚目の背景</option>:null)}</select></Field><label className="upload-zone compact"><Upload size={18}/><span>手持ちの画像に差し替える（無料）</span><input aria-label="背景画像アップロード" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void upload(e.target.files?.[0],true)}/></label>
          </div>}</fieldset></section></div>
          <section className="panel caption-panel"><div className="panel-heading"><span className="round-icon"><FileText size={21}/></span><div><h2>伝わる言葉を、キャプションに。</h2><p>あなたの声に合わせて、自由に整えてください。</p></div><Button disabled={!editable} onClick={()=>void copyCaption()}><Copy size={16}/>コピー</Button></div><textarea aria-label="キャプション編集" maxLength={2100} rows={10} value={plan.caption} disabled={!editable} onChange={e=>setPlan({...plan,caption:e.target.value})}/><div className="caption-footer"><span>{plan.caption.length} / 2100文字</span><Button disabled={!editable} onClick={()=>void run('編集した文章をAIで校正しています',async()=>{setPlan(await api<Plan>('review',{input,plan}));setToast('文章全体を校正しました。画像は再生成していません。');})}><ShieldCheck size={16}/>文章全体をAIで校正<small>有料</small></Button><Button disabled={!editable} onClick={()=>download(new Blob([plan.caption],{type:'text/plain;charset=utf-8'}),'caption.txt')}><Download size={16}/>テキスト保存</Button></div></section>
        </>}

        {view==='editor'&&phase===2&&plan&&<section className="panel download-panel"><div className="download-icon"><Check size={31}/></div><div className="eyebrow">READY TO SHARE</div><h2>あなたの投稿を、ひとまとめに。</h2><p>1枚ずつ独立した高画質PNGで保存できます。<br/>キャプションを添えて、Instagramへ。</p>{isSample&&<div className="sample-notice">操作サンプルの出力です。背景はプログラムで描画した作例です。</div>}
          <div className="download-gallery">{plan.slides.map((s,i)=><div key={i}><SlidePreview plan={plan} input={input} index={i} asset={assets[i]}/><Button disabled={exporting||!!issues.length||(!isSample&&!assets[i].image)} onClick={()=>void exportImages(i)}><Download size={14}/>{String(i+1).padStart(2,'0')}.png</Button></div>)}</div>
          <div className="export-specs"><span><CheckCircle2 size={16}/>1080 × 1920 px</span><span><Layers size={16}/>{plan.slides.length}枚の独立したPNG</span><span><FileText size={16}/>キャプション付き</span></div>
          {(!isSample&&done!==assets.length || issues.length>0)&&<div className="validation-box">{issues.length?'文章の整合性に修正が必要です。':`背景が未生成のスライドが${assets.length-done}枚あります。`}「確認・編集する」で完成させてください。</div>}
          <Button className="primary download-main" disabled={exporting||!!busy||!!issues.length||(!isSample&&done!==assets.length)} onClick={()=>void exportImages()}>{exporting?<LoaderCircle className="spin" size={20}/>:<Download size={20}/>}全スライドをZIPで保存<ArrowRight size={20}/></Button><div className="download-secondary"><Button onClick={()=>void copyCaption()}><Copy size={17}/>キャプションをコピー</Button><Button onClick={()=>download(new Blob([plan.caption],{type:'text/plain;charset=utf-8'}),'caption.txt')}><FileText size={17}/>テキストを保存</Button></div><button className="text-button" onClick={()=>move(1)}><ArrowLeft size={16}/>編集に戻る</button>
        </section>}

        <footer className="page-footer"><span>Made with care, by mellō.</span><div>API呼出：文章 {usage.text} · 画像 {usage.image} · 点検 {usage.review}{usage.failed>0&&` · 失敗 ${usage.failed}`}<button onClick={()=>setHelp(true)}>利用について <ArrowUpRight size={13}/></button></div></footer>
        {config?.imageEstimateUSD&&<p className="estimate">設定された参考単価での画像概算：${(config.imageEstimateUSD*(phase?assets.length-done:input.count)).toFixed(2)} / 残り{phase?assets.length-done:input.count}枚。文章・点検料金別。実額はOpenAIで確認してください。</p>}
      </div>
    </main>
    {toast&&<div className="toast" role="status"><CheckCircle2 size={19}/>{toast}</div>}
    <dialog ref={dialog} className="help-dialog" onCancel={()=>setHelp(false)}><button className="dialog-close icon-button" aria-label="閉じる" onClick={()=>setHelp(false)}><X size={22}/></button><div className="eyebrow">A GENTLE GUIDE</div><h2>はじめてのmellō</h2><ol><li><strong>テーマを入力</strong><p>伝えたいこととデザインを選びます。AIが構成・文章・キャプションを作り、校正します。</p></li><li><strong>文章を確認して、画像を生成</strong><p>「背景をつくる」を押したときだけ画像APIを呼び出します。生成前に文字や項目数を確認できます。</p></li><li><strong>自分らしく整えて保存</strong><p>文字やデザインの変更は無料。各スライドのPNGとキャプションをZIPで保存できます。</p></li></ol><div className="guide-note"><strong>料金と保存について</strong><p>OpenAIのAPI利用料が別途発生します。文章作成は生成＋校正の2回、背景1枚につき画像生成＋画像点検の2回が基本です。通信失敗でも料金が発生する場合があります。自動再試行はしません。</p><p>テーマごとに複数の投稿セットをマイスタジオへ自動保存します。入力途中・編集途中から再開でき、生成済み画像も保持します。保存先はこのブラウザです。別の端末とは同期されず、ブラウザのデータ削除で失われます。テーマ・参考画像は生成時にOpenAIへ送信されます。APIキーはサーバーだけで使用します。</p><p>画像の崩れや文章の正しさは完全に保証できません。投稿前に内容と画像をご確認ください。</p><p>1080×1920（9:16）はストーリーズ等の縦長用途です。Instagramの投稿画面でトリミング・表示範囲を確認してください。</p></div><p className="connection-status">API設定：{config?.configured?'設定済み（接続は未検証）':'未設定'}<br/>文章：{config?.text} / 画像：{config?.image}</p><Button className="primary full" onClick={()=>setHelp(false)}>はじめる <ArrowRight size={17}/></Button></dialog>
    <dialog ref={zoomDialog} className="zoom-dialog" onCancel={()=>setZoom(false)}><button className="dialog-close icon-button" aria-label="拡大表示を閉じる" onClick={()=>setZoom(false)}><X size={24}/></button>{plan&&<SlidePreview plan={plan} input={input} index={selected} asset={assets[selected]}/>}</dialog>

  </div>;
}
