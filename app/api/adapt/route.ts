import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
export const maxDuration=60;
const model='gpt-6-luna';
export async function POST(req:NextRequest){
 try{
  const key=process.env.OPENAI_API_KEY;
  if(!key)return NextResponse.json({error:'Chave OPENAI_API_KEY não configurada no servidor.'},{status:503});
  const body=await req.json();
  const cv=typeof body.cv==='string'?body.cv.trim():'';
  const job=typeof body.job==='string'?body.job.trim():'';
  const language=body.language==='en'?'English':'Português';
  if(cv.length<50||job.length<40||cv.length>22000||job.length>14000)return NextResponse.json({error:'Currículo ou vaga ausente, curto demais ou extenso demais.'},{status:400});
  const response=await fetch('https://api.openai.com/v1/responses',{
   method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
   body:JSON.stringify({model,store:false,max_output_tokens:3400,
    instructions:'You are a careful resume editor. Rewrite the COMPLETE supplied resume for the supplied vacancy in the requested language. Preserve ALL factual claims, employers, dates, qualifications, project names, URLs, contact details and honest self-description. Never invent achievements, years of experience, metrics, degrees, technologies, job titles or skills. Never pretend missing requirements are met. Prioritize relevant true work, clarify phrasing, use clear ATS-compatible section headings, keep chronological experience and preserve important projects. Return ONLY the full ready-to-review resume as plain text, no commentary or markdown fences. If the input lacks a fact, do not add it.',
    input:'TARGET LANGUAGE: '+language+'\n\nVACANCY:\n'+job+'\n\nORIGINAL RESUME:\n'+cv
   }),signal:AbortSignal.timeout(55000)
  });
  const data=await response.json();
  if(!response.ok)return NextResponse.json({error:'OpenAI recusou a solicitação ('+response.status+'): '+(data.error?.message||'verifique a conta e o modelo')},{status:502});
  const draft=(data.output||[]).flatMap((o:{content?:{type?:string;text?:string}[]})=>o.content||[]).filter((c:{type?:string})=>c.type==='output_text').map((c:{text?:string})=>c.text||'').join('\n').trim();
  if(draft.length<Math.min(300,cv.length*.3))return NextResponse.json({error:'A IA não devolveu um currículo completo. Nenhum texto foi substituído.'},{status:502});
  return NextResponse.json({draft,model,usage:data.usage||null});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Falha na comunicação com a IA.'},{status:500});}
}
