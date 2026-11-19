export type Analysis = {
  score: number;
  matched: string[];
  missing: string[];
  warnings: string[];
  draft: string;
  mode: string;
  scoreAvailable?: boolean;
};

const aliases: Record<string,string[]> = {
 'Vibe Coding':['vibe coder','vibe coding','vibe-coded'],
 'AI-assisted development':['ai-assisted software developer','ai assisted development','ai-assisted development','development with ai','desenvolvimento assistido por ia'],
 'Full Stack':['full-stack','full stack','frontend and backend','front-end and back-end'],
 'REST API':['rest api','restful api','api integration','api/database integration','integração de api','integrações de api'],
 'Automation':['automation','automação','automations'],
 'Low-code':['low code','low-code','no-code'],
 'Cloud':['cloud','nuvem'],
 'Testing':['testing','tests','testes','testagem'],
 'Security':['security','segurança'],
 'Git':['github','git'],
 'Agile':['agile','agile methodology','metodologias ágeis']
};

const terms = [
  'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'Python',
  'PostgreSQL', 'SQL', 'Docker', 'Azure', 'AWS', 'GCP', 'REST API',
  'GraphQL', 'Git', 'CI/CD', 'Kubernetes', 'Machine Learning', 'LLM',
  'Prompt Engineering', 'OpenAI', 'LangChain', 'Supabase', 'Express',
  'FastAPI', 'React Native', 'Agile', 'Scrum', 'HTML', 'CSS', 'Tailwind',
  'Java', 'C#', 'PHP', 'Redis', 'MongoDB', 'Testing', 'Security', 'Automation',
  'Power Apps', 'Power Automate', 'Low-code', 'Vibe Coding', 'AI-assisted development', 'Full Stack', 'Cloud'
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
 const lines=cv.split(/\r?\n/).map(x=>x.trim()).filter(x=>x.length>=35 && x.length<=600);
 const scored=lines.map((line,index)=>({line,index,score:matched.filter(term=>containsTerm(line,term)).length}));
 return scored.filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,5).map(x=>x.line);
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
      'Cobertura limitada a palavras-chave reconhecidas; não representa uma nota ATS nem mede a adequação total à vaga.',
      'Nenhuma experiência ou competência foi acrescentada ao currículo.',
      'Trechos relevantes são citações literais do currículo, não provas de domínio técnico. Remova cabeçalhos de revisão e duplicações antes de enviar.'
    ],
    draft: examples.length ? ['RELEVANT EXPERIENCE — VERIFY BEFORE SENDING',...examples,'','FULL ORIGINAL RESUME',cv].join('\n') : cv,
    mode: 'local'
  };
}
