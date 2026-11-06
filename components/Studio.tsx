'use client';
import {useEffect,useMemo,useRef,useState,useCallback} from 'react';
import {Menu,ArrowRight,ArrowLeft,ArrowUpRight,Check,ChevronDown,ChevronRight,Copy,Download,Flower2,HelpCircle,ImagePlus,Layers,Leaf,LoaderCircle,Palette,Plus,Settings2,ShieldCheck,Sparkles,Type,Upload,X,FileText,Bookmark,CheckCircle2,AlertCircle,LockKeyhole} from 'lucide-react';
import JSZip from 'jszip';
import {emptyUsage,initialInput,inputSchema,inputIssues,validatePlan,type Input,type Plan,type Usage,type SlideAsset} from '@/lib/schema';
import {artStyles} from '@/lib/art-styles';
import {templates} from '@/lib/templates';
import {formats,canvasSize,type AspectRatio} from '@/lib/formats';
import {personalSample} from '@/lib/personal-sample';
import {samplePlan} from '@/lib/sample';
import {comicSample,quoteSample,comparisonSample} from '@/lib/additional-samples';
import {panelAssetPatch,type ComparisonPanel} from '@/lib/comparison';
import {storySample,essaySample} from '@/lib/reading-samples';
import {download,prepareUpload} from '@/lib/drafts';
import {pngBlob} from '@/lib/render';
import SlidePreview from './SlidePreview';
import CanvasTextEditor from './CanvasTextEditor';
import EditorViewport from './EditorViewport';
import PhotoLayersEditor from './PhotoLayersEditor';
import type {RenderReport} from '@/lib/render';
import PhoneTransfer from './PhoneTransfer';
import AppearanceControls from './AppearanceControls';
import {appearancePatch} from '@/lib/appearance';
import {characterAges} from '@/lib/characters';
import {modes,creationModes,themeExamples,recommendedSlideCount,inputForMode,isNarrative,pendingImageCalls,usesSharedBackground,isAssetComplete,backgroundGroups,hasQuoteFlow} from '@/lib/modes';
import {textBoxFor,newSlideAsset} from '@/lib/text-layout';
import ProjectLibrary from './ProjectLibrary';
import PersonCollection from './PersonCollection';
import GettingStarted from './GettingStarted';
import StudioTutorial from './StudioTutorial';
import {canAdvanceTutorial,nextTutorialStep,tutorialForScreen,type TutorialStep} from '@/lib/tutorial';
import {readProject,setProjectArchived,type ProjectContent} from '@/lib/projects';
import {useEditorHistory} from '@/lib/use-editor-history';
import {useProjects} from '@/lib/use-projects';

type Config={configured:boolean;passwordRequired:boolean;text:string;image:string;imageEstimateUSD:number|null};
const freshAssets=(count:number,input:Input):SlideAsset[]=>Array.from({length:count},(_,i)=>newSlideAsset(input,i));
const previewAsset:SlideAsset={fontScale:1,sample:true};
const examples=[{mode:'comic',label:'雨の日の小さなやさしさ'},{mode:'essay',label:'寝かしつけ後の気持ち'},{mode:'info',label:'朝の支度の声かけ3選'}] as const;
function Button({children,className='',...props}:React.ButtonHTMLAttributes<HTMLButtonElement>){return <button className={`button ${className}`} {...props}>{children}</button>;}
function Field({label,hint,children,required=false,guide}:{label:string;hint?:string;children:React.ReactNode;required?:boolean;guide?:string}){return <>{guide&&<div data-guide-slot={guide}/>}<div className="field" data-guide-target={guide}><div className="field-title">{label}{required&&<span className="required">必須</span>}{hint&&<span className="field-hint">{hint}</span>}</div>{children}</div></>;}

export default function Studio({accessPassword=''}:{accessPassword?:string}){
  const [input,setInput]=useState<Input>(initialInput),[plan,setPlan]=useState<Plan|null>(null),[assets,setAssets]=useState<SlideAsset[]>([]);
  const [phase,setPhase]=useState(0),[selected,setSelected]=useState(0),[tab,setTab]=useState<'text'|'image'>('text');
  const [reference,setReference]=useState<string>(),[usage,setUsage]=useState<Usage>(emptyUsage),[config,setConfig]=useState<Config|null>(null);
  const [busy,setBusy]=useState(''),[progress,setProgress]=useState({done:0,total:0}),[error,setError]=useState(''),[toast,setToast]=useState('');
  const [isSample,setIsSample]=useState(false),[password,setPassword]=useState(accessPassword);
  const [view,setView]=useState<'home'|'editor'|'library'|'collection'>('home'),[switching,setSwitching]=useState(false);
  const projectContent=useMemo<ProjectContent>(()=>({input,plan,assets,usage,reference,isSample,phase,selected,tab}),[input,plan,assets,usage,reference,isSample,phase,selected,tab]);
  const library=useProjects(projectContent,view==='editor');
  const [guideLaunch,setGuideLaunch]=useState(0),[tutorialStep,setTutorialStep]=useState<TutorialStep|null>(null);
  const [help,setHelp]=useState(false),[exporting,setExporting]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false),[inspector,setInspector]=useState<'caption'|null>(null);
  const menuTrigger=useRef<HTMLButtonElement>(null),menuPanel=useRef<HTMLElement>(null);
  useEffect(()=>{if(!menuOpen)return;menuPanel.current?.querySelector<HTMLButtonElement>('button')?.focus();const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setMenuOpen(false);menuTrigger.current?.focus();}};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);},[menuOpen]);
  const [photoTools,setPhotoTools]=useState<HTMLDivElement|null>(null);
  const [textTools,setTextTools]=useState<HTMLDivElement|null>(null);
  useEffect(()=>{if(tutorialStep==='edit'||tutorialStep==='images')setInspector(null);if(tutorialStep==='caption')setInspector('caption');},[tutorialStep]);
  const [textReport,setTextReport]=useState<RenderReport|null>(null);
  const reportText=useCallback((report:RenderReport)=>setTextReport(report),[]);
  const lock=useRef(false),stop=useRef(false),top=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{fetch('/api/config').then(r=>r.json()).then(setConfig).catch(()=>setError('サーバーに接続できませんでした'));},[]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(t);},[toast]);
  useEffect(()=>{if(help)dialog.current?.showModal();else dialog.current?.close();},[help]);
  const size=canvasSize(input),narrative=isNarrative(input),comparison=input.mode==='comparison';
  const demoPlan=input.mode==='personal'?personalSample:input.mode==='story'?storySample:input.mode==='essay'?essaySample:input.mode==='comic'?comicSample:input.mode==='quote'?quoteSample:comparison?comparisonSample:samplePlan;
  const demoInput={...input,theme:demoPlan.title};
  const imageCalls=phase?pendingImageCalls(input,assets,plan):input.mode==='quote'?2:usesSharedBackground(input)?1:comparison?input.count*2:input.count;
  const issues=plan?validatePlan(plan,input):[];
  const done=assets.filter(a=>isAssetComplete(input,a)).length;
  const editable=!!plan&&!busy&&!exporting&&!switching;
  const editSnapshot=useMemo(()=>({plan,input,assets}),[plan,input,assets]);
  const history=useEditorHistory(editSnapshot,`${library.activeId||'new'}:${view}:${phase}`,editable&&view==='editor'&&phase===1,value=>{setPlan(value.plan);setInput(value.input);setAssets(value.assets);});
  useEffect(()=>{if(tutorialStep&&(view==='editor'||view==='library'))setTutorialStep((tutorialStep==='now-year'||tutorialStep==='future-year')&&!comparison?'age':tutorialForScreen(tutorialStep,phase,view,assets.length>0&&done===assets.length));},[tutorialStep,phase,view,done,assets.length,comparison]);
  useEffect(()=>{if(tutorialStep==='edit')setTab('text');},[tutorialStep]);
  function openGuide(){dialog.current?.close();setHelp(false);setGuideLaunch(n=>n+1);}
  function patchInput<K extends keyof Input>(key:K,value:Input[K]){setInput(p=>({...p,[key]:value}));}
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
    await run((input.mode==='story'||input.mode==='comic')?'一つの物語をつくり、場面のつながりを整えています':'構成と文章を考え、日本語を校正しています',async()=>{const next=await api<Plan>('plan',{input,reference});setPlan(next);setAssets(freshAssets(next.slides.length,input));setIsSample(false);setSelected(0);move(1);});
  }
  async function showLibrary(){
    if(busy||exporting||switching)return;setSwitching(true);
    try{if(view==='editor'&&!await library.flush())return;await library.refresh();setView('library');setError('');top.current?.scrollIntoView({behavior:'smooth'});}catch(e){setError((e as Error).message);}finally{setSwitching(false);}
  }
  async function showCollection(){
    if(busy||exporting||switching)return;setSwitching(true);
    try{if(view==='editor'&&!await library.flush())return;setView('collection');setError('');top.current?.scrollIntoView({behavior:'smooth'});}finally{setSwitching(false);}
  }
  async function startNew(){
    if(busy||exporting||switching)return false;setSwitching(true);
    try{if(view==='editor'&&!await library.flush())return false;library.begin();setInput(initialInput);setPlan(null);setAssets([]);setUsage(emptyUsage());setReference(undefined);setIsSample(false);setSelected(0);setTab('text');setError('');move(0);return true;}finally{setSwitching(false);}
  }
  async function beginTutorial(){if(!await startNew())return false;setTutorialStep('theme');return true;}
  async function openProject(id:string){
    if(busy||exporting||switching)return;setSwitching(true);
    try{if(view==='editor'&&!await library.flush())return;const p=await readProject(id);library.activate(p);setInput(p.input);setPlan(p.plan);setAssets(p.assets);setUsage(p.usage);setReference(p.reference);setIsSample(p.isSample);setSelected(Math.min(p.selected,Math.max(0,p.assets.length-1)));setTab(p.tab);setError('');move(p.plan?p.phase:0);}catch(e){setError((e as Error).message);}finally{setSwitching(false);}
  }
  async function archiveProject(id:string,archived:boolean){
    setSwitching(true);try{await setProjectArchived(id,archived);await library.refresh();if(library.activeId===id)library.begin();setToast(archived?'アーカイブに移動しました。いつでも元に戻せます。':'マイスタジオに戻しました。');}catch(e){setError((e as Error).message);}finally{setSwitching(false);}
  }
  async function loadSample(){
    if(!await library.flush())return;library.begin();setInput({...input,theme:demoPlan.title,count:demoPlan.slides.length});setPlan(structuredClone(demoPlan));setAssets(freshAssets(demoPlan.slides.length,input).map(a=>({...a,sample:true})));setUsage(emptyUsage());setIsSample(true);setReference(undefined);setSelected(0);setError('');move(1);setToast('固定の操作サンプルを開きました。AI生成・課金は行っていません。');
  }
  function updateAsset(index:number,patch:Partial<SlideAsset>){setAssets(prev=>prev.map((a,i)=>i===index?{...a,...patch}:a));}
  async function imageFor(index:number,currentPlan:Plan,ref?:string,panel:ComparisonPanel='now'){
    try{if(input.artStyle==='reference'&&!ref)throw new Error('イラストの絵柄で参考画像をアップロードしてください。');const result=await api<{image:string;review:SlideAsset['review']}>('image',{input,plan:currentPlan,index,panel,reference:ref,referenceKind:ref&&ref!==reference?'continuity':'style',textBox:narrative?textBoxFor(input,assets[index],index===0,hasQuoteFlow(input,currentPlan)&&index===currentPlan.slides.length-1):undefined});updateAsset(index,panelAssetPatch(panel,result));return result;}
    catch(e){const message=e instanceof Error?e.message:'画像生成に失敗しました';updateAsset(index,panel==='future'?{futureError:message}:{error:message});return undefined;}
  }
  async function generateImages(indices:number[]){if(!plan || issues.length || !indices.length)return;
    await run('イラストを描いています',async()=>{
      if(usesSharedBackground(input)){
        const groups=backgroundGroups(input,assets.length,plan).filter(group=>group.some(i=>indices.includes(i)));
        let completed=0;setProgress({done:0,total:groups.length});
        for(const group of groups){
          if(stop.current)break;
          const targets=group.filter(i=>indices.includes(i)),existing=group.map(i=>assets[i]).find(a=>a.image);
          const shared=existing||await imageFor(targets[0],plan,reference);
          if(shared?.image)setAssets(prev=>prev.map((a,i)=>targets.includes(i)?{...a,image:shared.image,review:shared.review,error:undefined,sample:false}:a));
          setProgress({done:++completed,total:groups.length});
        }
        setToast(stop.current?'処理を停止しました。完成した背景は保存されています。':hasQuoteFlow(input,plan)?'共通背景と結び専用の背景を設定しました。失敗した背景だけ再試行できます。':'共通背景を設定しました。保存済みの背景の再利用は無料です。');
        return;
      }
      if(comparison){
        const total=indices.reduce((n,i)=>n+Number(!assets[i].image)+Number(!assets[i].futureImage),0);let completed=0;
        setProgress({done:0,total});
        for(const index of indices){
          if(stop.current)break;
          let current=assets[index].image;
          if(!current){setBusy(`${index+1}枚目・現在の絵を生成しています`);const result=await imageFor(index,plan,reference);current=result?.image;setProgress({done:++completed,total});}
          if(stop.current)break;
          if(current&&!assets[index].futureImage){setBusy(`${index+1}枚目・未来の絵を生成しています`);await imageFor(index,plan,current,'future');setProgress({done:++completed,total});}
        }
        setToast(stop.current?'処理を止めました。完成済みの片方の画像も保存されています。':'比較画像の処理が終わりました。未生成の片方だけ再試行できます。');return;
      }
      setProgress({done:0,total:indices.length});let styleReference=reference||assets.find(a=>a.image)?.image;
      for(let n=0;n<indices.length;n++){if(stop.current)break;setBusy(`${indices[n]+1}枚目のイラストを生成・点検しています`);const result=await imageFor(indices[n],plan,styleReference);if(!styleReference&&result)styleReference=result.image;setProgress({done:n+1,total:indices.length});}
      setToast(stop.current?'処理を停止しました。完成した画像は保存されています。':'画像の処理が終わりました。各スライドを確認してください。');
    });
  }
  async function upload(file:File|undefined,background=false,panel:ComparisonPanel='now'){if(!file)return;await run('画像を読み込んでいます',async()=>{const image=await prepareUpload(file);if(background){updateAsset(selected,panel==='future'?{futureImage:image,futureError:undefined,futureReview:undefined,sample:false}:{image,error:undefined,review:undefined,sample:false});setToast('画像を差し替えました。API料金はかかりません。');}else {setReference(image);patchInput('artStyle','reference');}});}
  async function exportImages(single?:number){if(!plan || issues.length)return;if(!isSample && (single!==undefined?!isAssetComplete(input,assets[single]):done!==assets.length)){setError('未生成の背景があります。画像を生成するか、お手持ちの画像を設定してください。');return;}
    setExporting(true);setError('');try{if(single!==undefined){download(await pngBlob(plan,input,single,assets[single]),`mello-${String(single+1).padStart(2,'0')}.png`);}else{const zip=new JSZip();for(let i=0;i<plan.slides.length;i++)zip.file(`slide-${String(i+1).padStart(2,'0')}.png`,await pngBlob(plan,input,i,assets[i]));zip.file('caption.txt',plan.caption);zip.file('readme.txt',`${plan.title}\n${plan.slides.length} separate PNG images, ${size.width} x ${size.height} pixels each (${input.aspectRatio}).\n${isSample?'Offline sample project; not AI-generated.':''}`);download(await zip.generateAsync({type:'blob',compression:'STORE'}),'mello-instagram.zip');}if(tutorialStep==='download')setTutorialStep('open-library');setToast(single!==undefined?'PNGを保存しました':'各スライドのPNGとキャプションをZIPにまとめました');}catch(e){setError((e as Error).message);}finally{setExporting(false);}}
  async function copyCaption(){if(!plan)return;try{await navigator.clipboard.writeText(plan.caption);setToast('キャプションをコピーしました');}catch{setError('コピーできませんでした。キャプションを選択してコピーしてください。');}}

  return <div className={`app-shell drawer-shell ${view==='home'?'home-screen':''} ${view==='editor'&&phase===1?'slide-workspace':''}`} >
    {menuOpen&&<button className="navigation-scrim" aria-label="メニューを閉じる" onClick={()=>setMenuOpen(false)}/>}
    <aside ref={menuPanel} role={menuOpen?'dialog':undefined} aria-modal={menuOpen||undefined} aria-label="ワークスペースのメニュー" inert={!menuOpen} id="workspace-menu" className={`sidebar ${menuOpen?'menu-open':''}`} onKeyDown={e=>{if(e.key==='Escape')setMenuOpen(false);}}>
      <button className="icon-button menu-close" aria-label="メニューを閉じる" onClick={()=>{setMenuOpen(false);menuTrigger.current?.focus();}}><X size={20}/></button>
      <a className="brand" href="/" aria-label="mello ホーム"><span className="brand-icon"><Flower2 size={29} strokeWidth={1.25}/></span><span>mellō<span className="brand-dot">.</span></span></a>
      <div className="brand-caption">あなたらしさを、かたちに。</div>
      <div className="nav-label">WORKSPACE</div>
      <button className={`nav-item ${view==='editor'?'active':''}`} disabled={!!busy||exporting||switching||!library.ready} onClick={()=>{setMenuOpen(false);void startNew();}}><Sparkles size={19}/>投稿をつくる<Plus size={16}/></button>
      <button className={`nav-item ${view==='library'?'active':''}`} disabled={!!busy||exporting||switching||!library.ready} onClick={()=>{setMenuOpen(false);void showLibrary();}}><Layers size={19}/>マイスタジオ{library.projects.filter(p=>!p.archived).length>0&&<span className="nav-count">{library.projects.filter(p=>!p.archived).length}</span>}</button>
      <button className={`nav-item ${view==='collection'?'active':''}`} disabled={!!busy||exporting||switching||!library.ready} onClick={()=>{setMenuOpen(false);void showCollection();}}><Bookmark size={19}/>コレクション</button>
      <div className="sidebar-bottom"><div className="sidebar-note"><Leaf size={21}/><strong>ひとつの想いから、<br/>広がるあなたの世界。</strong><p>言葉も、デザインも。<br/>mellōがそっとお手伝い。</p></div>
        <button className="nav-item" onClick={()=>{setMenuOpen(false);setHelp(true);}}><HelpCircle size={19}/>使い方ガイド<ArrowUpRight size={15}/></button>
        <div className="profile"><div className="avatar">M</div><div>マイワークスペース<small>プライベートスタジオ</small></div><Settings2 size={16}/></div>
      </div>
    </aside>
    <main inert={menuOpen} className="main" ref={top}>
      <header className="topbar"><button ref={menuTrigger} className="icon-button menu-toggle" aria-label="メニューを開く" aria-expanded={menuOpen} aria-controls="workspace-menu" onClick={()=>setMenuOpen(v=>!v)}><Menu size={22}/></button><span className="compact-brand">mellō.</span><span className="breadcrumb">ワークスペース <ChevronRight size={14}/><strong>{view==='home'?'ホーム':view==='library'?'マイスタジオ':view==='collection'?'コレクション':'投稿をつくる'}</strong></span><span className="top-status"><span className="status-dot"/>{view==='home'?'あなたの想いを、かたちに':(view==='library'||view==='collection')?'このブラウザに保存':library.status||'テーマを入力すると自動保存'}</span><button className="mobile-studio button" disabled={!!busy||exporting||switching||!library.ready} onClick={()=>{setMenuOpen(false);void showLibrary();}}><Layers size={16}/>マイスタジオ</button><button className="mobile-help icon-button" aria-label="使い方" onClick={()=>setHelp(true)}><HelpCircle size={21}/></button></header>
      <div className="content">
        {(view==='home'||(view==='editor'&&phase>0))&&<section className={`intro ${phase?'intro-compact':''}`}><div><div className="eyebrow"><span/> YOUR IDEAS, BEAUTIFULLY TOLD</div><h1>{phase===0?<>伝えたい想いを、<br/><em>美しい投稿に。</em></>:phase===1?<>あなたらしく、<em>仕上げましょう。</em></>:<>できあがった想いを、<em>届けましょう。</em></>}</h1><p>{phase===0?'テーマや想いから、Instagramの投稿画像とキャプションをつくれます。':'文章の修正は何度でも。あなたの言葉を大切に。'}<br/>{phase===0?'あなたの「伝えたい」に、AIがそっと寄り添います。':'日本語の文字とイラストを、美しくひとつに。'}</p>{phase===0&&<button className="button" style={{marginTop:18}} onClick={openGuide}><HelpCircle size={17}/>はじめての使い方</button>}{phase===0&&<div className="intro-meta"><span><Check size={14}/>日本語をきれいに</span><span><Check size={14}/>統一感のあるデザイン</span><span><Check size={14}/>PNGでそのまま保存</span></div>}</div>
        {phase===0&&<div className="hero-art" aria-label="テンプレートの作例"><span className="floating-sparkle">✧</span><div className="hero-card card-left"><SlidePreview plan={demoPlan} input={{...demoInput,template:'leaf',color:templates.leaf.accent}} index={2} asset={previewAsset}/></div><div className="hero-card card-right"><SlidePreview plan={demoPlan} input={{...demoInput,template:'ink',color:templates.ink.accent}} index={5} asset={previewAsset}/></div><div className="hero-card card-center"><SlidePreview plan={demoPlan} input={demoInput} index={0} asset={previewAsset}/></div><span className="art-label"><Flower2 size={15}/>小さな想いが、素敵な一枚に。</span></div>}</section>}
        {view==='home'&&<section className="home-actions" aria-label="はじめる"><Button className="primary" disabled={!library.ready||switching} onClick={()=>void startNew()}><Plus size={21}/><span><strong>新しい投稿をつくる</strong><small>テーマから、あなたらしい投稿へ</small></span><ArrowRight size={19}/></Button><Button disabled={!library.ready||switching} onClick={()=>void showLibrary()}><Layers size={21}/><span><strong>マイスタジオ</strong><small>保存した投稿を開いて、続きを編集</small></span><ArrowRight size={19}/></Button></section>}
        {view==='editor'&&phase>0&&<nav className="steps" aria-label="作成手順">{['テーマを入力','確認・編集する','ダウンロード'].map((label,i)=><button key={label} className={`step ${phase===i?'current':''} ${phase>i?'completed':''}`} disabled={i>0&&!plan || !!busy || exporting || switching} onClick={()=>move(i)}><span>{phase>i?<Check size={17}/>:String(i+1).padStart(2,'0')}</span>{label}{i<2&&<ChevronRight size={18}/>}</button>)}</nav>}
        {tutorialStep&&<StudioTutorial step={tutorialStep} mode={input.mode} screen={`${view}:${phase}`} disabled={!canAdvanceTutorial(tutorialStep,input,!!busy||exporting||switching)} onChange={direction=>setTutorialStep(nextTutorialStep(tutorialStep,input.mode,direction))} onEnd={()=>setTutorialStep(null)}/>}
        {view==='editor'&&tutorialStep==='open-library'&&<div data-guide-slot="open-library"/>}
        {library.failure&&<div className="error-banner" role="alert"><AlertCircle size={20}/><span>{library.failure}</span><button className="button" disabled={switching} onClick={()=>void (library.ready?library.flush():library.refresh().catch(e=>setError((e as Error).message)))}>保存を再試行</button>{library.failure.includes('別のタブ')&&<button className="button" onClick={()=>void library.saveCopy()}>別セットとして保存</button>}</div>}
        {config?.passwordRequired&&!accessPassword&&<div className="password-bar"><LockKeyhole size={18}/><label htmlFor="password">スタジオの利用パスワード</label><input id="password" type="password" autoComplete="current-password" placeholder="サーバーで設定したパスワード" value={password} onChange={e=>setPassword(e.target.value)}/><small>この画面を閉じると消去されます</small></div>}
        {error&&<div className="error-banner" role="alert"><AlertCircle size={20}/><span>{error}</span><button className="icon-button" aria-label="エラーを閉じる" onClick={()=>setError('')}><X size={17}/></button></div>}
        {busy&&<div className="progress-panel" role="status" aria-live="polite"><LoaderCircle className="spin" size={24}/><div><strong>{busy}</strong><p>{progress.total?`${progress.done} / ${progress.total}画像 完了 · 1枚ずつ大切に作っています。`:'文章の構成と表現を確認しています。しばらくお待ちください。'}</p>{progress.total>0&&<progress value={progress.done} max={progress.total}/>}</div>{progress.total>0&&<Button onClick={()=>{stop.current=true;setToast('処理中の1枚が終わったら停止します');}}>この1枚で停止</Button>}</div>}

        {view==='collection'&&<><button className="button" onClick={()=>move(phase)}><ArrowLeft size={16}/>投稿づくりに戻る</button><PersonCollection/></>}
        {view==='library'&&<><div data-guide-slot="library"/><ProjectLibrary projects={library.projects} ready={library.ready} disabled={switching||!!busy||exporting} onOpen={id=>void openProject(id)} onNew={()=>void startNew()} onArchive={(id,archived)=>void archiveProject(id,archived)}/></>}
        {view==='editor'&&phase===0&&<div className="create-grid"><section className="panel input-panel"><div className="panel-heading"><span className="section-number">01</span><div><h2>どんな投稿をつくりますか？</h2><p>思いついたことを、あなたの言葉で。</p></div><Sparkles className="soft-icon" size={23}/></div>
          <form onSubmit={e=>{e.preventDefault();void generatePlan();}}><fieldset disabled={!!busy||switching}>
          <Field guide="theme" label="投稿テーマ" required><textarea aria-label="投稿テーマ" className="theme-input" rows={3} maxLength={120} value={input.theme} onChange={e=>patchInput('theme',e.target.value)} placeholder={`例：${themeExamples[input.mode]}`}/><div className="input-footer"><span>まずは、テーマだけでも大丈夫です。</span><span>{input.theme.length} / 120</span></div></Field>
          <div className="examples"><span>こんなテーマも</span>{examples.map(example=><button type="button" key={example.mode} onClick={()=>setInput(p=>({...inputForMode(p,example.mode),theme:themeExamples[example.mode]}))}>{example.label}<Plus size={13}/></button>)}</div>
          <Field guide="art-style" label="イラストの絵柄"><div className="art-style-options">{Object.entries(artStyles).sort(([a],[b])=>a==='reference'?1:b==='reference'?-1:0).map(([key,style])=><button type="button" key={key} aria-pressed={(input.artStyle||'auto')===key} className={(input.artStyle||'auto')===key?'selected':''} onClick={()=>patchInput('artStyle',key as Input['artStyle'])}><strong>{style.name}</strong><small>{style.description}</small></button>)}</div><div data-guide-slot="reference"/>{input.artStyle==='reference'&&<div className="reference-style-upload"><p className="muted">アップロードした画像を絵柄の参考にします。生成時にOpenAIへ送信されます。</p><label data-guide-target="reference" className="upload-zone"><Upload size={21}/><span>{reference?'参考画像を変更する':'参考画像をアップロード'}</span><small>PNG / JPG / WebP · 10MBまで</small><input aria-label="参考画像アップロード" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void upload(e.target.files?.[0])}/></label>{reference&&<div className="reference-preview"><img src={reference} alt="アップロードした参考画像"/><button type="button" onClick={()=>{setReference(undefined);patchInput('artStyle','auto');}}>削除</button></div>}</div>}</Field>
          <Field guide="mode" label="投稿のモード"><div className="mode-options">{creationModes.map(([key,mode])=><button key={key} type="button" aria-pressed={input.mode===key} className={input.mode===key?'selected':''} onClick={()=>setInput(p=>inputForMode(p,key as Input['mode']))}><strong>{mode.name}{input.mode===key&&<CheckCircle2 size={17}/>}</strong><span>{mode.description}</span></button>)}</div></Field>
          {input.mode==='personal'&&<p className="personal-mode-note">写真は、構成をつくった後の編集画面で追加できます。口癖やいつもの話し方も「もう少し詳しく」にどうぞ。</p>}
          <Field guide="details" label="もう少し詳しく" hint="任意"><textarea aria-label="投稿内容の補足" rows={3} maxLength={1500} value={input.details} onChange={e=>patchInput('details',e.target.value)} placeholder={modes[input.mode].hint}/></Field>
          <div className="two-fields"><Field guide="target" label="届けたい相手" hint="任意"><input aria-label="ターゲット層" maxLength={120} value={input.target} onChange={e=>patchInput('target',e.target.value)} placeholder="例：イヤイヤ期の2歳の子を育て、毎朝の支度に悩むママ"/></Field><Field guide="count" label="投稿の枚数"><select aria-label="投稿枚数" value={input.count} onChange={e=>patchInput('count',Number(e.target.value))}>{Array.from({length:8},(_,i)=>i+3).map(n=><option key={n} value={n} disabled={input.mode==='quote'&&n<4}>{n}枚{n===recommendedSlideCount(input.mode)?'（おすすめ）':''}</option>)}</select></Field></div>
          {comparison&&<div className="two-fields"><Field guide="now-year" label="現在の年"><input type="number" aria-label="比較する現在の年" min="1900" max="2200" value={input.nowYear} onChange={e=>patchInput('nowYear',Number(e.target.value))}/></Field><Field guide="future-year" label="未来の年"><input type="number" aria-label="比較する未来の年" min={input.nowYear+1} max="2250" value={input.futureYear} onChange={e=>patchInput('futureYear',Number(e.target.value))}/></Field></div>}
          <Field guide="ratio" label="投稿画像の比率"><div className="format-options">{Object.entries(formats).map(([ratio,format])=><button type="button" key={ratio} className={input.aspectRatio===ratio?'selected':''} aria-pressed={input.aspectRatio===ratio} onClick={()=>patchInput('aspectRatio',ratio as AspectRatio)}><span className="format-shape" style={{aspectRatio:ratio.replace(':','/')}}/><strong>{ratio}{ratio==='4:5'&&<small>おすすめ</small>}</strong><span>{format.label}</span><small>{format.width} × {format.height}</small></button>)}</div></Field>
          <details className="optional-settings"><summary><Settings2 size={16}/>詳細な設定<span>任意</span><ChevronDown size={16}/></summary><div className="optional-body"><Field guide="age" label="登場する大人の見た目"><select aria-label="登場人物の年代" value={input.characterAge} onChange={e=>patchInput('characterAge',e.target.value as Input['characterAge'])}>{Object.entries(characterAges).map(([key,label])=><option key={key} value={key}>{label}{key==='30s'?'（初期値）':''}</option>)}</select><small className="muted">届けたい相手の年齢とは別の設定です。子育ての母親は30代を基本に描きます。</small></Field><Field guide="account" label="フォローしてもらいたい発信内容"><input aria-label="フォローしてもらいたい発信内容" maxLength={100} value={input.accountTopic} onChange={e=>patchInput('accountTopic',e.target.value)} placeholder="例：子育ての声かけ、親子のコミュニケーション"/></Field><p className="muted">{(input.mode==='story'||input.mode==='comic')?'最後のページに、気づきと短いフォロー案内を添えます。':input.mode==='essay'?'最後のページに、伝えたかった思いのまとめと短いフォロー案内を添えます。':narrative?'フォロー案内はキャプションに添えます。':'最後に、フォローするメリットが伝わる案内を添えます。'}</p><Field guide="quality" label="画像の品質"><select aria-label="画像の品質" value={input.quality} onChange={e=>patchInput('quality',e.target.value as Input['quality'])}><option value="low">お試し（低コスト）</option><option value="medium">標準</option><option value="high">高品質（料金が高くなります）</option></select></Field></div></details>
          <div className="form-divider"/>
          <div data-guide-slot="generate"/><div data-guide-target="generate" className="generate-action"><Button className="primary" type="submit" disabled={!!busy}><Sparkles size={19}/>AIで投稿の構成をつくる<ArrowRight size={19}/></Button><p><ShieldCheck size={14}/>{comparison?'構成を確認してから、各ページの現在・未来の画像を1枚ずつ生成します。':narrative?'まず文章を確認。背景の生成は、そのあとで。':'フック→具体例→まとめ・フォロー案内まで、まず文章を確認。'}</p></div>
          </fieldset></form>
        </section>
        <aside className="creation-aside"><section className="preview-panel"><div className="eyebrow">A LITTLE PREVIEW</div><h3>こんな投稿が、あなたにも。</h3><div className="example-cover"><SlidePreview plan={demoPlan} input={{...demoInput,template:input.template,color:input.color}} index={0} asset={previewAsset}/><span className="sample-badge">テンプレート作例</span></div><div className="preview-spec"><span><Layers size={15}/>{input.count}枚の投稿セット</span><span>{input.aspectRatio} · PNG</span></div><p>イラストと文字を別々につくるから、<br/>日本語も、レイアウトも美しく。</p><button className="text-button" disabled={!!busy||switching||!library.ready} onClick={()=>void loadSample()}>操作サンプルを試す <ArrowRight size={16}/></button></section>
        <section className="gentle-note"><Flower2 size={24}/><div><h4>「うまく書けない」も、大丈夫。</h4><p>短い言葉から、伝わる文章へ。<br/>できあがったあとも、自由に直せます。</p></div></section>
        <div className="privacy-note"><ShieldCheck size={18}/><p>投稿セットはこのブラウザに自動保存。<br/>APIキーをブラウザに公開しません。</p></div>
        </aside></div>}

        {view==='editor'&&phase===1&&plan&&<div className={`slide-desk ${inspector?'inspector-open':''} ${inspector==='caption'?'caption-open':''}`} style={{'--canvas-ratio':size.width/size.height} as React.CSSProperties}>
          <div data-guide-slot="save"/><div className="workspace-heading"><div><span className="eyebrow">YOUR POST COLLECTION</span><h2>{plan.title}</h2><p>{plan.slides.length}枚 · {modes[input.mode].name}{input.mode==='info'&&` · ${plan.items.length}項目`}{isSample&&<span className="pill">操作サンプル · 固定データ</span>}</p></div><Button data-guide-target="save" onClick={()=>move(2)} disabled={!editable}>保存へ進む<ArrowRight size={17}/></Button></div>
          {issues.length>0&&<div className="validation-box" role="alert"><strong>画像生成・保存の前に確認してください</strong><ul>{issues.map(s=><li key={s}>{s}</li>)}</ul></div>}
          <div data-guide-slot="images"/><div data-guide-target="images" className="image-action-bar"><div><span className="round-icon"><ImagePlus size={21}/></span><div><strong>{done===assets.length?'イラストがそろいました':'文章が整ったら、イラストを添えましょう'}</strong><p>{done} / {assets.length}ページの背景を設定済み{hasQuoteFlow(input,plan)?' · 共通背景1枚＋結び専用1枚':usesSharedBackground(input)?' · 同じ背景1枚を共有':comparison?' · 1ページに画像2枚':''} · {input.quality==='low'?'お試し画質':input.quality==='high'?'高品質':'標準画質'}</p></div></div><Button className="primary" disabled={!editable||!!issues.length||done===assets.length} onClick={()=>void generateImages(assets.map((a,i)=>!isAssetComplete(input,a)?i:-1).filter(i=>i>=0))}><Sparkles size={17}/>{usesSharedBackground(input)?(imageCalls?hasQuoteFlow(input,plan)?`未生成の背景${imageCalls}枚をつくる`:'背景1枚で全ページをつくる':'保存済みの背景を共有する'):comparison?`未生成の画像${imageCalls}枚をつくる`:done?'未生成の背景をつくる':`${assets.length}枚の背景をつくる`}<small>{imageCalls?'API利用料が発生':'無料'}</small></Button></div>
<fieldset disabled={!editable} className="workspace-ribbon" data-text-tools><div className="ribbon-main"><div className="editor-history-toolbar" role="toolbar" aria-label="編集履歴"><Button disabled={!history.canUndo} onClick={history.undo}>↶ 元に戻す</Button><Button disabled={!history.canRedo} onClick={history.redo}>↷ やり直す</Button><small>Ctrl / ⌘ + Z</small></div><div ref={setTextTools} className="ribbon-text-tools"/><div className="ribbon-panels"><div ref={setPhotoTools} data-photo-tools/><Button aria-pressed={inspector==='caption'} onClick={()=>setInspector(inspector==='caption'?null:'caption')}><FileText size={16}/>キャプション</Button></div></div>          <section className="reading-settings text-settings" aria-label="文字の設定"><h3>文字の設定</h3>
          {narrative&&<Field label="揃え方"><select aria-label="文字の揃え方" value={assets[selected].textAlign||'left'} onChange={e=>updateAsset(selected,{textAlign:e.target.value as 'left'|'center'})}><option value="left">左揃え</option><option value="center">中央揃え</option></select></Field>}
          <AppearanceControls input={input} asset={assets[selected]} cover={selected===0} onChange={patch=>updateAsset(selected,patch)} onApplyAll={()=>{const patch=appearancePatch(assets[selected]);setAssets(prev=>prev.map(a=>({...a,...patch})));setToast('字体・色・文字背景を全ページに反映しました。画像は再生成していません。');}}/>
          <Field label="文字の大きさ" hint={`${Math.round(assets[selected].fontScale*100)}%`}><input type="range" aria-label="文字サイズ" min="0.85" max="1.2" step="0.05" value={assets[selected].fontScale} onChange={e=>updateAsset(selected,{fontScale:Number(e.target.value)})}/><small className="muted">はみ出す場合は、自動で読みやすいサイズに調整します。</small></Field>
          <Button onClick={()=>updateAsset(selected,{textPlacements:undefined,textBox:undefined})}>文字の位置を初期状態に戻す</Button></section></fieldset>          <div className="slide-strip">{plan.slides.map((s,i)=><button className={`thumbnail ${selected===i?'selected':''}`} key={i} aria-label={`${i+1}枚目を表示`} aria-pressed={selected===i} disabled={!!busy} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setSelected(Math.max(0,Math.min(plan.slides.length-1,i+(e.key==='ArrowDown'?1:-1))));}}} onClick={()=>setSelected(i)}><SlidePreview plan={plan} input={input} index={i} asset={assets[i]}/><span className="thumb-label"><strong>{String(i+1).padStart(2,'0')}</strong>{comparison?`比較 ${i+1}`:i===0?'表紙':i===plan.slides.length-1?(input.mode==='essay'?'まとめ':narrative?'結び':'まとめ'):`${narrative?'ページ':'内容'} ${i}`}{isAssetComplete(input,assets[i])?<CheckCircle2 size={14}/>:(assets[i].error||assets[i].futureError)?<AlertCircle size={14}/>:<span className="pending-dot"/>}</span></button>)}</div>
          <div data-guide-slot="edit"/><div className="editor-grid"><section data-guide-target="edit" className="panel canvas-panel"><div className="canvas-toolbar"><span>スライド {String(selected+1).padStart(2,'0')}<small>{size.width} × {size.height} px · {input.aspectRatio}</small></span></div><EditorViewport ratio={size.width/size.height}><SlidePreview plan={plan} input={input} index={selected} asset={assets[selected]} onReport={reportText}/>{editable&&<PhotoLayersEditor key={`photos:${selected}:${history.version}`} host={photoTools} asset={assets[selected]} report={textReport} onChange={patch=>updateAsset(selected,patch)}/>} {editable&&<CanvasTextEditor toolbarHost={textTools} key={`${selected}:${history.version}`} onAsset={patch=>updateAsset(selected,patch)} onFormat={textFormats=>updateAsset(selected,{textFormats})} plan={plan} input={input} onPlan={setPlan} onYear={patchInput} index={selected} asset={assets[selected]} report={textReport} onMove={textPlacements=>updateAsset(selected,{textPlacements})}/>}</EditorViewport><p className="direct-text-note">クリックで選択、ダブルクリックで文字を直接編集。ドラッグで移動、四隅や辺でサイズ変更。編集時は選んだ文字に太字・下線・色を付けられます。余白で編集終了。</p><div className="canvas-footer"><button className="icon-button" aria-label="前のスライド" disabled={!selected||!!busy} onClick={()=>setSelected(i=>i-1)}><ArrowLeft size={19}/></button><span>{selected+1} / {assets.length}</span><button className="icon-button" aria-label="次のスライド" disabled={selected===assets.length-1||!!busy} onClick={()=>setSelected(i=>i+1)}><ArrowRight size={19}/></button><Button disabled={!editable||(!isAssetComplete(input,assets[selected])&&!isSample)||!!issues.length} onClick={()=>void exportImages(selected)}><Download size={16}/>PNG</Button></div></section>
</div>
          <div data-guide-slot="caption"/><section data-guide-target="caption" className={`panel caption-panel ${inspector==='caption'?'inspector-visible':''}`}><button className="icon-button inspector-close" aria-label="キャプションを閉じる" onClick={()=>setInspector(null)}><X size={18}/></button><div className="panel-heading"><span className="round-icon"><FileText size={21}/></span><div><h2>伝わる言葉を、キャプションに。</h2><p>あなたの声に合わせて、自由に整えてください。</p></div><Button disabled={!editable} onClick={()=>void copyCaption()}><Copy size={16}/>コピー</Button></div><textarea aria-label="キャプション編集" maxLength={2100} rows={10} value={plan.caption} disabled={!editable} onChange={e=>setPlan({...plan,caption:e.target.value})}/><div className="caption-footer"><span>{plan.caption.length} / 2100文字</span><Button disabled={!editable} onClick={()=>void run('編集した文章をAIで校正しています',async()=>{const next=await api<Plan>('review',{input,plan});if(hasQuoteFlow(input,next)&&!hasQuoteFlow(input,plan))setAssets(prev=>prev.map((a,i)=>i===prev.length-1?{...a,image:undefined,review:undefined,error:undefined}:a));setPlan(next);setToast(hasQuoteFlow(input,next)&&!hasQuoteFlow(input,plan)?'文章を新しい流れに整えました。結び専用の背景は、生成ボタンで追加してください。':'文章全体を校正しました。画像は再生成していません。');})}><ShieldCheck size={16}/>文章全体をAIで校正<small>有料</small></Button><Button disabled={!editable} onClick={()=>download(new Blob([plan.caption],{type:'text/plain;charset=utf-8'}),'caption.txt')}><Download size={16}/>テキスト保存</Button></div></section>
        </div>}

        {view==='editor'&&phase===2&&plan&&<section className="panel download-panel"><div className="download-icon"><Check size={31}/></div><div className="eyebrow">READY TO SHARE</div><h2>あなたの投稿を、ひとまとめに。</h2><p>1枚ずつ独立した高画質PNGで保存できます。<br/>キャプションを添えて、Instagramへ。</p>{isSample&&<div className="sample-notice">操作サンプルの出力です。背景はプログラムで描画した作例です。</div>}
          <div className="download-gallery">{plan.slides.map((s,i)=><div key={i}><SlidePreview plan={plan} input={input} index={i} asset={assets[i]}/><Button disabled={exporting||!!issues.length||(!isSample&&!isAssetComplete(input,assets[i]))} onClick={()=>void exportImages(i)}><Download size={14}/>{String(i+1).padStart(2,'0')}.png</Button></div>)}</div>
          <div className="export-specs"><span><CheckCircle2 size={16}/>{size.width} × {size.height} px · {input.aspectRatio}</span><span><Layers size={16}/>{plan.slides.length}枚の独立したPNG</span><span><FileText size={16}/>キャプション付き</span></div>
          {(!isSample&&done!==assets.length || issues.length>0)&&<div className="validation-box">{issues.length?'文章の整合性に修正が必要です。':`背景が未生成のスライドが${assets.length-done}枚あります。`}「確認・編集する」で完成させてください。</div>}
          <PhoneTransfer plan={plan} input={input} assets={assets} password={password} disabled={exporting||!!busy||!!issues.length||(!isSample&&done!==assets.length)}/><div data-guide-slot="download"/><Button data-guide-target="download" className="primary download-main" disabled={exporting||!!busy||!!issues.length||(!isSample&&done!==assets.length)} onClick={()=>void exportImages()}>{exporting?<LoaderCircle className="spin" size={20}/>:<Download size={20}/>}全スライドをZIPで保存<ArrowRight size={20}/></Button><div className="download-secondary"><Button onClick={()=>void copyCaption()}><Copy size={17}/>キャプションをコピー</Button><Button onClick={()=>download(new Blob([plan.caption],{type:'text/plain;charset=utf-8'}),'caption.txt')}><FileText size={17}/>テキストを保存</Button></div><button className="text-button" onClick={()=>move(1)}><ArrowLeft size={16}/>編集に戻る</button>
        </section>}

        <footer className="page-footer"><span>Made with care, by mellō.</span><div>API呼出：文章 {usage.text} · 画像 {usage.image} · 点検 {usage.review}{usage.failed>0&&` · 失敗 ${usage.failed}`}<button onClick={()=>setHelp(true)}>利用について <ArrowUpRight size={13}/></button></div></footer>
        {config?.imageEstimateUSD&&<p className="estimate">設定された参考単価での画像概算：${(config.imageEstimateUSD*imageCalls).toFixed(2)} / 新しく生成する背景{imageCalls}枚。文章・点検料金別。実額はOpenAIで確認してください。</p>}
      </div>
    </main>
    {toast&&<div className="toast" role="status"><CheckCircle2 size={19}/>{toast}</div>}
    <GettingStarted autoShow={false} launch={guideLaunch} onStart={beginTutorial} disabled={!library.ready||!!busy||exporting||switching}/>
    <dialog ref={dialog} className="help-dialog" onCancel={()=>setHelp(false)}><button className="dialog-close icon-button" aria-label="閉じる" onClick={()=>setHelp(false)}><X size={22}/></button><div className="eyebrow">A GENTLE GUIDE</div><h2>はじめてのmellō</h2><p style={{marginBottom:16}}>テーマや想いを、Instagramの投稿画像とキャプションに整えるアプリです。</p><Button className="primary full" onClick={openGuide}><Sparkles size={17}/>無料のチュートリアル<ArrowRight size={17}/></Button><ol><li><strong>テーマを入力</strong><p>伝えたいこととモードを選びます。AIが構成・文章・キャプションを作り、校正します。</p></li><li><strong>文章を確認して、画像を生成</strong><p>「背景をつくる」を押したときだけ画像APIを呼び出します。生成前に文字や項目数を確認できます。</p></li><li><strong>自分らしく整えて保存</strong><p>物語・エッセイは文字エリアをドラッグして移動できます。エッセイは背景1枚を全ページで共有。文字やデザインの変更は無料。各スライドのPNGとキャプションをZIPで保存できます。</p></li></ol><div className="guide-note"><strong>料金と保存について</strong><p>OpenAIのAPI利用料が別途発生します。文章作成は通常2回、物語は全文生成・ページ分割・本文の独立点検の3回が基本です。整合性修正が必要なときは追加で1回校正します。背景1枚につき画像生成＋画像点検の2回が基本です。通信失敗でも料金が発生する場合があります。自動再試行はしません。</p><p>テーマごとに複数の投稿セットをマイスタジオへ自動保存します。入力途中・編集途中から再開でき、生成済み画像も保持します。保存先はこのブラウザです。別の端末とは同期されず、ブラウザのデータ削除で失われます。テーマ・参考画像は生成時にOpenAIへ送信されます。APIキーはサーバーだけで使用します。</p><p>画像の崩れや文章の正しさは完全に保証できません。投稿前に内容と画像をご確認ください。</p><p>画像比率は4:5（1080×1350）を初期値に、1:1（1080×1080）、9:16（1080×1920）から選べます。比率変更でもAI画像は再生成しません。</p></div><p className="connection-status">API設定：{config?.configured?'設定済み（接続は未検証）':'未設定'}<br/>文章：{config?.text} / 画像：{config?.image}</p><Button className="primary full" onClick={()=>setHelp(false)}>はじめる <ArrowRight size={17}/></Button></dialog>


  </div>;
}
