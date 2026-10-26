import { z } from 'zod';
import { inputSchema, planSchema, slideSchema, itemSchema, inputIssues, validatePlan, validateEngagement } from '@/lib/schema';
import { AppError, authorize, readBody, referenceSchema, withJob, structured, errorResponse } from '@/lib/server/api';
import {compositionFor,generationSchema,finishReadingPath} from '@/lib/composition';
import { editorPrompt, modeReviewPrompt } from '@/lib/server/prompts';
export const runtime='nodejs';export const maxDuration=300;
const schema=z.object({requestId:z.string().uuid(),input:inputSchema,reference:referenceSchema,plan:planSchema.optional(),index:z.number().int().min(0).max(9).optional()});
export async function POST(request:Request) {
  try{
    authorize(request);const body=schema.parse(await readBody(request));
    const issues=inputIssues(body.input);if(issues.length)throw new AppError(issues.join(' / '));
    const result=await withJob(request,body.requestId,body,async usage=>{
      if(body.plan && body.index!==undefined) {
        const old=body.plan.slides[body.index];if(!old)throw new AppError('スライドがありません');
        const regenerated=await structured(z.object({slide:slideSchema,items:z.array(itemSchema).max(2),caption:planSchema.shape.caption,followCTA:planSchema.shape.followCTA}),editorPrompt(body.input)+'\n指定の1スライドだけタイトル・補足・強調・イラスト指示と割当項目のタイトル・本文を改善。項目の主題とIDを維持する。itemsには対象スライドに割り当てられた項目だけ返し、表紙・まとめなら空配列。itemIdsとlayoutを維持し、他のスライドと重複しない。誤字と断定表現も点検。captionとfollowCTAも変更と整合させる。infoモードだけnextTeaserは直後のスライドの内容を予告する。story/essayではnextTeaser・followCTA・emphasisは空、中面titleは空で本文だけを改善する。',JSON.stringify({input:body.input,plan:body.plan,targetIndex:body.index}),usage);
        if(regenerated.items.length!==old.itemIds.length || old.itemIds.some(id=>regenerated.items.filter(item=>item.id===id).length!==1))throw new AppError('再生成した項目番号が元のスライドと一致しません。元の内容を保持しました。',422);
        const slide=regenerated.slide;
        slide.itemIds=old.itemIds;slide.layout=old.layout;
        const next={...body.plan,caption:regenerated.caption,followCTA:regenerated.followCTA||body.plan.followCTA,items:body.plan.items.map(item=>regenerated.items.find(i=>i.id===item.id)||item),slides:body.plan.slides.map((s,i)=>i===body.index?slide:s)};
        const errors=[...validatePlan(next,body.input),...(body.input.mode!=='info'?validateEngagement(next,body.input):[])];if(errors.length)throw new AppError(errors.join(' / '),422);
        return next;
      }
      const composition=compositionFor(body.input),outputSchema=generationSchema(body.input);
      const content:unknown[]=[{type:'input_text',text:JSON.stringify({input:body.input,composition})}];
      if(body.reference)content.push({type:'input_image',image_url:body.reference,detail:'low'});
      let plan=await structured(outputSchema,editorPrompt(body.input),[{role:'user',content}],usage);
      plan=await structured(outputSchema,editorPrompt(body.input)+'\n'+modeReviewPrompt(body.input),JSON.stringify({input:body.input,composition,plan,errors:[...validatePlan(plan,body.input),...validateEngagement(plan,body.input)]}),usage,'review');
      plan=finishReadingPath(plan,body.input);
      let errors=[...validatePlan(plan,body.input),...validateEngagement(plan,body.input)];
      if(errors.length){plan=await structured(outputSchema,editorPrompt(body.input)+'\n'+modeReviewPrompt(body.input)+'\ncompositionの各スライドのitemIdsを厳守し、示されたエラーをすべて直す。',JSON.stringify({input:body.input,composition,plan,errors}),usage,'review');plan=finishReadingPath(plan,body.input);errors=[...validatePlan(plan,body.input),...validateEngagement(plan,body.input)];}
      if(errors.length)throw new AppError('校正後も整合性を確認できませんでした: '+errors.join(' / '),422);
      return plan;
    });
    return Response.json(result);
  }catch(error){return errorResponse(error);}
}
