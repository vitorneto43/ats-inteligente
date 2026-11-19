'use client';
import {useState} from 'react';

type Engine = {chat:{completions:{create:(args:{messages:{role:string;content:string}[];max_tokens:number;temperature:number})=>Promise<{choices:{message:{content?:string}}[]}>}}};
export default function LocalAiTest(){
 const [status,setStatus]=useState(''),[answer,setAnswer]=useState(''),[busy,setBusy]=useState(false),[stage,setStage]=useState('não iniciado'),[details,setDetails]=useState('');
 async function runCpu(){
  if(!window.confirm('Teste pela CPU: pode baixar dezenas ou centenas de MB e demorar alguns minutos. Use Wi-Fi. Continuar?'))return;
  let step='biblioteca CPU';setBusy(true);setAnswer('');setDetails('');setStatus('Carregando biblioteca CPU...');
  try{
   const url='https://esm.sh/@huggingface/transformers@3.8.1?bundle';
   const lib=await import(/* webpackIgnore: true */ url) as {
    env:{allowLocalModels:boolean;backends?:{onnx?:{wasm?:{numThreads?:number}}}};
    pipeline:(task:string,model:string,opts:object)=>Promise<(input:string,opts:object)=>Promise<Array<{generated_text:string}>>>;
   };
   lib.env.allowLocalModels=false;
   if(lib.env.backends?.onnx?.wasm)lib.env.backends.onnx.wasm.numThreads=1;
   step='download do modelo CPU';setStatus('Baixando modelo CPU...');
   const generator=await lib.pipeline('text2text-generation','Xenova/flan-t5-small',{device:'wasm',dtype:'q8',progress_callback:(p:{status?:string;progress?:number})=>{if(p.status==='progress'&&typeof p.progress==='number')setStatus('Download CPU: '+Math.round(p.progress)+'%');}});
   step='geração CPU';setStatus('Gerando texto na CPU...');
   const start=performance.now();
   const out=await generator('Rewrite professionally without adding facts: I build software projects with AI assistance.',{max_new_tokens:48});
   setAnswer(out[0]?.generated_text||'Modelo não retornou texto.');
   setStatus('CPU gerou texto em '+((performance.now()-start)/1000).toFixed(1)+' segundos. Teste técnico, ainda não integrado ao currículo.');
  }catch(e){const msg=e instanceof Error?e.message:String(e);setDetails('Teste CPU | Etapa: '+step+' | Erro: '+msg);setStatus('Teste CPU falhou. Copie o diagnóstico abaixo para investigarmos.');}
  finally{setBusy(false);}
 }
 async function run(){
  if(!window.confirm('O primeiro teste pode baixar centenas de MB de um modelo de IA e demorar alguns minutos. Prefira Wi-Fi. Continuar?'))return;
  let currentStage='biblioteca';setBusy(true);setAnswer('');setDetails('');setStage('biblioteca');setStatus('Carregando biblioteca de IA...');
  try{
   const moduleUrl='https://esm.run/@mlc-ai/web-llm';
   // Load only after user approval; no model is fetched on initial page load.
   const webllm=await import(/* webpackIgnore: true */ moduleUrl) as {CreateMLCEngine:(id:string,opts:{initProgressCallback:(p:{text:string})=>void})=>Promise<Engine>};
   currentStage='inicialização do modelo';setStage(currentStage);setStatus('Baixando e inicializando modelo de IA (primeira vez pode demorar)...');
   const engine=await webllm.CreateMLCEngine('Qwen2.5-0.5B-Instruct-q4f16_1-MLC',{initProgressCallback:p=>setStatus(p.text)});
   currentStage='geração de texto';setStage(currentStage);setStatus('Modelo carregado. Gerando resposta...');
   const start=performance.now();
   const result=await engine.chat.completions.create({messages:[{role:'system',content:'Responda em português, de forma breve e fiel aos fatos.'},{role:'user',content:'Explique em uma frase como adaptar um currículo a uma vaga sem inventar experiências.'}],max_tokens:80,temperature:0.2});
   currentStage='concluído';setStage(currentStage);setAnswer(result.choices[0]?.message?.content||'Modelo respondeu sem texto.');
   setStatus('Teste concluído em '+((performance.now()-start)/1000).toFixed(1)+' segundos de geração. Modelo executado no navegador.');
  }catch(e){const message=e instanceof Error?e.message:String(e);setDetails('Etapa: '+currentStage+' | Erro: '+message);setStatus('Falha no teste de IA local. '+(message.includes('GPUBuffer')||message.includes('Instance reference')?'O Chrome perdeu um recurso da GPU. Feche outras abas e aplicativos, reinicie o Chrome e tente uma única vez. Se repetir, não insista: precisamos de outro mecanismo de execução.':'Confira os detalhes abaixo.')+' A análise normal do ATS não foi afetada.');}
  finally{setBusy(false);}
 }
 return <section className="panel"><h2>Teste real de IA no celular</h2><p className="muted">Modelo experimental Qwen 0,5B no navegador. Usa WebGPU, pode consumir centenas de MB no primeiro acesso e não envia seu currículo para a IA neste teste.</p><button className="secondary" disabled={busy} onClick={runCpu}>{busy?'Executando teste...':'Testar IA pela CPU (sem WebGPU)'}</button><p className="muted">Alternativa experimental WebAssembly: Flan-T5 pequeno. Usa frase fictícia, não seu currículo.</p><button className="secondary" disabled={busy} onClick={run}>{busy?'Executando teste...':'Baixar modelo e testar IA local'}</button>{status&&<p role="status" className="muted">{status}</p>}{details&&<><p className="muted">{details}</p><button className="secondary" onClick={()=>navigator.clipboard?.writeText(details)}>Copiar diagnóstico</button></>}{answer&&<p><b>Resposta da IA:</b> {answer}</p>}</section>;
}
