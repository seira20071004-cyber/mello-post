import type {Input,SlideAsset} from './schema';
export const modes={
  story:{name:'短い物語',description:'日常の一場面から、心に残る気づきへ。短い言葉と絵で伝えます。',hint:'会話・出来事・そのときの気持ちを教えてください。未入力なら創作の物語をつくります。'},
  essay:{name:'思いを綴る',description:'同じ背景に、あなたの思いを。余白のある読みものに整えます。',hint:'大切にしている考え、伝えたい思い、実際の経験などを書いてください。'},
  info:{name:'情報を伝える',description:'コツやノウハウを、順序立ててわかりやすく。',hint:'伝えたいこと、入れたい内容などがあれば教えてください。'},
  comic:{name:'ゆる漫画',description:'短い縦書きと、ゆるい線画。日常のひとコマを、絵と余白で。',hint:'思い出した場面や会話、最後に伝えたい気づきなど。'},
  comparison:{name:'いまと未来',description:'同じ場所を、いまと未来で。上下の絵の変化で思いを伝えます。',hint:'今ある風景や小物と、未来にどう変わるか。例：子どもと暮らす部屋と、成長後の部屋。'},
  quote:{name:'ことばカード',description:'同じ背景に、短い言葉をひとつずつ。やさしい気づきを届けます。',hint:'届けたい思い、見つめ直したい考え方など。実在の人の名言としては生成しません。'},
} as const;
export function isNarrative(input:Pick<Input,'mode'>){return ['story','essay','comic','quote'].includes(input.mode);}
export function usesSharedBackground(input:Pick<Input,'mode'>){return input.mode==='essay'||input.mode==='quote';}
export function isAssetComplete(input:Pick<Input,'mode'>,asset:Pick<SlideAsset,'image'|'futureImage'>){return !!asset.image&&(input.mode!=='comparison'||!!asset.futureImage);}
export function pendingImageCalls(input:Pick<Input,'mode'>,assets:Pick<SlideAsset,'image'|'futureImage'>[]){
  if(input.mode==='comparison')return assets.reduce((n,a)=>n+Number(!a.image)+Number(!a.futureImage),0);
  const missing=assets.filter(a=>!a.image).length;return usesSharedBackground(input)?(assets.some(a=>a.image)?0:missing?1:0):missing;
}
