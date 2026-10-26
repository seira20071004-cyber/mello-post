import type {Input} from './schema';
export const modes={
  story:{name:'短い物語',description:'日常の一場面から、心に残る気づきへ。短い言葉と絵で伝えます。',hint:'会話・出来事・そのときの気持ちを教えてください。未入力なら創作の物語をつくります。'},
  essay:{name:'思いを綴る',description:'同じ背景に、あなたの思いを。余白のある読みものに整えます。',hint:'大切にしている考え、伝えたい思い、実際の経験などを書いてください。'},
  info:{name:'情報を伝える',description:'コツやノウハウを、順序立ててわかりやすく。',hint:'伝えたいこと、入れたい内容などがあれば教えてください。'},
} as const;
export function isNarrative(input:Pick<Input,'mode'>){return input.mode==='story'||input.mode==='essay';}
export function pendingImageCalls(input:Pick<Input,'mode'>,assets:{image?:string}[]){const missing=assets.filter(a=>!a.image).length;return input.mode==='essay'?(assets.some(a=>a.image)?0:missing?1:0):missing;}
