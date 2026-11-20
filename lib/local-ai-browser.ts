type Message={role:'system'|'user';content:string};
type Generated={generated_text:string|Array<{role:string;content:string}>};
type Generator=(input:Message[],options:Record<string,unknown>)=>Promise<Generated[]>;
let cached:Promise<Generator>|undefined;
export function loadLocalAI(onProgress?:(message:string)=>void):Promise<Generator>{
 if(!cached)cached=(async()=>{
  onProgress?.('Carregando SmolLM2 360M Instruct no celular (primeiro acesso exige download grande)...');
  const url='https://esm.sh/@huggingface/transformers@3.8.1?bundle';
  onProgress?.('Carregando biblioteca de IA no navegador...');
  const lib=await import(/* webpackIgnore: true */ url) as {
   env:{allowLocalModels:boolean;backends?:{onnx?:{wasm?:{numThreads?:number}}}};
   pipeline:(task:string,model:string,opts:object)=>Promise<Generator>;
  };
  lib.env.allowLocalModels=false;
  if(lib.env.backends?.onnx?.wasm)lib.env.backends.onnx.wasm.numThreads=1;
  onProgress?.('Preparando modelo local (SmolLM2 360M, arquivo de aproximadamente 386 MB)...');
  return await lib.pipeline('text-generation','onnx-community/SmolLM2-360M-Instruct-ONNX',{
   device:'wasm',dtype:'q4',
   progress_callback:(p:{status?:string;progress?:number;file?:string})=>{
    if(p.status==='progress'&&typeof p.progress==='number')onProgress?.('Baixando modelo local: '+Math.round(p.progress)+'%');
    else if(p.status==='initiate'&&p.file)onProgress?.('Solicitando arquivo da IA: '+String(p.file));
   }
  });
 })().catch(e=>{cached=undefined;throw new Error('Falha ao carregar modelo SmolLM2 no celular: '+(e instanceof Error?e.message:String(e)))});
 return cached;
}
/** Controlled editing: preserve original lines, employers, dates, and links.
 * The local model may improve wording of a descriptive line, never create a new entry.
 * Rejected edits are kept verbatim and counted for transparent diagnostics. */
export async function rewriteResumeLocally(draft:string,job:string,language:string,onProgress?:(s:string)=>void):Promise<{text:string;rewritten:number;attempted:number;rejected:number}>{
 const generator=await loadLocalAI(onProgress);
 onProgress?.('Modelo carregado. Identificando trechos editáveis...');
 const lines=draft.split(/\r?\n/);
 const jobContext=job.replace(/\s+/g,' ').slice(0,750);
 const protectedLine=/^(?:https?:\/\/|www\.|\S+@\S+|\+?\d[\d\s()+.-]{7,}|(?:PROFESSIONAL|WORK|EXPERIENCE|PROJECTS|EDUCATION|SKILLS|TECHNICAL|CERTIFICATIONS|LANGUAGES|RESUMO|EXPERIÊNCIA|PROJETOS|FORMAÇÃO|COMPETÊNCIAS|IDIOMAS|RELEVANT|AI-ASSISTED)\b)/i;
 const technical=/\b(?:React|Node|Next|Python|JavaScript|TypeScript|PostgreSQL|Docker|Supabase|Vercel|GitHub|Azure|AWS|SQL|API|LLM|Vibe|OpenAI|Claude|Lovable|Replit|n8n|Power Apps|Power Automate)\b/gi;
 const words=(s:string)=>[...new Set((s.toLowerCase().match(/[a-záàâãéêíóôõúç][a-záàâãéêíóôõúç0-9+.#/-]{2,}/g)||[]).filter(w=>!['the','and','for','with','from','that','this','are','was','were','you','your','uma','para','com','dos','das','que','por','como','seus','suas'].includes(w)))];
 const output=[...lines];let attempted=0,rewritten=0,rejected=0;
 for(let i=0;i<lines.length;i++){
  const source=lines[i].trim();
  // Edit only self-contained descriptive statements; never rewrite headers, dates,
  // contact details, company/project names on standalone lines, or section titles.
  if(source.length<65||source.length>480||protectedLine.test(source)||/^[-•*]?\s*(?:\d{4}|\d{2}\/\d{4})\b/.test(source)||attempted>=10)continue;
  const bullet=/^([-•*]\s+)/.exec(source)?.[1]||'';
  const original=source.slice(bullet.length);
  attempted++;
  onProgress?.('IA editando trecho '+attempted+' (alterações verificadas antes de aplicar)...');
  try{
   const messages:Message[]=[
    {role:'system',content:'You are a copy editor, not a resume author. Make MINIMAL wording improvements to ONE existing resume sentence. Preserve ALL facts, nouns, technology names, organizations, numbers, dates and links. Do not add achievements or requirements from the job. If no safe improvement exists, return the original sentence verbatim. Output only the edited sentence.'},
    {role:'user',content:'Language: '+(language==='en'?'English':'Portuguese')+'. Vacancy context (for emphasis ONLY): '+jobContext+'\nEDIT THIS EXISTING SENTENCE, without adding or removing facts:\n'+original}
   ];
   const generated=await generator(messages,{max_new_tokens:Math.min(180,Math.max(90,Math.ceil(original.length/2))),do_sample:false,return_full_text:false,repetition_penalty:1.08});
   const raw=generated[0]?.generated_text;
   const candidate=(typeof raw==='string'?raw:Array.isArray(raw)?raw.at(-1)?.content||'':'').trim().replace(/^["']|["']$/g,'');
   const oldWords=words(original),newWords=words(candidate);
   const overlap=newWords.filter(w=>oldWords.includes(w)).length/Math.max(newWords.length,1);
   const originalNums:string[]=original.match(/\b\d+(?:[.,]\d+)?\b/g)||[];
   const newNums:string[]=candidate.match(/\b\d+(?:[.,]\d+)?\b/g)||[];
   const numbersOk=originalNums.every(n=>newNums.includes(n))&&newNums.every(n=>originalNums.includes(n));
   const entities=original.match(technical)||[];
   const entitiesOk=entities.every(e=>candidate.toLowerCase().includes(e.toLowerCase()));
   const urls=original.match(/https?:\/\/[^\s]+/g)||[];
   const urlsOk=urls.every(u=>candidate.includes(u));
   const safe=candidate.length>=original.length*.8&&candidate.length<=original.length*1.18&&overlap>=.82&&numbersOk&&entitiesOk&&urlsOk&&!/copyright|lorem ipsum|as an ai|years of experience|decades of experience|since the early|original sentence|edited sentence/i.test(candidate)&&!candidate.includes('\n');
   if(safe&&candidate!==original){output[i]=bullet+candidate;rewritten++;}
   else if(candidate!==original)rejected++;
  }catch{rejected++;}
 }
 onProgress?.('Verificação concluída: '+rewritten+' trechos editados, '+rejected+' alterações rejeitadas, '+attempted+' examinados.');
 return {text:output.join('\n'),rewritten,attempted,rejected};
}
