'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {listProjects,readProject,saveProject,cacheProjectThumbnail,type ProjectContent,type ProjectSummary,type StudioProject} from './projects';
import {renderCanvas} from './render';

type Identity={id:string;createdAt:number;revision:number};
async function thumbnailFor(snapshot:ProjectContent):Promise<string|undefined>{
  if(!snapshot.plan)return;
  const full=document.createElement('canvas');await renderCanvas(full,snapshot.plan,snapshot.input,0,snapshot.assets[0]);
  const small=document.createElement('canvas');small.width=240;small.height=427;small.getContext('2d')!.drawImage(full,0,0,240,427);return small.toDataURL('image/jpeg',.78);
}
export function useProjects(content:ProjectContent,enabled:boolean){
  const [projects,setProjects]=useState<ProjectSummary[]>([]),[ready,setReady]=useState(false),[status,setStatus]=useState(''),[failure,setFailure]=useState('');
  const identity=useRef<Identity|null>(null),latest=useRef(content),dirty=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),skip=useRef(false),queue=useRef(Promise.resolve()),pending=useRef(0),enabledRef=useRef(enabled),readyRef=useRef(false);
  latest.current=content;enabledRef.current=enabled;
  const refresh=useCallback(async()=>{const all=await listProjects();setProjects(all);readyRef.current=true;setReady(true);setFailure('');return all;},[]);
  useEffect(()=>{let canceled=false;listProjects().then(async all=>{
    if(canceled)return;setProjects(all);readyRef.current=true;setReady(true);
    // Legacy migration keeps all source data synchronously; previews are filled in later.
    for(const p of all.filter(p=>!p.thumbnail&&p.stage!=='idea')){
      if(canceled)break;
      try{const thumbnail=await thumbnailFor(await readProject(p.id));if(thumbnail&&!canceled){await cacheProjectThumbnail(p.id,p.revision,thumbnail);setProjects(current=>current.map(item=>item.id===p.id&&item.revision===p.revision?{...item,thumbnail}:item));}}catch{ /* Preview generation never blocks opening saved content. */ }
    }
  }).catch(()=>{if(!canceled){setFailure('マイスタジオを読み込めませんでした。ブラウザの保存設定をご確認ください。');setStatus('保存機能を利用できません');}});return()=>{canceled=true;};},[]);

  const flush=useCallback(async():Promise<boolean>=>{
    clearTimeout(timer.current);
    if(!readyRef.current)return false;
    if(!dirty.current){await queue.current;return !dirty.current;}
    const current=latest.current;
    if(!current.input.theme.trim()&&!current.plan&&!identity.current){dirty.current=false;return true;}
    identity.current??={id:crypto.randomUUID(),createdAt:Date.now(),revision:0};
    const owner=identity.current;
    const snapshot=structuredClone(current);
    dirty.current=false;pending.current++;setStatus('保存しています…');
    let ok=true;
    const work=queue.current.then(async()=>{
      let thumbnail:string|undefined;
      if(snapshot.plan)try{thumbnail=await thumbnailFor(snapshot);}catch{ /* A font or preview error must never discard the editable project. */ }
      const saved=await saveProject({...snapshot,version:2,id:owner.id,createdAt:owner.createdAt,savedAt:Date.now(),revision:owner.revision,archived:false},owner.revision,thumbnail);
      owner.revision=saved.revision;
      const all=await listProjects();setProjects(all);
      if(identity.current===owner&&!dirty.current){setStatus('マイスタジオに保存済み');setFailure('');}
    }).catch(error=>{
      ok=false;if(identity.current===owner){dirty.current=true;setStatus('まだ保存できていません');setFailure(error instanceof Error&&error.name!=='QuotaExceededError'?error.message:'保存容量が不足しています。画像をダウンロードするか、ブラウザの空き容量を確認してください。');}
    }).finally(()=>{pending.current--;});
    queue.current=work;await work;return ok;
  },[]);

  useEffect(()=>{
    if(!ready||!enabled)return;
    if(skip.current){skip.current=false;return;}
    if(!content.input.theme.trim()&&!content.plan&&!identity.current)return;
    dirty.current=true;setStatus('変更を保存します…');
    timer.current=setTimeout(()=>void flush(),750);
    return()=>clearTimeout(timer.current);
  },[content,enabled,ready,flush]);
  useEffect(()=>{
    const onVisibility=()=>{if(document.visibilityState==='hidden'&&enabledRef.current)void flush();};
    const beforeUnload=(event:BeforeUnloadEvent)=>{if(dirty.current||pending.current){void flush();event.preventDefault();event.returnValue='';}};
    document.addEventListener('visibilitychange',onVisibility);window.addEventListener('beforeunload',beforeUnload);
    return()=>{document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('beforeunload',beforeUnload);};
  },[flush]);
  const activate=useCallback((project:StudioProject)=>{clearTimeout(timer.current);identity.current={id:project.id,createdAt:project.createdAt,revision:project.revision};dirty.current=false;skip.current=true;setFailure('');setStatus('マイスタジオに保存済み');},[]);
  const begin=useCallback(()=>{clearTimeout(timer.current);identity.current=null;dirty.current=false;skip.current=false;setFailure('');setStatus('テーマを入力すると自動保存');},[]);
  const saveCopy=useCallback(async()=>{await queue.current;identity.current=null;dirty.current=true;return flush();},[flush]);
  return {projects,ready,status,failure,flush,refresh,activate,begin,saveCopy,activeId:identity.current?.id};
}
