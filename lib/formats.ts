export const formats={
  '4:5':{label:'縦長フィード',width:1080,height:1350,description:'おすすめ・フィード投稿に'},
  '1:1':{label:'正方形',width:1080,height:1080,description:'すっきり見せたい投稿に'},
  '9:16':{label:'縦長フルサイズ',width:1080,height:1920,description:'ストーリーズなどに'},
} as const;
export type AspectRatio=keyof typeof formats;
export function canvasSize(input:{aspectRatio?:AspectRatio}){return formats[input.aspectRatio||'9:16'];}
