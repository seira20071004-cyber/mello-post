import {authorize,errorResponse} from '@/lib/server/api';
export const runtime='nodejs';
export async function POST(request:Request){try{authorize(request);return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});}catch(error){return errorResponse(error);}}
