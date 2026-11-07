import 'fake-indexeddb/auto';
import {beforeEach,describe,expect,it} from 'vitest';
import {COLLECTION_DB,listPeople,savePerson,updatePerson} from '../lib/person-collection';
const image={source:'data:image/png;base64,aGVsbG8=',width:100,height:200};
beforeEach(async()=>{await new Promise<void>((resolve,reject)=>{const req=indexedDB.deleteDatabase(COLLECTION_DB);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error);});});
describe('person collection',()=>{
 it('isolates saved people and their changes between accounts',async()=>{
   const owner=await savePerson(image,'管理者の素材');
   const member=await savePerson(image,'招待ユーザーの素材','member-a');
   await expect(updatePerson(owner.id,{name:'別の人'},'member-a')).rejects.toThrow();
   await updatePerson(member.id,{archived:true},'member-a');
   expect(await listPeople()).toEqual([owner]);
   expect(await listPeople('member-a')).toEqual([expect.objectContaining({id:member.id,archived:true})]);
   expect(await listPeople('member-b')).toEqual([]);
 });
 it('persists the edited PNG and dimensions across fresh database connections',async()=>{const saved=await savePerson(image,'  お母さん  ');expect(await listPeople()).toEqual([{...saved,name:'お母さん',...image}]);});
 it('renames without changing the image and can archive and restore',async()=>{const saved=await savePerson(image,'人物');await updatePerson(saved.id,{name:'お母さん'});await updatePerson(saved.id,{archived:true});expect((await listPeople())[0]).toMatchObject({...image,name:'お母さん',archived:true});await updatePerson(saved.id,{archived:false});expect((await listPeople())[0].archived).toBe(false);});
 it('keeps an independent copy already placed in a slide',async()=>{const saved=await savePerson(image,'人物'),slide={source:saved.source};await updatePerson(saved.id,{archived:true,name:'変更'});expect(slide.source).toBe(image.source);});
 it('rejects empty names, non-PNG data and invalid dimensions',async()=>{await expect(savePerson(image,' ')).rejects.toThrow();await expect(savePerson({...image,source:'https://example.com/photo.png'},'人物')).rejects.toThrow();await expect(savePerson({...image,width:0},'人物')).rejects.toThrow();expect(await listPeople()).toEqual([]);});
 it('does not destroy a record when a rename is invalid',async()=>{const saved=await savePerson(image,'元の名前');await expect(updatePerson(saved.id,{name:''})).rejects.toThrow();expect((await listPeople())[0].name).toBe('元の名前');});
 it('reports missing entries instead of creating incomplete records',async()=>{await expect(updatePerson('missing',{name:'名前'})).rejects.toThrow('人物が見つかりません');});
});
