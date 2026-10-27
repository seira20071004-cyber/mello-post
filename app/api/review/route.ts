import { z } from 'zod';
import { inputSchema, planSchema, storedPlanSchema, validatePlan, validateEngagement } from '@/lib/schema';
import { authorize, readBody, withJob, structured, AppError, errorResponse } from '@/lib/server/api';
import {compositionFor,generationSchema,finishReadingPath} from '@/lib/composition';
import {reviewStory} from '@/lib/server/stories';
import { editorPrompt, modeReviewPrompt } from '@/lib/server/prompts';
export const runtime='nodejs';export const maxDuration=180;
export async function POST(request:Request) {
  try{authorize(request);const b=z.object({requestId:z.string().uuid(),input:inputSchema,plan:storedPlanSchema}).parse(await readBody(request));
    return Response.json(await withJob(request,b.requestId,b,async usage=>{
      if(b.input.mode==='story'||b.input.mode==='comic')return reviewStory(b.input,b.plan,usage);
      const plan=finishReadingPath(await structured(generationSchema(b.input,b.plan.items.length),editorPrompt(b.input)+'\n'+modeReviewPrompt(b.input),JSON.stringify({...b,composition:compositionFor(b.input,b.plan.items.length)}),usage,'review'),b.input);
      const errors=[...validatePlan(plan,b.input),...validateEngagement(plan,b.input)];if(errors.length)throw new AppError(errors.join(' / '),422);return plan;
    }));
  }catch(error){return errorResponse(error);}
}
