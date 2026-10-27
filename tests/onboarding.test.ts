import {describe,it,expect} from 'vitest';
import {rememberWelcome,shouldShowWelcome} from '../lib/onboarding';
import {initialInput} from '../lib/schema';
import {tutorialSteps,nextTutorialStep,canAdvanceTutorial,tutorialForScreen} from '../lib/tutorial';

describe('actual Studio tutorial',()=>{
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
  it.each(['story','comic','essay','info','comparison','quote'] as const)('guides every real input and action for %s',mode=>{
    const steps=tutorialSteps(mode).map(s=>s.id);
    expect(new Set(steps).size).toBe(steps.length);
    expect(steps.slice(0,5)).toEqual(['theme','mode','details','target','count']);
    expect(steps.includes('future-year')).toBe(mode==='comparison');
    expect(steps.slice(-8)).toEqual(['generate','edit','images','caption','save','download','open-library','library']);
    expect(nextTutorialStep('theme',mode,-1)).toBe('theme');
    expect(nextTutorialStep('library',mode)).toBe('library');
    expect(nextTutorialStep('count',mode)).toBe(mode==='comparison'?'now-year':'age');
  });
  it('requires meaningful theme and ordered years, and never advances paid actions by Next',()=>{
    expect(canAdvanceTutorial('theme',initialInput,false)).toBe(false);
    expect(canAdvanceTutorial('theme',{...initialInput,theme:'親子'},false)).toBe(true);
    expect(canAdvanceTutorial('theme',{...initialInput,theme:'親子'},true)).toBe(false);
    expect(canAdvanceTutorial('target',initialInput,false)).toBe(true);
    expect(canAdvanceTutorial('future-year',{...initialInput,futureYear:initialInput.nowYear},false)).toBe(false);
    for(const step of ['generate','images','save','download','open-library'] as const)expect(canAdvanceTutorial(step,initialInput,false)).toBe(false);
  });
  it('moves with successful real screen changes, retaining guidance on failures or partial images',()=>{
    expect(tutorialForScreen('generate',0,'editor',false)).toBe('generate');
    expect(tutorialForScreen('generate',1,'editor',false)).toBe('edit');
    expect(tutorialForScreen('images',1,'editor',false)).toBe('images');
    expect(tutorialForScreen('images',1,'editor',true)).toBe('caption');
    expect(tutorialForScreen('save',2,'editor',true)).toBe('download');
    expect(tutorialForScreen('open-library',2,'editor',true)).toBe('open-library');
    expect(tutorialForScreen('open-library',2,'library',true)).toBe('library');
    expect(tutorialForScreen('edit',0,'editor',false)).toBe('theme');
    expect(tutorialForScreen('now-year',0,'editor',false)).toBe('now-year');
  });
});
