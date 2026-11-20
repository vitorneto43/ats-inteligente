type Message={role:'system'|'user';content:string};
type Generated={generated_text:string|Array<{role:string;content:string}>};
type Generator=(input:Message[],options:Record<string,unknown>)=>Promise<Generated[]>;
let cached:Promise<Generator>|undefined;
export function loadLocalAI(onProgress?:(message:string)=>void):Promise<Generator>{
 if(!cached)cached=(async()=>{
  onProgress?.('Carregando IA de instruções na CPU (primeiro acesso exige download)...');
  const url='https://esm.sh/@huggingface/transformers@3.8.1?bundle';
  const lib=await import(/* webpackIgnore: true */ url) as {
   env:{allowLocalModels:boolean;backends?:{onnx?:{wasm?:{numThreads?:number}}}};
   pipeline:(task:string,model:string,opts:object)=>Promise<Generator>;
  };
  lib.env.allowLocalModels=false;
  if(lib.env.backends?.onnx?.wasm)lib.env.backends.onnx.wasm.numThreads=1;
  return await lib.pipeline('text-generation','onnx-community/SmolLM2-135M-Instruct-ONNX-MHA',{
   device:'wasm',dtype:'q4',
   progress_callback:(p:{status?:string;progress?:number})=>{
    if(p.status==='progress'&&typeof p.progress==='number')onProgress?.('Baixando modelo local: '+Math.round(p.progress)+'%');
   }
  });
 })().catch(e=>{cached=undefined;throw e});
 return cached;
}
export async function generateLocalSummary(original:string,language:string,onProgress?:(s:string)=>void):Promise<string>{
 const source=original.replace(/\s+/g,' ').trim().slice(0,480);
 if(source.length<45)return '';
 const generator=await loadLocalAI(onProgress);
 onProgress?.('IA local reescrevendo o resumo...');
 const target=language==='en'?'English':'Portuguese';
 const messages:Message[]=[
  {role:'system',content:'You edit professional resumes. Use ONLY facts explicitly in the source. Never invent experience, qualifications, employers, dates, names or skills. Output only one polished paragraph in the requested language. No introductions, disclaimers or quotations.'},
  {role:'user',content:'Rewrite the following professional summary in '+target+'. Improve clarity, preserve meaning and factual claims. Do not add any new skills or facts. Source: '+source}
 ];
 const output=await generator(messages,{max_new_tokens:125,do_sample:false,return_full_text:false,repetition_penalty:1.15});
 const raw=output[0]?.generated_text;
 const candidate=(typeof raw==='string'?raw:Array.isArray(raw)?raw.at(-1)?.content||'':'').trim().replace(/^["']|["']$/g,'');
 if(candidate.length<50||candidate.length>source.length*1.7)return '';
 if(/copyright|all rights reserved|vibe software|lorem ipsum|terms of service|privacy policy|https?:|©|as an ai|i cannot/i.test(candidate))return '';
 const words=(s:string)=>new Set((s.toLowerCase().match(/[a-záàâãéêíóôõúç]{4,}/g)||[]).filter(w=>!['this','that','with','from','para','como','sobre','their','there','your','have','were','been'].includes(w)));
 const inputWords=words(source),generatedWords=words(candidate);
 const overlap=[...generatedWords].filter(w=>inputWords.has(w)).length;
 if(overlap<Math.max(5,Math.ceil(generatedWords.size*.4)))return '';
 const sourceNumbers:string[]=source.match(/\b\d{2,}\b/g)||[];
 if((candidate.match(/\b\d{2,}\b/g)||[]).some(n=>!sourceNumbers.includes(n)))return '';
 // Reject new claims about tenure, career starting dates or duration, including spelled-out decades.
 const timeline=/\b(?:since|from|started|began|beginning|early|late|mid|years? of experience|decades?|desde|início|anos de experiência)\b/i;
 if(timeline.test(candidate)&&!timeline.test(source))return '';
 if(/\b(?:nineteen|twenty)\s+(?:hundred|ninety|eighty|seventy|sixty|fifty|forty|thirty|twenty|ten)\b/i.test(candidate))return '';
 return candidate.slice(0,1000);
}
