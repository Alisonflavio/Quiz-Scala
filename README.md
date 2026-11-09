# Quiz Scala

Projeto da Personal Trainer Academy (Mentoria Scala Fitness). Todo o sistema fica em [`scala-forms/`](scala-forms/README.md): app Next.js com o criador de formulários, o Diagnóstico Scala, a página de obrigado e o painel de respostas.

| Pasta / arquivo | O que é |
|---|---|
| `scala-forms/` | O app (código, testes e [documentação](scala-forms/docs/)) |
| `.editorconfig` | Indentação, fim de linha e charset para qualquer editor |
| `.mcp.json` | Conexão do Claude Code com o Supabase do projeto |

O protótipo antigo em HTML estático (`index.html`, `brand/`, `video/`, `prova-vendas.jpg`) foi removido em novembro/2026; continua no histórico do git.

## Padrões do repositório

- Formatação e lint em `scala-forms/` (`npm run format`, `npm run lint`).
- Segredos só em variáveis de ambiente; modelo em `scala-forms/.env.example`. Nunca commite `.env*`.
- Commits no padrão Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
