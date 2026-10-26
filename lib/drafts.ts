export function download(blob: Blob,name: string) {const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function prepareUpload(file: File): Promise<string> {
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('PNG・JPEG・WebP画像を選んでください');
  if(file.size>10*1024*1024)throw new Error('参考画像は10MB以下にしてください');
  const bitmap=await createImageBitmap(file);const scale=Math.min(1,1024/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  return canvas.toDataURL('image/jpeg',.85);
}
