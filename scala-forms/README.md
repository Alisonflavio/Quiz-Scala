# Scala Forms

Criador de formulários e quizzes da Personal Trainer Academy, no formato do Respondi:
login do time, vários formulários, editor de perguntas, pontuação, lógica, temperatura do lead
(frio/morno/quente, automática e manual), respostas dentro do app, exportação, webhook, Google Planilha,
Pixel da Meta, GTM, GA, TikTok e o resultado personalizado do Diagnóstico Scala Fitness.

## Rodar no computador

```bash
npm install
npm run dev
```

Abra http://localhost:3000. No primeiro acesso aparece a tela para criar o administrador.
Os dados ficam na pasta `.data/` (banco embutido).

## Colocar no ar (Vercel + Supabase)

1. **Supabase**: crie um projeto. Em _Project Settings → Database → Connection string_, copie a
   string do **Transaction pooler** (porta 6543) e troque `[YOUR-PASSWORD]` pela senha do banco.
2. **Vercel**: importe o repositório do GitHub e, em _Environment Variables_, adicione:
   - `DATABASE_URL`: a string do Supabase
   - `AUTH_SECRET`: um texto aleatório longo (`openssl rand -base64 32`)
3. Faça o deploy. As tabelas são criadas sozinhas no primeiro acesso.
4. Abra o site, crie o administrador e adicione o time em **Seus times**.

Para trocar a conta do Supabase (pessoal → empresa) depois, basta criar o projeto novo e trocar
`DATABASE_URL` na Vercel. Para levar os dados junto, exporte/importe o banco pelo painel do Supabase.

## Scripts

| Comando                           | O que faz                                           |
| --------------------------------- | --------------------------------------------------- |
| `npm run dev`                     | Servidor de desenvolvimento                         |
| `npm run build`                   | Build de produção                                   |
| `npm run lint`                    | ESLint                                              |
| `npm run typecheck`               | Gera os tipos de rota do Next e roda `tsc --noEmit` |
| `npm test`                        | Testes (Vitest) em `tests/`, espelhando `src/`      |
| `npm run format` / `format:check` | Prettier (escreve / só confere)                     |

## Onde fica cada coisa

| Pasta                   | O que é                                                                    |
| ----------------------- | -------------------------------------------------------------------------- |
| `src/app/dash`          | Painel (lista, editor, opções, integrações, compartilhar, respostas, time) |
| `src/app/f/[id]`        | Página pública do formulário                                               |
| `src/app/api/f/[id]`    | Recebe as respostas (salva parciais e completas, dispara integrações)      |
| `src/components/editor` | Editor de campos, pontuação, lógica e mídia                                |
| `src/components/runner` | Formulário público, pixels e o resultado do Diagnóstico Scala              |
| `src/lib`               | Banco, login, regras (pontuação, lógica, temperatura) e metodologia Scala  |
| `tests`                 | Testes automatizados; a estrutura espelha `src/`                           |

## Webhook

Cada envio é um POST em JSON com campos planos: `evento` (`completa`, `parcial`, `validou_sim`,
`validou_nao`, `corrigiu`, `clicou_whatsapp`), `resposta_id`, `pontuacao`, `temperatura`, uma chave por
**variável** de pergunta (e `<variavel>_valor` nas de múltipla escolha), UTMs e, no Diagnóstico Scala,
`diagnostico` (ex.: "Especialista em Vendas"), `gargalo`, `renda_meta`, `prisao_pct`, `meta_pct`.
