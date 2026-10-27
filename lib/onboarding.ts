const welcomeKey='mello:welcome:v2';
type WelcomeStorage=Pick<Storage,'getItem'|'setItem'>;
export function shouldShowWelcome(storage:WelcomeStorage):boolean{
  try{return storage.getItem(welcomeKey)!=='seen';}catch{return true;}
}
export function rememberWelcome(storage:WelcomeStorage):void{
  try{storage.setItem(welcomeKey,'seen');}catch{/* The guide remains usable without browser storage. */}
}
