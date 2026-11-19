export type Analysis = {
  score: number;
  matched: string[];
  missing: string[];
  warnings: string[];
  draft: string;
  mode: string;
  scoreAvailable?: boolean;
  recommendations?: string[];
  coverage?: {required:number;found:number;related:number};
  evidence?: string[];
  contextual?: {requirement:string; evidence:string; explanation:string}[];
};

const aliases: Record<string,string[]> = {
 'Vibe Coding':['vibe coder','vibe coding','vibe-coded'],
 'AI-assisted development':['ai-assisted software developer','ai assisted development','ai-assisted development','development with ai','desenvolvimento assistido por ia'],
 'Full Stack':['full-stack','full stack','frontend and backend','front-end and back-end'],
 'Automation':['automation','automação','automations'],
 'Low-code':['low code','low-code','no-code'],
 'Cloud':['cloud','nuvem'],
 'Testing':['testing','tests','testes','testagem'],
 'Security':['security','segurança'],
 'Git':['github','git'],
 'Agile':['agile','agile methodology','metodologias ágeis'],
 'CI/CD':['continuous integration','continuous delivery','continuous deployment','integração contínua','entrega contínua'],
 'Power Apps':['microsoft power apps','powerapps'],
 'Power Automate':['microsoft power automate','microsoft flow'],
 'TypeScript':['typescript','type script'],
 'PostgreSQL':['postgresql','postgres'],
 'REST API':['rest api','restful api','api integration','api/database integration','integração de api','integrações de api','apis rest'],
 'Prompt Engineering':['prompt engineering','engenharia de prompts','prompt design'],
 'React Native':['react native','react-native'],
 'Machine Learning':['machine learning','aprendizado de máquina']
};

const terms = [
  'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'Python',
  'PostgreSQL', 'SQL', 'Docker', 'Azure', 'AWS', 'GCP', 'REST API',
  'GraphQL', 'Git', 'CI/CD', 'Kubernetes', 'Machine Learning', 'LLM',
  'Prompt Engineering', 'OpenAI', 'LangChain', 'Supabase', 'Express',
  'FastAPI', 'React Native', 'Agile', 'Scrum', 'HTML', 'CSS', 'Tailwind',
  'Java', 'C#', 'PHP', 'Redis', 'MongoDB', 'Testing', 'Security', 'Automation',
  'Power Apps', 'Power Automate', 'Low-code', 'Vibe Coding', 'AI-assisted development', 'Full Stack', 'Cloud',
  'TDD', 'BDD', 'Code Review', 'API Integration', 'Accessibility', 'Data Analysis', 'UX', 'Figma'
];

function containsLiteral(source: string, term: string): boolean {
  const normalizedSource = source.toLocaleLowerCase('en');
  const normalizedTerm = term.toLocaleLowerCase('en');
  let index = normalizedSource.indexOf(normalizedTerm);

  while (index !== -1) {
    const previous = index === 0 ? '' : normalizedSource[index - 1];
    const nextIndex = index + normalizedTerm.length;
    const next = nextIndex >= normalizedSource.length ? '' : normalizedSource[nextIndex];
    const isWordChar = (char: string) => /[a-z0-9]/i.test(char);

    if ((!previous || !isWordChar(previous)) && (!next || !isWordChar(next))) {
      return true;
    }

    index = normalizedSource.indexOf(normalizedTerm, index + 1);
  }

  return false;
}

function containsTerm(source:string,term:string):boolean {
 return [term,...(aliases[term]||[])].some(alias=>containsLiteral(source,alias));
}

function evidence(cv:string,matched:string[]):string[] {
 const lines=cv.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const chunks:string[]=[];
 let current='';
 for(const line of lines){
  if(/^\d{1,3}$/.test(line))continue;
  if(line.length<65 && current.length>60){chunks.push(current.trim());current='';}
  current+=(current?' ':'')+line;
  if(current.length>=220){chunks.push(current.trim());current='';}
 }
 if(current)chunks.push(current.trim());
 const scored=chunks.map((line,index)=>({line,index,score:matched.filter(term=>containsTerm(line,term)).length}));
 return scored.filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,5).map(x=>x.line);
}


/** Conservative, auditable contextual signals. These never become confirmed skills. */
const contextualRules: Record<string,{signals:string[];explanation:string}> = {
 'Cloud':{signals:['web/android distribution','web deployment','hosting','hosted','deployed','vercel','cloudflare','render.com','aws','azure','google cloud','hetzner','vps','cloud hosting','deploy','deployment','hospedagem'],explanation:'Indício de publicação ou infraestrutura; não comprova domínio geral de computação em nuvem.'},
 'CI/CD':{signals:['github actions','gitlab ci','automated deployment','automated builds','pipeline','continuous integration','continuous delivery'],explanation:'Possível experiência com automação de entrega; confirme ferramentas e responsabilidades.'},
 'Agile':{signals:['iterative testing','iterative','iterates','iteration','sprint','scrum','kanban','iterative development','desenvolvimento iterativo','iterações','iterative testing'],explanation:'Indício de prática iterativa; não comprova atuação formal com metodologias ágeis.'},
 'Low-code':{signals:['ai coding tools','natural-language prompting','ai-assisted development','vibe coder','lovable','replit','no-code','low code','low-code','visual builder'],explanation:'Experiência relacionada a ferramentas de construção assistida; não comprova Power Apps.'},
 'Testing':{signals:['testing','test','debugging','functional review','test user flows','quality assurance','testes funcionais'],explanation:'Atividades relacionadas a testes; não comprova TDD ou BDD.'},
 'Security':{signals:['authentication','autenticação','access control','cybersecurity','cibersegurança'],explanation:'Contato com temas de segurança; não comprova especialização em segurança de aplicações.'},
 'API Integration':{signals:['api/database integration','data integrations','api','apis','integração','integration','backend'],explanation:'Possível experiência com integrações; verifique o tipo e o nível de participação.'},
 'Code Review':{signals:['reviews outputs','reviewed code','revisão de código','code review'],explanation:'Atividade relacionada a revisão; confirme se envolve revisão técnica de código.'}
};
function contextualEvidence(cv:string,missing:string[]):NonNullable<Analysis['contextual']>{
 const lines=cv.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const results:NonNullable<Analysis['contextual']>=[];
 for(const requirement of missing){
  const rule=contextualRules[requirement];
  if(!rule)continue;
  const index=lines.findIndex(line=>rule.signals.some(signal=>containsLiteral(line,signal)));
  if(index<0)continue;
  const excerpt=lines.slice(Math.max(0,index-1),Math.min(lines.length,index+2)).join(' ').slice(0,350);
  results.push({requirement,evidence:excerpt,explanation:rule.explanation});
 }
 return results;
}

const headings=/^(PROFESSIONAL SUMMARY|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|PROJECTS|SELECTED PROJECTS|EDUCATION|ACADEMIC BACKGROUND|SKILLS|TECHNICAL SKILLS|CERTIFICATIONS|LANGUAGES|AI-ASSISTED DEVELOPMENT METHOD|RESUMO PROFISSIONAL|EXPERIÊNCIA PROFISSIONAL|PROJETOS|FORMAÇÃO|COMPETÊNCIAS|IDIOMAS)\s*:?$/i;

export function tailorResume(cv:string,job:string,language:string):string {
 const clean=cv.replace(/^\s*\d{1,3}\s*$/gm,'').trim();
 const lines=clean.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const sections:{title:string;lines:string[]}[]=[];
 let section={title:'HEADER',lines:[] as string[]};
 for(const line of lines){
  if(headings.test(line)){
   if(section.lines.length)sections.push(section);
   section={title:line.replace(/:$/,''),lines:[]};
  }else section.lines.push(line);
 }
 if(section.lines.length)sections.push(section);
 if(sections.length<2)return clean;
 const requested=terms.filter(term=>containsTerm(job,term));
 const matched=requested.filter(term=>containsTerm(clean,term));
 const score=(text:string)=>matched.filter(term=>containsTerm(text,term)).length;
 const header=sections.find(s=>s.title==='HEADER');
 const summary=sections.find(s=>/SUMMARY|RESUMO/i.test(s.title));
 const skills=sections.filter(s=>/SKILLS|COMPETÊNCIAS/i.test(s.title));
 const other=sections.filter(s=>s!==header&&s!==summary&&!skills.includes(s));
 const output:string[]=[];
 if(header)output.push(...header.lines,'');
 // Create a job-oriented summary using only complete sentences from the original summary.
 if(summary){
  const summaryText=summary.lines.join(' ').replace(/\s+/g,' ').trim();
  const sentences=summaryText.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s=>s.trim()).filter(Boolean)||[];
  const ranked=sentences.map((text,i)=>({text,i,score:score(text)}))
    .sort((a,b)=>b.score-a.score||a.i-b.i);
  const selected=ranked.filter(s=>s.score>0).slice(0,3);
  const fallback=ranked.find(s=>s.i===0);
  const chosen=selected.length?selected:(fallback?[fallback]:[]);
  output.push(summary.title,...chosen.map(s=>s.text),'');
 }
 // The focus block contains only skill labels that also appear in the original resume.
 if(matched.length){
  output.push(language==='en'?'RELEVANT SKILLS FOR THIS ROLE':'COMPETÊNCIAS RELEVANTES PARA ESTA VAGA',matched.join(' | '),'');
 }
 for(const s of skills){
  // Keep lines and categories intact: splitting wrapped PDF lines can corrupt skills.
  output.push(s.title,...s.lines,'');
 }
 for(const s of other){
  // Keep experience entries, dates and chronology intact, including unrelated jobs.
  output.push(s.title,...s.lines,'');
 }
 return output.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}

export function localAnalysis(cv: string, job: string): Analysis {
  const requested = terms.filter(term => containsTerm(job, term));
  const matched = requested.filter(term => containsTerm(cv, term));
  const missing = requested.filter(term => !containsTerm(cv, term));

  const examples=evidence(cv,matched);
  const contextual=contextualEvidence(cv,missing);
  const recommendations:string[]=[];
  if(!requested.length)recommendations.push('Não foram identificados requisitos técnicos do catálogo. Verifique manualmente a descrição da vaga.');
  if(missing.length)recommendations.push('Revise os requisitos ausentes: '+missing.slice(0,8).join(', ')+'. Inclua apenas competências que você realmente possui e pode demonstrar.');
  if(contextual.length)recommendations.push('Confira as experiências relacionadas abaixo. Se houver comprovação concreta, descreva a atividade e o projeto no currículo, sem transformar indícios em certificações ou domínio técnico.');
  if(!/https?:\/\//i.test(cv))recommendations.push('Considere incluir links verificáveis de portfólio ou projetos, quando disponíveis.');
  if(/APPLICATION NOTES|REMOVE AFTER VERIFICATION|TODO|PLACEHOLDER/i.test(cv))recommendations.push('Há notas internas ou marcadores de revisão no currículo original. Confira se foram retirados do documento final.');
  recommendations.push('Antes de candidatar-se, revise datas, cargos, idioma e requisitos obrigatórios da vaga.');
  return {
    score: requested.length ? Math.round(100 * matched.length / requested.length) : 0,
    scoreAvailable: requested.length > 0,
    matched,
    missing,
    warnings: [
      'Motor local independente: a cobertura compara termos técnicos identificados, não é nota oficial de ATS nem avaliação completa de experiência.',
      'Nenhuma experiência ou competência foi acrescentada ao currículo.',
      'Trechos relevantes são citações literais do currículo, não provas de domínio técnico. Remova cabeçalhos de revisão e duplicações antes de enviar.'
    ],
    evidence: examples,
    contextual,
    recommendations,
    coverage:{required:requested.length,found:matched.length,related:contextual.length},
    draft: cv,
    mode: 'local'
  };
}
