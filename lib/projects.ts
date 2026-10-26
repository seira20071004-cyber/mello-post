import { z } from 'zod';
import {appearanceSchema} from './appearance';
import { inputSchema, planSchema, itemSchema, slideSchema, emptyUsage, type Input, type Plan, type SlideAsset, type Usage, textBoxSchema } from './schema';

export type ProjectContent = {input:Input;plan:Plan|null;assets:SlideAsset[];usage:Usage;reference?:string;isSample:boolean;phase:number;selected:number;tab:'text'|'image'};
export type StudioProject = ProjectContent & {version:2;id:string;createdAt:number;savedAt:number;revision:number;archived:boolean};
export type ProjectSummary = Pick<StudioProject,'id'|'createdAt'|'savedAt'|'revision'|'archived'|'isSample'> & {title:string;template:Input['template'];color:string;aspectRatio?:Input['aspectRatio'];slideCount:number;imageCount:number;stage:'idea'|'editing'|'ready';thumbnail?:string};

// Editing may temporarily leave a title or caption blank. Persistence must preserve it;
// strict publication validation still happens in schema.ts before generation/export.
const editablePlanSchema=planSchema.extend({
  title:z.string(),caption:z.string(),
  items:z.array(itemSchema.extend({title:z.string(),body:z.string()})).max(16),
  slides:z.array(slideSchema.extend({title:z.string(),body:z.string(),emphasis:z.string()})).min(3).max(10),
});
const contentSchema=z.object({
  input:inputSchema.extend({theme:z.string().max(120)}),plan:editablePlanSchema.nullable(),
  assets:z.array(z.object({image:z.string().optional(),error:z.string().optional(),fontScale:z.number().min(.5).max(2),sample:z.boolean().optional(),textBox:textBoxSchema.optional(),textAlign:z.enum(['left','center']).optional(),...appearanceSchema.shape,review:z.object({unexpectedText:z.boolean(),anatomyConcern:z.boolean(),styleConcern:z.boolean(),notes:z.array(z.string())}).optional()})),
  usage:z.object({text:z.number(),image:z.number(),review:z.number(),failed:z.number(),inputTokens:z.number(),outputTokens:z.number()}),
  reference:z.string().optional(),isSample:z.boolean(),phase:z.number().int().min(0).max(2),selected:z.number().int().min(0).max(9),tab:z.enum(['text','image']),
});
const projectSchema=contentSchema.extend({version:z.literal(2),id:z.string(),createdAt:z.number(),savedAt:z.number(),revision:z.number().int().min(0),archived:z.boolean()});

export function parseProject(value:unknown):StudioProject {
  const raw=value as {input?:{aspectRatio?:string}};
  const compatible=raw?.input&&!raw.input.aspectRatio?{...raw,input:{...raw.input,aspectRatio:'9:16'}}:value;
  const project=projectSchema.parse(compatible);
  if(project.plan&&project.assets.length!==project.plan.slides.length)throw new Error('保存された画像とスライドの数が一致しません');
  return project;
}
export function summarizeProject(project:StudioProject,thumbnail?:string):ProjectSummary {
  const imageCount=project.assets.filter(a=>a.image).length;
  return {id:project.id,createdAt:project.createdAt,savedAt:project.savedAt,revision:project.revision,archived:project.archived,isSample:project.isSample,title:project.input.theme.trim()||project.plan?.title||'無題の投稿',template:project.input.template,color:project.input.color,aspectRatio:project.input.aspectRatio,slideCount:project.plan?.slides.length||project.input.count,imageCount,stage:!project.plan?'idea':imageCount===project.plan.slides.length?'ready':'editing',thumbnail};
}
function openDB():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('mello-studio',2);
    request.onupgradeneeded=()=>{
      const db=request.result,tx=request.transaction!;
      const projects=db.createObjectStore('projects',{keyPath:'id'});
      const summaries=db.createObjectStore('project-summaries',{keyPath:'id'});
      if(db.objectStoreNames.contains('drafts')) {
        const previous=tx.objectStore('drafts').get('current');
        previous.onsuccess=()=>{
          if(!previous.result)return;
          try {
            const old=previous.result;
            const migrated=parseProject({...old,version:2,id:'legacy-current',createdAt:old.savedAt||Date.now(),savedAt:old.savedAt||Date.now(),revision:1,archived:false,phase:old.plan?1:0,selected:0,tab:'text',usage:old.usage||emptyUsage()});
            projects.put(migrated);summaries.put(summarizeProject(migrated));
          }catch{ /* Keep the original record intact even if it cannot be migrated. */ }
        };
      }
    };
    request.onblocked=()=>reject(new Error('別のタブでスタジオが開いています。そのタブを再読み込みしてください。'));
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db);};
    request.onerror=()=>reject(request.error);
  });
}
export async function listProjects():Promise<ProjectSummary[]> {
  const db=await openDB();try{return await new Promise((resolve,reject)=>{const r=db.transaction('project-summaries').objectStore('project-summaries').getAll();r.onsuccess=()=>resolve((r.result as ProjectSummary[]).sort((a,b)=>b.savedAt-a.savedAt));r.onerror=()=>reject(r.error);});}finally{db.close();}
}
export async function readProject(id:string):Promise<StudioProject> {
  const db=await openDB();try{return await new Promise((resolve,reject)=>{const r=db.transaction('projects').objectStore('projects').get(id);r.onsuccess=()=>{try{if(!r.result)throw new Error('この投稿セットが見つかりません');resolve(parseProject(r.result));}catch(error){reject(error);}};r.onerror=()=>reject(r.error);});}finally{db.close();}
}
export class ProjectConflictError extends Error {constructor(){super('別のタブでこの投稿が更新されました。今の編集を「別セットとして保存」すると、両方の内容を残せます。');}}
export async function saveProject(project:StudioProject,expectedRevision:number,thumbnail?:string):Promise<StudioProject> {
  const valid=parseProject(project),db=await openDB();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(['projects','project-summaries'],'readwrite'),store=tx.objectStore('projects');
    let saved:StudioProject;let reason:Error|undefined;
    const r=store.get(project.id);
    r.onsuccess=()=>{
      const current=r.result as StudioProject|undefined;
      if((current?.revision||0)!==expectedRevision){reason=new ProjectConflictError();tx.abort();return;}
      saved={...valid,createdAt:current?.createdAt||valid.createdAt,savedAt:Date.now(),revision:expectedRevision+1};
      store.put(saved);tx.objectStore('project-summaries').put(summarizeProject(saved,thumbnail));
    };
    tx.oncomplete=()=>resolve(saved);tx.onerror=()=>reject(reason||tx.error);tx.onabort=()=>reject(reason||tx.error||new Error('保存に失敗しました'));
  });}finally{db.close();}
}
export async function setProjectArchived(id:string,archived:boolean):Promise<void> {
  const db=await openDB();try{await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(['projects','project-summaries'],'readwrite');
    const update=(storeName:string)=>{const store=tx.objectStore(storeName),r=store.get(id);r.onsuccess=()=>{if(r.result)store.put({...r.result,archived,revision:r.result.revision+1});};};
    update('projects');update('project-summaries');
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });}finally{db.close();}
}
export async function cacheProjectThumbnail(id:string,revision:number,thumbnail:string):Promise<void> {
  const db=await openDB();try{await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('project-summaries','readwrite'),store=tx.objectStore('project-summaries'),r=store.get(id);
    r.onsuccess=()=>{if(r.result?.revision===revision)store.put({...r.result,thumbnail});};
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });}finally{db.close();}
}
