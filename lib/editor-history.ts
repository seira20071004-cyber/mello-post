export class EditorHistory<T>{
 past:T[]=[];future:T[]=[];group=-1;
 constructor(public present:T,private equal:(a:T,b:T)=>boolean=(a,b)=>a===b){}
 reset(value:T){this.present=value;this.past=[];this.future=[];this.group=-1;}
 record(value:T,group:number){if(this.equal(this.present,value))return false;if(this.group!==group||!this.past.length)this.past.push(this.present);this.past=this.past.slice(-50);this.present=value;this.future=[];this.group=group;return true;}
 undo(){const value=this.past.pop();if(value===undefined)return;this.future.push(this.present);this.present=value;this.group=-1;return value;}
 redo(){const value=this.future.pop();if(value===undefined)return;this.past.push(this.present);this.present=value;this.group=-1;return value;}
}
