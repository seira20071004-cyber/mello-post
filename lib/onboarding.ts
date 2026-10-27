import {initialInput,type Input,type Plan,type SlideAsset} from './schema';
import {storySample,essaySample} from './reading-samples';
import {comicSample,quoteSample,comparisonSample} from './additional-samples';
import {samplePlan} from './sample';
import {newSlideAsset} from './text-layout';

const welcomeKey='mello:welcome:v1';
type WelcomeStorage=Pick<Storage,'getItem'|'setItem'>;
export type PracticeSession={input:Input;plan:Plan;assets:SlideAsset[]};
const parentingInformation:Plan={
  ...samplePlan,title:'朝の支度で試したい声かけ5選',
  artDirection:'Gentle watercolor of a mother in her 30s and a young child getting ready at home. Warm ivory and rose. No writing.',
  followCTA:'毎日の親子の声かけを、少しずつ。次のヒントも読みたい方はフォローしてね。',
  items:[
    {id:1,title:'次の行動を一つにする',body:'「早くして」より「靴下を履いたら玄関へ行こう」。今することを一つだけ伝えます。'},
    {id:2,title:'小さな選択肢を渡す',body:'「この服を着て」より「青と黄色、どちらにする？」。選べるものを二つだけ用意します。'},
    {id:3,title:'始めたところを見つける',body:'「まだ終わらないの？」より「片方の靴下、履けたね」。できた動作をそのまま伝えます。'},
    {id:4,title:'気持ちを短く受け止める',body:'「泣かないで」より「まだ遊びたかったね」。一言受け止めてから、次の行動を伝えます。'},
    {id:5,title:'一緒に始めてみる',body:'「自分でやって」より「最初のボタン、一緒に留めようか」。手伝う範囲を具体的にします。'},
  ],
  slides:samplePlan.slides.map((s,i)=>({...s,
    title:['朝の支度、どう伝える？\n声かけのヒント5選','することを一つに、\n選択肢は二つに','できたところに、\n目を向ける','次の行動の前に、\n気持ちをひとこと','最初の一歩は、\n一緒でもいい','明日の朝、\nひとつ試してみよう'][i],
    body:['忙しい朝に試したい、具体的な言い方を集めました。','長い説明を、短い言葉にしてみましょう。','できた動作を見つけたら、そのまま言葉に。','次の行動を伝える前に、一言だけ受け止めます。','困っているところだけ、そっと手伝います。','次の行動・選択肢・できた動作・気持ち・一緒の一歩。\nひとつ選んで、できるときに。'][i],
    emphasis:['ひとつだけ、試してみよう','短い言葉で、具体的に','できたところを言葉に','気持ちに、一言うなずく','困ったところだけ一緒に','できる朝に、できることから'][i],nextTeaser:['まずは、次の行動と服選びの声かけから','次は、できたところを言葉に','次は、まだ遊びたい気持ちへの一言','次は、一緒に始める声かけ','最後に、明日試したい言い方をおさらい',''][i],
    illustration:'A mother in her 30s helping a small child get ready at home, quiet watercolor, no text.',
  })),
  caption:'忙しい朝の声かけを、少しだけ具体的にする練習用の投稿です。全部を試そうとせず、使いやすい言い方をひとつ選んでみてください。\n#子育て #親子の会話 #朝の支度',
};
export function shouldShowWelcome(storage:WelcomeStorage):boolean{
  try{return storage.getItem(welcomeKey)!=='seen';}catch{return true;}
}
export function rememberWelcome(storage:WelcomeStorage):void{
  try{storage.setItem(welcomeKey,'seen');}catch{/* The guide still closes when browser storage is unavailable. */}
}
// Practice data never enters the project library or an API request.
export function createPractice(mode:Input['mode']='story'):PracticeSession{
  const source={story:storySample,comic:comicSample,essay:essaySample,info:parentingInformation,comparison:comparisonSample,quote:quoteSample}[mode];
  const input={...initialInput,mode,theme:source.title,count:source.slides.length};
  const plan=structuredClone(source);
  if(mode==='comparison'&&plan.comparisons)plan.comparisons[1].nowCaption='家族と過ごす、いまの暮らし。';
  return {input,plan,assets:source.slides.map((_,i)=>({...newSlideAsset(input,i),sample:true}))};
}
export function practiceText(practice:PracticeSession):string{
  return practice.input.mode==='comparison'?practice.plan.comparisons![1].nowCaption:practice.plan.slides[1].body;
}
export function editPractice(practice:PracticeSession,text:string):PracticeSession{
  return {...practice,plan:{...practice.plan,...(practice.input.mode==='comparison'
    ?{comparisons:practice.plan.comparisons!.map((p,i)=>i===1?{...p,nowCaption:text}:p)}
    :{slides:practice.plan.slides.map((s,i)=>i===1?{...s,body:text}:s)})}};
}
