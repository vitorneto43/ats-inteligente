import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
export const dynamic='force-dynamic';
type Job={id:string;title:string;company:string;location:string;url:string;description:string;source:string;published:string;salary:string;remote:boolean;remoteKnown:boolean;fitScore:number};
const sources=[
 {name:'VibeCodeJobs',url:'https://vibecodejobs.co/'},
 {name:'VibeCodeCareers',url:'https://vibecodecareers.com/jobs/'},
 {name:'GoodVibeCode',url:'https://www.goodvibecode.com/jobs'},
 {name:'VibeCodeJobs IO',url:'https://vibecodejobs.io/jobs'},
 {name:'AI Jobs Map',url:'https://aijobsmap.com/pt-br/tools/vibe-coding'}
];
const engineeringRole=/\b(?:full[\s-]?stack|software\s+(?:engineer|developer)|ai\s+(?:engineer|developer|builder)|automation\s+(?:engineer|developer|specialist)|vibe[\s-]?cod(?:er|ing|e))\b/i;
const explicitVibe=/\bvibe[\s-]?cod(?:e|er|ers|ing)\b/i;
const explicitRole=/\b(?:vibe[\s-]?cod(?:e|er|ers|ing)|lovable|replit|claude\s*code|cursor\s*ai|bolt\.new)\b/i;
const builderRole=/\b(?:build|develop|create|prototype|implement|construir|desenvolver|criar|prototipar|implementar)\b/i;
const weakContext=/\b(?:familiarity|familiar|comfort with|exposure to|nice to have|plus if|bonus|knowledge of|interest in)\b/i;
const excluded=/account manager|account executive|sales|marketing|recruiter|human resources|data engineer|staff engineer|principal engineer|tech lead|java developer|mulesoft|product manager|program manager|project manager|seo|writer|architect|customer success|business analyst|data analyst|financial analyst|director|vice president|\bvp\b|chief|\bprincipal\b/i;
function clean(x:string){return x.replace(/\s+/g,' ').trim().slice(0,1500)}
async function fetchSource(s:{name:string;url:string}):Promise<Job[]>{
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),10000);
 try{
 const response=await fetch(s.url,{signal:ctrl.signal,next:{revalidate:1800},headers:{'User-Agent':'Mozilla/5.0 (compatible; ATSInteligente/1.0)'}});
 if(!response.ok)throw Error('HTTP '+response.status);
 const html=await response.text();const $=cheerio.load(html);$('script,style,nav,footer,header').remove();
 const jobs:Job[]=[];const seen=new Set<string>();
 $('a[href]').each((i,el)=>{
  const a=$(el),href=a.attr('href')||'';
  let url:string;try{url=new URL(href,s.url).toString()}catch{return}
  if(!url.startsWith('https://')||url===s.url||seen.has(url))return;
  if(!/\/job[s]?\/|\/positions\/|\/vacanc|\/vagas\//i.test(new URL(url).pathname))return;
  const container=a.closest('article,li,[class*="job-card"],[class*="JobCard"],[class*="job_item"],[class*="job-listing"],[class*="card"]');
  const context=container.length?container:a.parent();
  const title=clean(a.find('h2,h3,h4').first().text()||context.find('h2,h3,h4').first().text()||a.text()).slice(0,160);
  const description=clean(context.text());
  if(title.length<7||title.length>160||excluded.test(title))return;
  if(!explicitRole.test(title+' '+description)&&!engineeringRole.test(title))return;
  seen.add(url);
  const location=clean(context.find('[class*="location"],[class*="Location"]').first().text())||'Não informado';
  jobs.push({id:s.name+'-'+i,title,company:clean(context.find('[class*="company"],[class*="Company"]').first().text())||'Não informado',location,url,description,source:s.name,published:'',salary:'',remote:/remote|remoto|anywhere|worldwide/i.test(location+' '+description.slice(0,200)),remoteKnown:/remote|remoto|anywhere|worldwide|on.site|presencial|hybrid|híbrido/i.test(location+' '+description.slice(0,200)),fitScore:0});
 });
 return jobs.slice(0,60);
 }finally{clearTimeout(timer)}
}
async function verifyJob(job:Job):Promise<Job|null>{
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),8000);
 try{
  const res=await fetch(job.url,{signal:ctrl.signal,next:{revalidate:1800},headers:{'User-Agent':'Mozilla/5.0 (compatible; ATSInteligente/1.0)'}});
  if(!res.ok||!res.headers.get('content-type')?.includes('text/html'))return null;
  const $=cheerio.load(await res.text());$('script,style,nav,footer,header').remove();
  const article=$('main,article,[class*="job-detail"],[class*="job-description"]').first();
  const text=clean((article.length?article:$('body')).text()).slice(0,12000);
  const title=job.title;
  // A mention of AI tools or vibe coding alone is not proof of a Vibe Coder role.
  if(excluded.test(title)||!engineeringRole.test(title)||!explicitVibe.test(title+' '+text))return null;
  if(!explicitVibe.test(title)&&!builderRole.test(text))return null;
  if(!/\b(?:vibe[\s-]?cod(?:e|er|ers|ing))\b/i.test(title)&&!/(?:vibe[\s-]?cod(?:e|er|ers|ing))[^.]{0,130}(?:build|develop|create|prototype|implement|construir|desenvolver|criar|prototipar|implementar)|(?:build|develop|create|prototype|implement|construir|desenvolver|criar|prototipar|implementar)[^.]{0,130}(?:vibe[\s-]?cod(?:e|er|ers|ing))/i.test(text))return null;
  const locationText=job.location==='Não informado'?'':job.location;
  const location=locationText||clean($('[class*="location"],[class*="Location"]').first().text())||'Não informado';
  const remote=/\b(remote|remoto|worldwide|anywhere)\b/i.test(location);
  const remoteKnown=remote||/\b(on.site|onsite|presencial|hybrid|híbrido)\b/i.test(location);
  return {...job,description:text,location,remote,remoteKnown,fitScore:explicitVibe.test(title)?95:85};
 }catch{return null}finally{clearTimeout(timer)}
}
export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get('q')||'').trim().toLowerCase().slice(0,80);
 const mode=req.nextUrl.searchParams.get('mode')||'all';
 const genericQuery=/^(vibe\s*cod(e|ing|er|ers)?|vibecod(e|ing|er|ers)?)$/i.test(q);
 const roleQuery=/\b(?:full\s*stack|fullstack|software\s*(?:engineer|developer)|ai\s*(?:developer|engineer|builder)|automation\s*(?:specialist|developer|engineer))\b/i.test(q);
 const roleTerms=q.replace(/vibe\s*cod(?:e|ing|er|ers)?/gi,'').trim().split(/\s+/).filter(Boolean);
 const matchesQuery=(j:Job)=>!q||genericQuery||(roleQuery?roleTerms.some(term=>(j.title+' '+j.description).toLowerCase().includes(term)):(j.title+' '+j.description).toLowerCase().includes(q));
 const country=(req.nextUrl.searchParams.get('country')||'world').toLowerCase();
 const settled=await Promise.allSettled(sources.map(fetchSource));
 const warnings:string[]=[];const all:Job[]=[];
 settled.forEach((r,i)=>{if(r.status==='fulfilled'){all.push(...r.value);if(!r.value.length)warnings.push(sources[i].name+': nenhum anúncio compatível extraído.')}else warnings.push(sources[i].name+': indisponível ou estrutura não reconhecida.');});
 const verified=(await Promise.all(all.map(verifyJob))).filter((j):j is Job=>j!==null);
 const jobs=[...new Map(verified.filter(j=>matchesQuery(j)&&(mode==='all'||(mode==='remote'?j.remote:(!j.remote&&j.remoteKnown)))&&(country==='world'||(country==='brasil'?/brasil|brazil|worldwide|anywhere|global/i.test(j.location):j.location.toLowerCase().includes(country)))).map(j=>[j.url,j])).values()].sort((a,b)=>b.fitScore-a.fitScore).slice(0,100);
 if(!jobs.length)warnings.unshift('Nenhuma vaga de Vibe Coding confirmada pelos filtros atuais. Não exibimos vagas genéricas para preencher a lista.');
 return NextResponse.json({jobs,totalReceived:verified.length,warnings,checkedAt:new Date().toISOString(),notice:'Vagas sem modalidade informada não são consideradas remotas confirmadas. Anúncios ambíguos ou que apenas citam IA são excluídos. Busca diretamente em páginas de sites de Vibe Coding. Extração experimental: sites podem bloquear ou alterar sua estrutura. Verifique os requisitos e a elegibilidade no anúncio original.'});
}
