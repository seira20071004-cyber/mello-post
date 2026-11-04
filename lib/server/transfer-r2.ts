import {configureTransferStore,type TransferStore} from './transfer-store';
// Bind this adapter to the Sites R2 bucket in the hosting worker, before handling requests.
interface Bucket {get(key:string):Promise<{arrayBuffer():Promise<ArrayBuffer>}|null>;put(key:string,data:Uint8Array):Promise<unknown>;delete(keys:string[]):Promise<unknown>;list(options:{prefix:string;cursor?:string}):Promise<{objects:{key:string}[];truncated:boolean;cursor?:string}>}
export function r2TransferStore(bucket:Bucket):TransferStore{return {
  async get(key){const o=await bucket.get(`phone-transfers/${key}`);return o?new Uint8Array(await o.arrayBuffer()):null;},
  async put(key,data){await bucket.put(`phone-transfers/${key}`,data);},
  async remove(key){let cursor:string|undefined;do{const page=await bucket.list({prefix:`phone-transfers/${key}/`,cursor});if(page.objects.length)await bucket.delete(page.objects.map(o=>o.key));cursor=page.truncated?page.cursor:undefined;}while(cursor);},
};}

export function configureHostedTransfers(env:{BUCKET?:Bucket}){
  if(env.BUCKET)configureTransferStore(r2TransferStore(env.BUCKET));
  else configureTransferStore({async get(){throw new Error('画像の一時保管先が未設定です');},async put(){throw new Error('画像の一時保管先が未設定です');},async remove(){throw new Error('画像の一時保管先が未設定です');}});
}
