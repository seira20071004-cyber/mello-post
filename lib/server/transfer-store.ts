import {mkdir,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {join} from 'node:path';
export interface TransferStore {get(key:string):Promise<Uint8Array|null>;put(key:string,data:Uint8Array):Promise<void>;remove(key:string):Promise<void>;cleanup?():Promise<void>}
const root=()=>join(process.cwd(),'.data','transfers');
const local:TransferStore={
  async get(key){try{return new Uint8Array(await readFile(join(root(),key)));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}},
  async put(key,data){const path=join(root(),key);await mkdir(join(path,'..'),{recursive:true});await writeFile(path,data,{mode:0o600});},
  async remove(key){await rm(join(root(),key),{recursive:true,force:true});},
  async cleanup(){await mkdir(root(),{recursive:true});for(const name of await readdir(root())){try{const m=JSON.parse(await readFile(join(root(),name,'meta.json'),'utf8'));if(m.expiresAt<Date.now())await rm(join(root(),name),{recursive:true,force:true});}catch{/* incomplete creation is never visible */}}},
};
const globalStore=globalThis as typeof globalThis&{melloTransferStore?:TransferStore};
export function configureTransferStore(store:TransferStore){globalStore.melloTransferStore=store;}
export function transferStore(){return globalStore.melloTransferStore||local;}
