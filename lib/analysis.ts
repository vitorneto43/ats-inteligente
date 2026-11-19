export type Analysis = {
  score: number;
  matched: string[];
  missing: string[];
  warnings: string[];
  draft: string;
  mode: string;
  scoreAvailable?: boolean;
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

function containsTerm(source: string, term: string): boolean {
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

export function localAnalysis(cv: string, job: string): Analysis {
  const requested = terms.filter(term => containsTerm(job, term));
  const matched = requested.filter(term => containsTerm(cv, term));
  const missing = requested.filter(term => !containsTerm(cv, term));

  return {
    score: requested.length ? Math.round(100 * matched.length / requested.length) : 0,
    scoreAvailable: requested.length > 0,
    matched,
    missing,
    warnings: [
      'Cobertura limitada a palavras-chave reconhecidas; não representa uma nota ATS nem mede a adequação total à vaga.',
      'Nenhuma experiência ou competência foi acrescentada ao currículo.',
      'Revise manualmente todos os requisitos e o texto antes de enviar.'
    ],
    draft: cv,
    mode: 'local'
  };
}
