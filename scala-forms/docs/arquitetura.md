# Arquitetura

Scala Forms é um app Next.js (App Router) que substitui o Respondi: o time cria formulários e quizzes no painel, o público responde numa página própria, as respostas ficam num Postgres (Supabase) e seguem para o Make, que as leva ao RD Station e ao Google Sheets.

O formulário em produção hoje é o **Diagnóstico Scala Fitness** (id `A6BNBSMsX6`).

## Caminho de um lead

```
/f/A6BNBSMsX6  (FormRunner)
  │  cada pergunta respondida ──► POST /api/f/[id]          salva resposta parcial
  │  última pergunta        ──► POST /api/f/[id] complete   status = complete, pontuação, temperatura
  │                                 └─ after(): webhook (Make) e planilha, com 3 tentativas
  │  Pixel Meta: Lead + EndForm (navegador)
  ▼
Tela do diagnóstico (runner/scala/ScalaDiagnosis)
  │  validou_sim / validou_nao / corrigiu ──► POST /api/f/[id]/event
  ▼  "Ver a solução"
/obrigado?rid=…&fid=…&utm_…  (components/obrigado)
     dados da pessoa vêm do sessionStorage (nunca da URL)
     telefone_corrigido, abriu_aula, aula_play, aula_25..100, chegou_fim ──► /api/f/[id]/event
```

O Make recebe **um envio por lead**, na conclusão (formato "respondi"). Eventos depois disso ficam no banco e aparecem no painel; ver [integracoes.md](integracoes.md).

## Pastas

| Pasta                         | O que tem                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/dash`                | Painel (lista de formulários, editor, opções, integrações, compartilhar, respostas, time, conta) e as server actions (`actions.ts`)                                                                                                                                                                                                                                                                              |
| `src/app/f/[id]`              | Página pública do formulário                                                                                                                                                                                                                                                                                                                                                                                     |
| `src/app/obrigado`            | Página de obrigado do diagnóstico                                                                                                                                                                                                                                                                                                                                                                                |
| `src/app/api/f/[id]`          | Recebe respostas (`route.ts`) e eventos (`event/route.ts`)                                                                                                                                                                                                                                                                                                                                                       |
| `src/app/api/forms/[id]`      | Exportar CSV e testar integração (logado)                                                                                                                                                                                                                                                                                                                                                                        |
| `src/components/runner`       | Formulário público: `FormRunner` (estado e envio), `FieldView` (uma tela), botões, carregamento, pixels (`trackers.ts`)                                                                                                                                                                                                                                                                                          |
| `src/components/runner/scala` | Resultado do Diagnóstico Scala e suas peças visuais                                                                                                                                                                                                                                                                                                                                                              |
| `src/components/obrigado`     | Telas da página de obrigado, player da aula e dados (`data.ts`)                                                                                                                                                                                                                                                                                                                                                  |
| `src/components/editor`       | Editor de perguntas, lógica, pontuação e mídia                                                                                                                                                                                                                                                                                                                                                                   |
| `src/components/responses`    | Tela de respostas do painel                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/components/options`      | Abas Opções e Integrações, histórico de versões                                                                                                                                                                                                                                                                                                                                                                  |
| `src/lib`                     | Regras sem tela: banco (`db.ts`, `migrations.ts`), login (`auth.ts`), formulários (`forms.ts`), respostas e integrações (`responses.ts`), motor de pontuação/lógica (`engine.ts`), diagnóstico (`scala.ts`), colunas do lead (`lead.ts`), formato Respondi (`respondi.ts`), variáveis obrigatórias (`required-keys.ts`), segurança de URL/IP (`safe-fetch.ts`, `ip.ts`), limite de requisições (`rate-limit.ts`) |
| `tests`                       | Vitest; a estrutura espelha `src`                                                                                                                                                                                                                                                                                                                                                                                |
| `docs`                        | Esta documentação                                                                                                                                                                                                                                                                                                                                                                                                |

## Regras que valem para o projeto todo

- **Variáveis obrigatórias.** O diagnóstico e o envio ao Make usam as perguntas pelo nome da variável (`nome`, `email`, `whatsapp`, `renda`, `aumento`, `horas`, `objetivo`). O editor não deixa publicar sem elas (`lib/required-keys.ts`).
- **Banco só por migração.** Mudou tabela, coluna ou índice? Nova entrada no fim de `lib/migrations.ts`. Ver [banco.md](banco.md).
- **Segredos só em variáveis de ambiente.** Webhook e planilha nunca vão para o navegador (`f/[id]/page.tsx` apaga antes de enviar).
- **Dados pessoais fora de URL.** A `/obrigado` recebe só ids e UTMs.
- **Publicar guarda versão.** Cada publicação entra em `form_versions` e pode ser restaurada na aba Opções.
- **Excluir é só para admin** (formulário inteiro ou todas as respostas).
