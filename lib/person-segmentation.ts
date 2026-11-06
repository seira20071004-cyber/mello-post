import {confidenceAlpha,foregroundMask} from './person-mask';
let segmenter:Promise<import('@mediapipe/tasks-vision').ImageSegmenter>|undefined;
/** Photos stay on device. Runtime and model files are served from the same application. */
export async function segmentPerson(image:HTMLCanvasElement):Promise<Uint8Array>{
  segmenter??=import('@mediapipe/tasks-vision').then(({ImageSegmenter})=>ImageSegmenter.createFromOptions({wasmLoaderPath:'/person-segmentation/vision_wasm_internal.js',wasmBinaryPath:'/person-segmentation/vision_wasm_internal.wasm'},{baseOptions:{modelAssetPath:'/person-segmentation/selfie_segmenter.tflite',delegate:'CPU'},runningMode:'IMAGE',outputConfidenceMasks:true,outputCategoryMask:false})).catch(error=>{segmenter=undefined;throw error;});
  const model=await segmenter;
  let mask:Uint8Array|undefined;
  model.segment(image,result=>{
    // Some runtime/model versions return one foreground confidence mask; others return background and person.
    const person=foregroundMask(result.confidenceMasks);if(!person)throw new Error('人物の切り抜きデータを取得できませんでした');
    const values=person.getAsFloat32Array(),small=document.createElement('canvas');small.width=person.width;small.height=person.height;
    const ctx=small.getContext('2d')!,pixels=ctx.createImageData(small.width,small.height);for(let i=0;i<values.length;i++){const alpha=confidenceAlpha(values[i]);pixels.data[i*4]=pixels.data[i*4+1]=pixels.data[i*4+2]=alpha;pixels.data[i*4+3]=255;}ctx.putImageData(pixels,0,0);
    const scaled=document.createElement('canvas');scaled.width=image.width;scaled.height=image.height;const scaledCtx=scaled.getContext('2d')!;scaledCtx.drawImage(small,0,0,scaled.width,scaled.height);const data=scaledCtx.getImageData(0,0,scaled.width,scaled.height).data;const alpha=new Uint8Array(scaled.width*scaled.height);for(let i=0;i<alpha.length;i++)alpha[i]=data[i*4];mask=alpha;
  });
  if(!mask)throw new Error('人物の切り抜きに失敗しました');
  return mask;
}
