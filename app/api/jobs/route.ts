import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
type Job = { id:string; title:string; company:string; location:string; url:string; description:string; source:string; published:string; salary:string; remote:boolean };
const terms = /vibe.cod|ai.assist|artificial intelligence|inteligência artificial|automation|automaç|no.code|low.code|prompt engineer|ai agent|agente de ia|lovable|n8n|replit|claude|workflow|integration|integraç/i;
function clean(s:unknown):string { return String(s ?? '').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim(); }
function fitScore(j:Job):number {
 const t=j.title.toLowerCase(), d=j.description.toLowerCase();
 let score=0;
 if(/vibe.cod|ai automation|automation (engineer|specialist|developer)|ai (builder|engineer|developer|agent)|prompt engineer|no.code|low.code|n8n|lovable|replit/i.test(t))score+=70;
 else if(/developer|software|automation|automação|integration|integração|agent builder|workflow|ai engineer/i.test(t))score+=40;
 if(/n8n|lovable|replit|claude code|vibe.cod|ai.assisted development|no.code|low.code/i.test(d))score+=20;
 if(/automation|automação|integrations|integrações|ai agents|agentes de ia|workflow/i.test(d))score+=10;
 if(/marketing|account executive|customer intelligence|sales manager|recruiter|human resources|product marketing|sales representative|sales executive|finance manager|customer success/i.test(t))score-=100;
 if(/vibe.cod|ai builder|product builder|no.code|low.code|lovable|replit|claude code/i.test(t+' '+d))score+=35;
 return Math.max(0,Math.min(100,score));
}
function relevant(j:Job,q:string,profile:boolean) { const hay=(j.title+' '+j.description).toLowerCase();return (!q || hay.includes(q.toLowerCase())) && (!profile || fitScore(j)>=65); }
async function getJSON(url:string):Promise<unknown> { const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),8000);try{const r=await fetch(url,{signal:ctrl.signal,next:{revalidate:1800},headers:{'User-Agent':'ATSInteligente/1.0'}});if(!r.ok)throw Error('Fonte indisponível');return await r.json();}finally{clearTimeout(timer)} }
export async function GET(req:NextRequest) {
 const q=(req.nextUrl.searchParams.get('q')||'').slice(0,80).trim();
 const mode=req.nextUrl.searchParams.get('mode')||'remote';
 const profile=req.nextUrl.searchParams.get('profile')!=='false';
 const country=(req.nextUrl.searchParams.get('country')||'world').toLowerCase().slice(0,60);
 const results=await Promise.allSettled([
  getJSON('https://remotive.com/api/remote-jobs?limit=100'),
  getJSON('https://www.arbeitnow.com/api/job-board-api')
 ]);
 const jobs:Job[]=[];const warnings:string[]=[];
 if(results[0].status==='fulfilled'){
  const data=results[0].value as {jobs?:Array<Record<string,unknown>>};
  for(const x of data.jobs||[])jobs.push({id:'remotive-'+x.id,title:clean(x.title),company:clean(x.company_name),location:clean(x.candidate_required_location)||'Não informado',url:String(x.url||''),description:clean(x.description),source:'Remotive',published:String(x.publication_date||''),salary:clean(x.salary),remote:true});
 }else warnings.push('Remotive indisponível nesta consulta.');
 if(results[1].status==='fulfilled'){
  const data=results[1].value as {data?:Array<Record<string,unknown>>};
  for(const x of data.data||[])jobs.push({id:'arbeitnow-'+x.slug,title:clean(x.title),company:clean(x.company_name),location:clean(x.location)||'Não informado',url:String(x.url||''),description:clean(x.description),source:'Arbeitnow',published:String(x.created_at||''),salary:'',remote:x.remote===true});
 }else warnings.push('Arbeitnow indisponível nesta consulta.');
 const filtered=jobs.filter(j=>j.title&&j.url.startsWith('https://')&&relevant(j,q,profile)).filter(j=>mode==='all'||(mode==='remote'?j.remote:!j.remote)).filter(j=>country==='world'||new RegExp(country==='brasil'?'brazil|brasil|worldwide|global|anywhere':country.replace(/[^a-z ]/g,''),'i').test(j.location));
 const dedup=[...new Map(filtered.map(j=>[(j.title+'|'+j.company).toLowerCase(),j])).values()].sort((a,b)=>fitScore(b)-fitScore(a)).slice(0,100).map(j=>({...j,fitScore:fitScore(j),description:j.description.slice(0,1100)}));
 if(!jobs.length)warnings.push('Nenhuma vaga foi recebida das fontes. Verifique disponibilidade ou bloqueio de acesso.');
 if(jobs.length&&!dedup.length)warnings.push('As fontes retornaram '+jobs.length+' vagas, mas nenhuma passou pelos filtros. Experimente Todas as modalidades, Mundo e sem palavra-chave.');
 return NextResponse.json({jobs:dedup,totalReceived:jobs.length,warnings,checkedAt:new Date().toISOString(),notice:'Busca especializada: apenas anúncios com sinais de ferramentas de criação assistida por IA. Fontes públicas generalistas são suplementares; consulte também os painéis especializados indicados. Localização remota não garante elegibilidade no Brasil.'});
}
