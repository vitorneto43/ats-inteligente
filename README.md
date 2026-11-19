# ATS Inteligente

Plataforma web para comparar currículos com vagas e preparar versões adequadas para ATS, sem inventar qualificações.

## MVP
- Next.js + TypeScript
- Upload de PDF, DOCX ou TXT
- Análise de aderência aos requisitos
- Reescrita opcional via API de IA
- Revisão humana antes da exportação

## Executar
```bash
npm install
cp .env.example .env.local
npm run dev
```

A chave `OPENAI_API_KEY` é opcional. Sem ela, o aplicativo faz análise local e preserva o currículo original. Nunca publique `.env.local` ou currículos pessoais no GitHub.

Status: protótipo inicial; necessita testes e validação antes de uso público.