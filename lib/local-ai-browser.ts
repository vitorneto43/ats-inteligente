type Generator=(input:string,options:object)=>Promise<Array<{generated_text:string}>>;
let cached:Promise<Generator>|undefined;
export function loadLocalAI(onProgress?:(message:string)=>void):Promise<Generator>{
 if(!cached)cached=(async()=>{
  onProgress?.('Carregando IA local na CPU...');
  const url='https://esm.sh/@huggingface/transformers@3.8.1?bundle';
  const lib=await import(/* webpackIgnore: true */ url) as {
   env:{allowLocalModels:boolean;backends?:{onnx?:{wasm?:{numThreads?:number}}}};
   pipeline:(task:string,model:string,opts:object)=>Promise<Generator>;
  };
  lib.env.allowLocalModels=false;
  if(lib.env.backends?.onnx?.wasm)lib.env.backends.onnx.wasm.numThreads=1;
  return await lib.pipeline('text2text-generation','Xenova/flan-t5-small',{device:'wasm',dtype:'q8',progress_callback:(p:{status?:string;progress?:number})=>{if(p.status==='progress'&&typeof p.progress==='number')onProgress?.('Baixando IA: '+Math.round(p.progress)+'%');}});
 })().catch(e=>{cached=undefined;throw e});
 return cached;
}
export async function generateLocalSummary(original:string,language:string,onProgress?:(s:string)=>void):Promise<string>{
 const generator=await loadLocalAI(onProgress);
 const source=original.replace(/\s+/g,' ').trim().slice(0,550);
 if(!source)return '';
 onProgress?.('IA local preparando sugestão...');
 const instruction=language==='en'?'Rewrite this professional summary clearly, without adding any facts: ':'Reescreva este resumo profissional de forma clara, sem acrescentar fatos: ';
 const out=await generator(instruction+source,{max_new_tokens:140});
 const candidate=(out[0]?.generated_text||'').trim();
 if(!candidate||candidate.toLowerCase()===instruction.concat(source).toLowerCase()||candidate.length<35)return '';
 const bad=/copyright|all rights reserved|vibe software|lorem ipsum|terms of service|privacy policy|http[s]?:|©/i;
 if(bad.test(candidate))return '';
 const words=(s:string)=>new Set((s.toLowerCase().match(/[a-záàâãéêíóôõúç]{4,}/g)||[]).filter(w=>!['this','that','with','from','para','como','sobre','their','there','your','have','were','been'].includes(w)));
 const originalWords=words(source),outputWords=words(candidate);
 const overlap=[...outputWords].filter(w=>originalWords.has(w)).length;
 if(overlap<Math.min(5,Math.ceil(outputWords.size*0.3)))return '';
 // The AI's prose is a suggestion only: never automatically overwrite verified resume data.
 return candidate.slice(0,1000);
}
