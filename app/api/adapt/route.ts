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
   body:JSON.stringify({model,store:false,max_output_tokens:4200,
    instructions:'You are an expert ATS resume editor for genuine AI-assisted/Vibe Coder profiles. Analyze the FULL vacancy, including every responsibility and required/preferred qualification, against the ENTIRE original resume BEFORE writing. Produce a COMPLETE, specifically targeted resume in the requested language, not generic paraphrasing. Give prominence to the strongest documented projects and concrete work matching the vacancy, including frontend, backend, API, database, deployment, testing and AI-assisted workflows where supported. For a full-stack vacancy, prioritize supported full-stack examples; for other vacancies, adapt priorities accordingly. Keep the applicant authentic Vibe Coder identity prominent; NEVER silently upgrade them into an unaided traditional expert or imply formal employment for independent projects. Preserve employers, dates, qualifications, project names, URLs, contact details, meaningful project coverage and all factual claims. Do not invent achievements, years, metrics, degrees, technologies, certifications, proficiency or skills. Never claim experience with missing requirements such as Azure, Power Apps, Power Automate, TDD, BDD, formal code reviews or CI/CD unless explicit evidence is present in the source. Describe related transferable experience truthfully, without falsely claiming equivalence. Preserve chronological employment order; reorder project blocks by relevance. Remove internal editorial notes and placeholders such as APPLICATION NOTES from the application-ready version, but never guess missing facts; omit unverifiable entries if necessary. Return ONLY the complete ready-to-review resume as plain text with readable ATS headings, no commentary or markdown fences. Maintain sufficient detail, not a short summary.',
    input:'TARGET LANGUAGE: '+language+'\n\nVACANCY:\n'+job+'\n\nORIGINAL RESUME:\n'+cv
   }),signal:AbortSignal.timeout(55000)
  });
  const data=await response.json();
  if(!response.ok)return NextResponse.json({error:'OpenAI recusou a solicitação ('+response.status+'): '+(data.error?.message||'verifique a conta e o modelo')},{status:502});
  const draft=(data.output||[]).flatMap((o:{content?:{type?:string;text?:string}[]})=>o.content||[]).filter((c:{type?:string})=>c.type==='output_text').map((c:{text?:string})=>c.text||'').join('\n').trim();
  if(draft.length<Math.min(650,cv.length*.48))return NextResponse.json({error:'A IA não devolveu um currículo completo. Nenhum texto foi substituído.'},{status:502});
  return NextResponse.json({draft,model,usage:data.usage||null});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Falha na comunicação com a IA.'},{status:500});}
}
