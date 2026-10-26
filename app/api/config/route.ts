import { models } from '@/lib/server/api';
export const runtime='nodejs';
export async function GET() {
  const estimate=Number(process.env.IMAGE_ESTIMATE_USD);
  return Response.json({configured:!!process.env.OPENAI_API_KEY?.trim(),passwordRequired:!!process.env.APP_PASSWORD || process.env.NODE_ENV==='production',...models(),imageEstimateUSD:Number.isFinite(estimate)&&estimate>0?estimate:null},{headers:{'Cache-Control':'no-store'}});
}
