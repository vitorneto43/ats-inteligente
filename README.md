# ATS Inteligente

Aplicação web independente para comparar currículos e vagas e preparar versões estruturadas para revisão humana.

## Motor próprio (sem APIs de IA externas)

- Extração de texto de PDF, DOCX e TXT no servidor
- Identificação de competências e equivalências por dicionário local
- Cobertura de termos técnicos da vaga presentes no currículo
- Evidências literais para conferência
- Reorganização conservadora do currículo, sem inventar qualificações
- Exportação DOCX e impressão/PDF

O percentual é **cobertura de termos reconhecidos**, não pontuação oficial ATS. Correspondência textual não prova domínio de uma competência. A versão atual **não utiliza modelo generativo nem aprendizado de máquina**.

## Desenvolvimento

```bash
npm install
npm run dev
```

Acesse http://localhost:3000.

## Próximas etapas

1. Extrator de requisitos por categorias (obrigatórios, desejáveis, experiência e formação)
2. Comparação semântica local e evidências por requisito
3. Avaliação de qualidade de formatação e exportação ATS
4. Conjunto de testes com vagas e currículos fictícios, métricas de precisão
5. Investigar modelos treinados e executados em infraestrutura própria, conforme capacidade de computação e dados autorizados

## Privacidade

Não publicar currículos reais no GitHub. O processamento atual ocorre durante a requisição; não há histórico persistente no aplicativo. Antes de ampliar o uso público, implementar controles de abuso, retenção e privacidade.

Status: protótipo em evolução. Revise sempre o documento antes de enviar.
