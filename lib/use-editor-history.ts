'use client';
import {useRef,useState,useLayoutEffect,useEffect,useCallback} from 'react';
import type {Input,Plan,SlideAsset} from './schema';
import {EditorHistory} from './editor-history';
export type EditorSnapshot={input:Input;plan:Plan|null;assets:SlideAsset[]};
const equal=(a:EditorSnapshot,b:EditorSnapshot)=>a.input===b.input&&a.plan===b.plan&&a.assets===b.assets;
export function useEditorHistory(value:EditorSnapshot,context:string,enabled:boolean,apply:(value:EditorSnapshot)=>void){
 const h=useRef(new EditorHistory(value,equal)),key=useRef(context),group=useRef(0),lastKey=useRef(0),applyRef=useRef(apply);applyRef.current=apply;
 const [version,setVersion]=useState(0),[,refresh]=useState(0);
 useLayoutEffect(()=>{if(key.current!==context||(!enabled&&!equal(h.current.present,value))){key.current=context;h.current.reset(value);refresh(n=>n+1);}else if(enabled&&(h.current.record(value,group.current)))refresh(n=>n+1);},[value,context,enabled]);
 const undo=useCallback(()=>{const next=h.current.undo();if(next){applyRef.current(next);setVersion(n=>n+1);}},[]);
 const redo=useCallback(()=>{const next=h.current.redo();if(next){applyRef.current(next);setVersion(n=>n+1);}},[]);
 useEffect(()=>{const pointer=()=>{group.current++;};const keyboard=(e:KeyboardEvent)=>{if(e.isComposing)return;if(enabled&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo();return;}if(enabled&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}const now=Date.now();if(now-lastKey.current>600||e.ctrlKey||e.metaKey)group.current++;lastKey.current=now;};document.addEventListener('pointerdown',pointer,true);document.addEventListener('keydown',keyboard,true);return()=>{document.removeEventListener('pointerdown',pointer,true);document.removeEventListener('keydown',keyboard,true);};},[enabled,undo,redo]);
 return {undo,redo,version,canUndo:enabled&&h.current.past.length>0,canRedo:enabled&&h.current.future.length>0};
}
