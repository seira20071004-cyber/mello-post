import type {Input,Plan,SlideAsset} from './schema';
export const themeExamples={
  story:'雨の日、娘が私のぬれた袖を小さなタオルで拭いてくれた',
  essay:'寝かしつけのあと、今日も怒ってしまった自分に伝えたいこと',
  info:'朝の支度が進まない子どもに、試してみたい声かけ3選',
  comic:'保育園の帰り道、拾った石を「ママの宝物」と渡してくれる息子',
  comparison:'家族で出かける今の休日と、子どもが巣立った20年後の休日',
  quote:'がんばりすぎているママへ。「ちゃんとしなきゃ」が少し軽くなる言葉',
} satisfies Record<Input['mode'],string>;
export const modes={
  story:{name:'短い物語',description:'日常の一場面から、心に残る気づきへ。短い言葉と絵で伝えます。',hint:'会話・出来事・そのときの気持ちを教えてください。未入力なら創作の物語をつくります。'},
  essay:{name:'思いを綴る',description:'同じ背景に、あなたの思いを。余白のある読みものに整えます。',hint:'大切にしている考え、伝えたい思い、実際の経験などを書いてください。'},
  info:{name:'情報を伝える',description:'コツやノウハウを、順序立ててわかりやすく。',hint:'伝えたいこと、入れたい内容などがあれば教えてください。'},
  comic:{name:'ゆる漫画',description:'短い縦書きと、ゆるい線画。日常のひとコマを、絵と余白で。',hint:'思い出した場面や会話、最後に伝えたい気づきなど。'},
  comparison:{name:'いまと未来',description:'家族で乗る車、休日の過ごし方。いまと未来の暮らしを、はっきりした違いで。',hint:'比べたい場所・人物・暮らし方を教えてください。例：子どもと荷物でいっぱいの車と、夫婦で身軽に出かける未来。'},
  quote:{name:'ことばカード',description:'よくある後悔を、明日の選択へ。言い換えを重ね、最後は希望の言葉で。',hint:'届けたい思い、見つめ直したい考え方など。実在の人の名言としては生成しません。'},
} as const;
export function isNarrative(input:Pick<Input,'mode'>){return ['story','essay','comic','quote'].includes(input.mode);}
export function usesSharedBackground(input:Pick<Input,'mode'>){return input.mode==='essay'||input.mode==='quote';}
export function isAssetComplete(input:Pick<Input,'mode'>,asset:Pick<SlideAsset,'image'|'futureImage'>){return !!asset.image&&(input.mode!=='comparison'||!!asset.futureImage);}
export function pendingImageCalls(input:Pick<Input,'mode'>,assets:Pick<SlideAsset,'image'|'futureImage'>[],plan?:Plan|null){
  if(input.mode==='comparison')return assets.reduce((n,a)=>n+Number(!a.image)+Number(!a.futureImage),0);
  if(input.mode==='quote')return backgroundGroups(input,assets.length,plan).reduce((n,group)=>n+(group.some(i=>assets[i].image)?0:1),0);
  const missing=assets.filter(a=>!a.image).length;return usesSharedBackground(input)?(assets.some(a=>a.image)?0:missing?1:0):missing;
}

export function hasQuoteFlow(input:Pick<Input,'mode'>,plan?:Plan|null){return input.mode==='quote'&&plan?.quoteFlow==='contrast-resolution-v1';}
export function backgroundGroups(input:Pick<Input,'mode'>,count:number,plan?:Plan|null):number[][]{if(!count)return [];const all=Array.from({length:count},(_,i)=>i);return input.mode==='quote'&&(!plan||hasQuoteFlow(input,plan))&&count>1?[all.slice(0,-1),[count-1]]:[all];}
