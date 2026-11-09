# Scala Forms

Criador de formulários e quizzes da Personal Trainer Academy, no formato do Respondi: login do time, vários formulários, editor de perguntas, pontuação, lógica, temperatura do lead (frio/morno/quente, automática e manual), respostas no painel, exportação CSV, webhook (Make → RD Station), Google Planilha, Pixel da Meta, GTM, GA e TikTok, o resultado personalizado do **Diagnóstico Scala Fitness** e a página de obrigado com a aula do Rafael.

## Documentação

| Documento                                  | Conteúdo                                                         |
| ------------------------------------------ | ---------------------------------------------------------------- |
| [docs/arquitetura.md](docs/arquitetura.md) | Caminho de um lead, pastas e regras do projeto                   |
| [docs/banco.md](docs/banco.md)             | Tabelas, colunas, migrações e consultas úteis                    |
| [docs/integracoes.md](docs/integracoes.md) | Webhook (formatos, tentativas, reenvio), cenário do Make, pixels |
| [docs/deploy.md](docs/deploy.md)           | Vercel, variáveis de ambiente, domínio                           |
| [docs/operacao.md](docs/operacao.md)       | Reenviar lead, restaurar versão, problemas comuns                |

## Rodar no computador

```bash
npm install
npm run dev
```

Abra http://localhost:3000. No primeiro acesso aparece a tela para criar o administrador. Sem `DATABASE_URL`, os dados ficam na pasta `.data/` (Postgres embutido); as migrações rodam sozinhas.

## Scripts

| Comando                           | O que faz                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Servidor de desenvolvimento                                                                                                     |
| `npm run build`                   | Build de produção                                                                                                               |
| `npm test`                        | Testes (Vitest) em `tests/`, espelhando `src/`                                                                                  |
| `npm run typecheck`               | Gera os tipos de rota do Next e roda `tsc --noEmit`                                                                             |
| `npm run lint`                    | ESLint                                                                                                                          |
| `npm run format` / `format:check` | Prettier (escreve / só confere)                                                                                                 |
| `npm run e2e`                     | Teste ponta a ponta do Diagnóstico no navegador (com `npm run dev` rodando e banco de teste; ver `scripts/e2e-diagnostico.mjs`) |

Antes de publicar: `npm test && npm run typecheck && npm run lint && npm run build`. O GitHub Actions (`.github/workflows/ci.yml`) roda essas verificações a cada push e pull request. Como publicar: [docs/deploy.md](docs/deploy.md).
