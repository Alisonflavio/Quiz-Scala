# Quiz Scala

Projeto da Personal Trainer Academy (Scala Fitness). Dois blocos independentes:

| Pasta / arquivo | O que é |
|---|---|
| `index.html` | Página inicial do quiz (HTML estático). |
| `scala-forms/` | App Next.js: criador de formulários/quizzes, respostas, integrações e Diagnóstico Scala. Veja o [README](scala-forms/README.md) para rodar, testar e publicar. |
| `brand/` | Logos e selo (SVG) da marca. |
| `video/`, `prova-vendas.jpg` | Mídias usadas pela página inicial. |

## Padrões do repositório

- `.editorconfig` define indentação, fim de linha e charset (valem para qualquer editor).
- Formatação e lint do app ficam em `scala-forms/` (`npm run format`, `npm run lint`).
- Segredos só em variáveis de ambiente; use `scala-forms/.env.example` como modelo e nunca commite `.env*`.
- Commits no padrão Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).

## Pendências conhecidas

- `brand/`, `video/` e `prova-vendas.jpg` estão duplicados em `scala-forms/public/`. Plano: manter só a cópia do app e apontar a página inicial para ela (depende de como a página inicial é publicada).
