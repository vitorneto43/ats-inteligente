export type Analysis = {
  score: number;
  matched: string[];
  missing: string[];
  warnings: string[];
  draft: string;
  mode: string;
  scoreAvailable?: boolean;
  evidence?: string[];
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
    draft: cv,
    mode: 'local'
  };
}
