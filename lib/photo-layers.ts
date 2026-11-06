import {z} from 'zod';
export const photoLayerSchema=z.object({
  id:z.string().regex(/^[a-zA-Z0-9-]{1,64}$/),
  source:z.string().max(8_000_000).regex(/^(?:data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+|\/reactions\/(?:surprised|cheer|rest|burst|shock|rays|surprise-lines|sweat|anger|gloom|scribble|spiral|laugh-lines|sparkles|stars|hearts|confetti|flower|arrow|speech|cloud-bubble|underline|circle|speed|tape|idea|rain-cloud)\.svg)$/),
  label:z.string().max(60),x:z.number().min(0).max(1),y:z.number().min(0).max(1),width:z.number().min(.00001).max(1),height:z.number().min(.00001).max(1),mirrored:z.boolean().optional(),
});
export type PhotoLayer=z.infer<typeof photoLayerSchema>;
export function newPhotoLayer(id:string,source:string,label:string,imageWidth:number,imageHeight:number,canvasRatio:number):PhotoLayer{
  const width=Math.min(.48,.40*imageWidth/imageHeight/canvasRatio),height=width*canvasRatio*imageHeight/imageWidth;
  return {id,source,label,x:.5-width/2,y:.96-height,width,height};
}
export const reactions=[
  {id:'burst',name:'ギザギザ',group:'びっくり・ツッコミ'},
  {id:'shock',name:'衝撃',group:'びっくり・ツッコミ'},
  {id:'rays',name:'集中線',group:'びっくり・ツッコミ'},
  {id:'surprise-lines',name:'びっくり線',group:'びっくり・ツッコミ'},
  {id:'sweat',name:'汗',group:'びっくり・ツッコミ'},
  {id:'anger',name:'プンプン',group:'びっくり・ツッコミ'},
  {id:'gloom',name:'ガーン',group:'びっくり・ツッコミ'},
  {id:'scribble',name:'モヤモヤ',group:'びっくり・ツッコミ'},
  {id:'spiral',name:'ぐるぐる',group:'気持ち・わくわく'},
  {id:'laugh-lines',name:'笑い線',group:'気持ち・わくわく'},
  {id:'sparkles',name:'キラキラ',group:'気持ち・わくわく'},
  {id:'stars',name:'星',group:'気持ち・わくわく'},
  {id:'hearts',name:'ハート',group:'気持ち・わくわく'},
  {id:'confetti',name:'紙吹雪',group:'気持ち・わくわく'},
  {id:'flower',name:'はなまる',group:'気持ち・わくわく'},
  {id:'idea',name:'ひらめき',group:'気持ち・わくわく'},
  {id:'arrow',name:'矢印',group:'飾り・ふきだし'},
  {id:'speech',name:'ふきだし',group:'飾り・ふきだし'},
  {id:'cloud-bubble',name:'雲ふきだし',group:'飾り・ふきだし'},
  {id:'underline',name:'なみ線',group:'飾り・ふきだし'},
  {id:'circle',name:'まる囲み',group:'飾り・ふきだし'},
  {id:'speed',name:'スピード線',group:'飾り・ふきだし'},
  {id:'tape',name:'テープ',group:'飾り・ふきだし'},
  {id:'rain-cloud',name:'雨雲',group:'飾り・ふきだし'}
] as const;

