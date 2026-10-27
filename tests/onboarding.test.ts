import {describe,it,expect} from 'vitest';
import {createPractice,rememberWelcome,shouldShowWelcome,practiceText,editPractice} from '../lib/onboarding';
import {initialInput,validatePlan} from '../lib/schema';
import {storySample} from '../lib/reading-samples';

describe('isolated beginner practice',()=>{
  it.each(['story','comic','essay','info','comparison','quote'] as const)('opens a complete offline practice for %s',mode=>{
    const p=createPractice(mode);
    expect(validatePlan(p.plan,p.input)).toEqual([]);
    expect(JSON.stringify(p.plan)).not.toContain('美容');
    expect(practiceText(p).trim()).not.toBe('');
    const edited=editPractice(p,'練習で直した文章。');expect(practiceText(edited)).toBe('練習で直した文章。');expect(practiceText(p)).not.toBe(practiceText(edited));
    if(mode==='comparison'){expect(edited.plan.slides[1].body).toBe('');expect(edited.plan.comparisons![1].nowCaption).toBe('練習で直した文章。');}
    expect(p.assets).toHaveLength(p.plan.slides.length);
    expect(p.assets.every(a=>a.sample&&!a.image&&!a.futureImage)).toBe(true);
  });
  it('does not edit shared samples or a separately created practice',()=>{
    const first=createPractice(),second=createPractice();
    first.plan.slides[1].body='練習で変えた文章';first.input.theme='練習のテーマ';first.assets[1].fontScale=1.2;
    expect(second.plan.slides[1].body).toBe(storySample.slides[1].body);
    expect(storySample.slides[1].body).not.toBe(first.plan.slides[1].body);
    expect(second.input.theme).not.toBe(first.input.theme);
    expect(second.assets[1].fontScale).toBe(1);
    expect(initialInput.theme).toBe('');
  });
  it('remembers dismissal in its own key without touching existing draft storage',()=>{
    const values=new Map([['mello-existing-draft','keep me']]);
    const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
    expect(shouldShowWelcome(storage)).toBe(true);
    rememberWelcome(storage);
    expect(shouldShowWelcome(storage)).toBe(false);
    expect(values.get('mello-existing-draft')).toBe('keep me');
    expect(values.size).toBe(2);
  });
  it('still works when the browser denies storage access',()=>{
    const denied={getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('blocked');}};
    expect(shouldShowWelcome(denied)).toBe(true);
    expect(()=>rememberWelcome(denied)).not.toThrow();
  });
});
