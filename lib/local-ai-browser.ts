type Message={role:'system'|'user';content:string};
type Generated={generated_text:string|Array<{role:string;content:string}>};
type Generator=(input:Message[],options:Record<string,unknown>)=>Promise<Generated[]>;
let cached:Promise<Generator>|undefined;
export function loadLocalAI(onProgress?:(message:string)=>void):Promise<Generator>{
 if(!cached)cached=(async()=>{
  onProgress?.('Carregando Qwen 2.5 Instruct no celular (primeiro acesso exige download grande)...');
  const url='https://esm.sh/@huggingface/transformers@3.8.1?bundle';
  const lib=await import(/* webpackIgnore: true */ url) as {
   env:{allowLocalModels:boolean;backends?:{onnx?:{wasm?:{numThreads?:number}}}};
   pipeline:(task:string,model:string,opts:object)=>Promise<Generator>;
  };
  lib.env.allowLocalModels=false;
  if(lib.env.backends?.onnx?.wasm)lib.env.backends.onnx.wasm.numThreads=1;
  return await lib.pipeline('text-generation','onnx-community/Qwen2.5-0.5B-Instruct',{
   device:'wasm',dtype:'q4',
   progress_callback:(p:{status?:string;progress?:number})=>{
    if(p.status==='progress'&&typeof p.progress==='number')onProgress?.('Baixando modelo local: '+Math.round(p.progress)+'%');
   }
  });
 })().catch(e=>{cached=undefined;throw e});
 return cached;
}
/** Rewrites the complete ATS draft locally, one bounded paragraph at a time.
 * Sections that cannot be safely rewritten remain unchanged. */
export async function rewriteResumeLocally(draft:string,job:string,language:string,onProgress?:(s:string)=>void):Promise<{text:string;rewritten:number;attempted:number}>{
 const generator=await loadLocalAI(onProgress);
 const sections=draft.split(/(\n\s*\n)/);
 const jobKeywords=job.replace(/\s+/g,' ').slice(0,500);
 const stop=new Set('a an and the or of for to in on at by with from this that these those is are was were as it its who which into through using used work works worked i my me we our you your de da do dos das e em no na nos nas com por para um uma o os a as que seu sua seus suas como ao aos à às um uma'.split(' '));
 const tokens=(s:string)=>[...new Set((s.toLowerCase().match(/[a-záàâãéêíóôõúç0-9][a-záàâãéêíóôõúç0-9+.#/-]*/g)||[]).filter(w=>w.length>2&&!stop.has(w)))];
 const rewritten:string[]=[];let changed=0,attempted=0;
 for(let i=0;i<sections.length;i++){
  const section=sections[i];
  if(/^\n\s*\n$/.test(section)){rewritten.push(section);continue;}
  const lines=section.split('\n');
  const heading=lines[0]||'';
  const isHeader=i===0||/^(?:RELEVANT SKILLS|COMPETÊNCIAS RELEVANTES|SKILLS|TECHNICAL SKILLS|COMPETÊNCIAS|LANGUAGES|IDIOMAS|EDUCATION|FORMAÇÃO)/i.test(heading);
  const source=lines.slice(1).join(' ').trim();
  if(isHeader||source.length<80||source.length>1050||attempted>=12){rewritten.push(section);continue;}
  attempted++;
  onProgress?.('IA local adaptando o currículo: seção '+attempted+'...');
  try{
   const messages:Message[]=[
    {role:'system',content:'You are a factual resume editor. Rewrite ONLY the provided text in clear professional prose. Never add new facts, employers, projects, technologies, years, dates, achievements, certifications or skills. Preserve all specific names, dates and URLs. Return ONLY the rewritten text, with no heading, bullets or commentary.'},
    {role:'user',content:'Language: '+(language==='en'?'English':'Portuguese')+'. Tailor the wording to this job description ONLY where supported by the source. Job: '+jobKeywords+'\nOriginal resume section: '+source}
   ];
   const out=await generator(messages,{max_new_tokens:Math.min(260,Math.max(100,Math.ceil(source.length/3))),do_sample:false,return_full_text:false,repetition_penalty:1.15});
   const raw=out[0]?.generated_text;
   const candidate=(typeof raw==='string'?raw:Array.isArray(raw)?raw.at(-1)?.content||'':'').trim();
   const originalTokens=tokens(source),generatedTokens=tokens(candidate);
   const overlap=generatedTokens.filter(w=>originalTokens.includes(w)).length;
   const originalNumbers:string[]=source.match(/\b\d{2,}\b/g)||[];
   const outputNumbers:string[]=candidate.match(/\b\d{2,}\b/g)||[];
   const datesOk=outputNumbers.every(n=>originalNumbers.includes(n))&&originalNumbers.every(n=>outputNumbers.includes(n));
   const urls=source.match(/https?:\/\/[^\s]+/g)||[];
   const urlsOk=urls.every(url=>candidate.includes(url));
   const suspicious=/copyright|all rights reserved|lorem ipsum|as an ai|i cannot|nineteen (?:hundred|ninety|eighty)|since the early|years of experience|decades of experience/i.test(candidate);
   if(candidate.length>=source.length*.55&&candidate.length<=source.length*1.3&&generatedTokens.length>5&&overlap/generatedTokens.length>=.7&&datesOk&&urlsOk&&!suspicious&&candidate!==source){
    rewritten.push(heading+'\n'+candidate);changed++;
   }else rewritten.push(section);
  }catch{rewritten.push(section);}
 }
 return {text:rewritten.join(''),rewritten:changed,attempted};
}
