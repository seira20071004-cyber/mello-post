export const formats={
  '4:5':{label:'縦長フィード',width:1080,height:1350,description:'おすすめ・フィード投稿に'},
  '1:1':{label:'正方形',width:1080,height:1080,description:'すっきり見せたい投稿に'},
  '9:16':{label:'縦長フルサイズ',width:1080,height:1920,description:'ストーリーズなどに'},
} as const;
export type AspectRatio=keyof typeof formats;
export function canvasSize(input:{aspectRatio?:AspectRatio}){return formats[input.aspectRatio||'9:16'];}

// Newer GPT Image models accept dimensions divisible by 16. Older configured
// models keep their documented standard sizes.
export function imageGenerationSize(input:{aspectRatio?:AspectRatio;mode?:string},model:string){
  if(input.mode==='info'||input.aspectRatio==='1:1')return '1024x1024';
  if(model.startsWith('gpt-image-2'))return input.aspectRatio==='9:16'?'864x1536':'1024x1280';
  return '1024x1536';
}
