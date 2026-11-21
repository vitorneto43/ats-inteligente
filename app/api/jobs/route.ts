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
const role=/vibe.cod|ai.builder|ai.native.builder|ai.automation|no.code|low.code|prompt.engineer|claude.code|lovable|replit|cursor|bolt.new|agent.builder|automação.com.ia/i;
const excluded=/account manager|account executive|sales|marketing|recruiter|human resources|data engineer|senior software engineer|staff engineer|principal engineer|tech lead|java developer|mulesoft|product manager|seo|writer|architect|customer success/i;
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
  if(!role.test(title+' '+description))return;
  seen.add(url);
  const location=clean(context.find('[class*="location"],[class*="Location"]').first().text())||'Não informado';
  jobs.push({id:s.name+'-'+i,title,company:clean(context.find('[class*="company"],[class*="Company"]').first().text())||'Não informado',location,url,description,source:s.name,published:'',salary:'',remote:/remote|remoto|anywhere|worldwide/i.test(location+' '+description.slice(0,200)),remoteKnown:/remote|remoto|anywhere|worldwide|on.site|presencial|hybrid|híbrido/i.test(location+' '+description.slice(0,200)),fitScore:role.test(title)?95:75});
 });
 return jobs.slice(0,100);
 }finally{clearTimeout(timer)}
}
export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get('q')||'').trim().toLowerCase().slice(0,80);
 const mode=req.nextUrl.searchParams.get('mode')||'all';
 const genericQuery=/^(vibe\s*cod(e|ing|er|ers)?|vibecod(e|ing|er|ers)?)$/i.test(q);
 const country=(req.nextUrl.searchParams.get('country')||'world').toLowerCase();
 const settled=await Promise.allSettled(sources.map(fetchSource));
 const warnings:string[]=[];const all:Job[]=[];
 settled.forEach((r,i)=>{if(r.status==='fulfilled'){all.push(...r.value);if(!r.value.length)warnings.push(sources[i].name+': nenhum anúncio compatível extraído.')}else warnings.push(sources[i].name+': indisponível ou estrutura não reconhecida.');});
 const jobs=[...new Map(all.filter(j=>(!q||genericQuery||(j.title+' '+j.description).toLowerCase().includes(q))&&(mode==='all'||(mode==='remote'?(j.remote||!j.remoteKnown):(!j.remote&&j.remoteKnown)))&&(country==='world'||(country==='brasil'?/brasil|brazil|worldwide|anywhere|global/i.test(j.location):j.location.toLowerCase().includes(country)))).map(j=>[j.url,j])).values()].sort((a,b)=>b.fitScore-a.fitScore).slice(0,100);
 if(!jobs.length)warnings.unshift('Nenhuma vaga de Vibe Coding confirmada pelos filtros atuais. Não exibimos vagas genéricas para preencher a lista.');
 return NextResponse.json({jobs,totalReceived:all.length,warnings,checkedAt:new Date().toISOString(),notice:'Vagas sem modalidade informada são incluídas na opção Remoto para não esconder oportunidades; confirme no anúncio. Busca diretamente em páginas de sites de Vibe Coding. Extração experimental: sites podem bloquear ou alterar sua estrutura. Verifique os requisitos e a elegibilidade no anúncio original.'});
}
