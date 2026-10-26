import { z } from 'zod';
import { inputSchema, planSchema, validatePlan } from '@/lib/schema';
import { authorize, readBody, withJob, structured, AppError, errorResponse } from '@/lib/server/api';
import { editorPrompt, reviewPrompt } from '@/lib/server/prompts';
export const runtime='nodejs';export const maxDuration=180;
export async function POST(request:Request) {
  try{authorize(request);const b=z.object({requestId:z.string().uuid(),input:inputSchema,plan:planSchema}).parse(await readBody(request));
    return Response.json(await withJob(request,b.requestId,b,async usage=>{
      const plan=await structured(planSchema,editorPrompt+'\n'+reviewPrompt,JSON.stringify(b),usage,'review');
      const errors=validatePlan(plan,b.input);if(errors.length)throw new AppError(errors.join(' / '),422);return plan;
    }));
  }catch(error){return errorResponse(error);}
}
