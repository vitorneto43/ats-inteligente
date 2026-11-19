'use client';
import {useState} from 'react';

type Engine = {chat:{completions:{create:(args:{messages:{role:string;content:string}[];max_tokens:number;temperature:number})=>Promise<{choices:{message:{content?:string}}[]}>}}};
export default function LocalAiTest(){
 const [status,setStatus]=useState(''),[answer,setAnswer]=useState(''),[busy,setBusy]=useState(false),[stage,setStage]=useState('não iniciado'),[details,setDetails]=useState('');
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
 return <section className="panel"><h2>Teste real de IA no celular</h2><p className="muted">Modelo experimental Qwen 0,5B no navegador. Usa WebGPU, pode consumir centenas de MB no primeiro acesso e não envia seu currículo para a IA neste teste.</p><button className="secondary" disabled={busy} onClick={run}>{busy?'Executando teste...':'Baixar modelo e testar IA local'}</button>{status&&<p role="status" className="muted">{status}</p>}{details&&<><p className="muted">{details}</p><button className="secondary" onClick={()=>navigator.clipboard?.writeText(details)}>Copiar diagnóstico</button></>}{answer&&<p><b>Resposta da IA:</b> {answer}</p>}</section>;
}
