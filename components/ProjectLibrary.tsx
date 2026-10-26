'use client';
import {useState} from 'react';
import {Archive,ArrowRight,Clock3,Flower2,Layers,Plus,Search,ShieldCheck,Undo2} from 'lucide-react';
import type {ProjectSummary} from '@/lib/projects';
import {templates} from '@/lib/templates';

const labels={idea:'入力途中',editing:'編集中',ready:'画像生成済み'};
export default function ProjectLibrary({projects,ready,disabled,onOpen,onNew,onArchive}:{projects:ProjectSummary[];ready:boolean;disabled:boolean;onOpen:(id:string)=>void;onNew:()=>void;onArchive:(id:string,archived:boolean)=>void}){
  const [search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[archived,setArchived]=useState(false);
  const visible=projects.filter(p=>p.archived===archived&&(filter==='all'||p.stage===filter)&&p.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <section className="project-library">
    <div className="library-heading"><div><div className="eyebrow">YOUR IDEAS, ALWAYS HERE</div><h1>マイスタジオ<span>想いのつづきは、ここから。</span></h1><p>テーマも、つくりかけの投稿も。好きなときに続きを編集できます。</p></div><button className="button primary" disabled={disabled||!ready} onClick={onNew}><Plus size={18}/>新しい投稿をつくる</button></div>
    <div className="library-toolbar"><div className="library-tabs"><button className={!archived?'active':''} onClick={()=>setArchived(false)}>投稿セット <span>{projects.filter(p=>!p.archived).length}</span></button><button className={archived?'active':''} onClick={()=>setArchived(true)}><Archive size={15}/>アーカイブ <span>{projects.filter(p=>p.archived).length}</span></button></div><label className="project-search"><Search size={17}/><input aria-label="保存したテーマを検索" placeholder="テーマで探す" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
    <div className="library-filters" aria-label="保存状態で絞り込み">{[['all','すべて'],['idea','入力途中'],['editing','編集中'],['ready','画像生成済み']].map(([value,label])=><button aria-pressed={filter===value} className={filter===value?'selected':''} key={value} onClick={()=>setFilter(value)}>{label}</button>)}</div>
    {!ready?<div className="library-empty"><Layers size={34}/><h2>投稿セットを読み込んでいます…</h2></div>:!visible.length?<div className="library-empty"><span><Flower2 size={35}/></span><h2>{search||filter!=='all'?'条件に合う投稿はありません':archived?'アーカイブはまだありません':'最初のアイデアを、残してみましょう。'}</h2><p>{search||filter!=='all'?'検索する言葉や絞り込みを変えてみてください。':archived?'整理した投稿はここから元に戻せます。':'テーマを入力すると、ここに自動で保存されます。'}</p>{!archived&&!search&&filter==='all'&&<button className="button primary" disabled={disabled} onClick={onNew}><Plus size={18}/>投稿をつくる</button>}</div>:<div className="project-grid">{visible.map(project=><article className="project-card" key={project.id}>
      <button className={`project-cover cover-${project.template}`} disabled={disabled||archived} onClick={()=>onOpen(project.id)} aria-label={`「${project.title}」を開く`}>
        {project.thumbnail?<img src={project.thumbnail} alt={`${project.title}の表紙`} style={{aspectRatio:(project.aspectRatio||'9:16').replace(':','/')}} loading="lazy"/>:<div className="idea-cover" style={{color:templates[project.template].ink}}><span>{project.stage==='idea'?'A LITTLE IDEA':'YOUR POST COLLECTION'}</span><Flower2 size={48} strokeWidth={1}/><strong>{project.title}</strong><small>{templates[project.template].name} · {project.slideCount}枚</small></div>}
        <span className={`project-stage stage-${project.stage}`}>{labels[project.stage]}</span>{project.isSample&&<span className="project-sample">サンプル</span>}
      </button>
      <div className="project-card-body"><h2>{project.title}</h2><p className="project-meta"><span><Layers size={14}/>{project.slideCount}枚</span><span>背景 {project.imageCount}/{project.slideCount}枚</span></p><p className="project-updated"><Clock3 size={13}/>{new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'}).format(project.savedAt)} 更新</p>
      <div className="project-card-actions">{archived?<button className="button resume-button" disabled={disabled} onClick={()=>onArchive(project.id,false)}><Undo2 size={16}/>マイスタジオに戻す</button>:<button className="button resume-button" disabled={disabled} onClick={()=>onOpen(project.id)}>続きから編集<ArrowRight size={16}/></button>}{!archived&&<button className="icon-button" disabled={disabled} aria-label={`「${project.title}」をアーカイブ`} title="アーカイブへ移動（あとから戻せます）" onClick={()=>onArchive(project.id,true)}><Archive size={17}/></button>}</div></div>
    </article>)}</div>}
    <div className="library-storage-note"><ShieldCheck size={18}/><p>このブラウザに自動保存しています。画像・文章・デザインをまとめて復元できます。<br/><span>別の端末とは同期されません。ブラウザのデータを削除すると保存した投稿も消えるため、完成した画像はダウンロードしてください。</span></p></div>
  </section>;
}
