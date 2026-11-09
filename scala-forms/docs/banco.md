# Banco de dados

Postgres. Em produção, Supabase (projeto `prqfoyhicnjduaplcymw`, região us-east-1), acessado pelo app com `DATABASE_URL` (Transaction pooler, porta 6543). No computador, sem `DATABASE_URL`, o app usa o PGlite (Postgres embutido) na pasta `.data/`.

O app acessa o banco como dono, pelo servidor. As tabelas têm RLS ligado e **nenhuma policy**: a API pública do Supabase (chave anon) não lê nem grava nada. Isso é proposital.

## Migrações

As tabelas nascem e mudam só por `src/lib/migrations.ts`:

- Cada migração tem versão (`007_historico_de_versoes`) e roda **uma vez**, registrada em `schema_migrations`.
- Rodam na primeira requisição de cada servidor, cada uma numa transação, com `pg_advisory_xact_lock` para dois servidores não aplicarem a mesma ao mesmo tempo. Se uma falhar, nada dela fica gravado e o erro aparece no log.
- **Nunca edite uma migração que já rodou.** Acrescente uma nova no fim da lista.
- Teste em `tests/lib/migrations.test.ts` (Postgres em memória).

| Versão | O que faz                                                                       |
| ------ | ------------------------------------------------------------------------------- |
| 001    | Estrutura que já existia (tudo `IF NOT EXISTS`)                                 |
| 002    | Travas: `status`, `temperature`, `temperature_manual`, `role`, e-mail minúsculo |
| 003    | Número da resposta único por formulário                                         |
| 004    | Colunas do lead e do diagnóstico em `responses`, com índices                    |
| 005    | Índice em `forms.created_by`                                                    |
| 006    | Preenche as colunas da 004 nas respostas antigas                                |
| 007    | Histórico de versões publicadas (`form_versions`)                               |

## Tabelas

### `users`

Time do painel. `role` é `admin` ou `member`. `email` sempre minúsculo. `session_version` sobe ao trocar a senha e derruba as sessões antigas.

### `forms`

Um formulário por linha. `draft` (rascunho) e `published` (o que o público vê) são JSON com `fields`, `theme` e `settings` (tipos em `lib/types.ts`). Opções e integrações valem na hora; perguntas só depois de "Publicar".

### `form_versions`

Cópia de cada publicação: `doc`, `title`, quem publicou (`published_by`), quando e uma nota (ex.: "restaurou a versão de 09/11/2026 10:00").

### `responses`

Uma linha por pessoa que começou o formulário.

| Coluna                                              | O que é                                                                                                                                |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `number`                                            | Nº sequencial por formulário ("179. Ana"); único por formulário                                                                        |
| `status`                                            | `partial` (abandonou) ou `complete`                                                                                                    |
| `answers`                                           | JSON `{ id_da_pergunta: resposta }`; múltipla escolha é `{ options: [ids], other? }`                                                   |
| `score`, `temperature`                              | Pontuação e temperatura automática (`frio`/`morno`/`quente`)                                                                           |
| `temperature_manual`                                | Temperatura escolhida pelo time; tem prioridade                                                                                        |
| `utm`                                               | UTMs, gclid, fbclid                                                                                                                    |
| `meta`                                              | `userAgent`, `referer`, `events` (lista de eventos com data), `correcao` (renda/horas corrigidas no diagnóstico), `telefone_corrigido` |
| `webhook_log`                                       | Cada envio ao webhook/planilha: data, destino, ok, HTTP, erro                                                                          |
| `lead_name`, `lead_email`, `lead_phone`             | Dados do lead já extraídos (telefone só dígitos; vale o corrigido)                                                                     |
| `diag_area`, `diag_bottleneck`, `diag_career_score` | Resultado do Diagnóstico Scala                                                                                                         |

As colunas `lead_*` e `diag_*` são calculadas por `lib/lead.ts` ao salvar e depois de correções. Para relatório direto no Supabase, use elas em vez do JSON.

```sql
-- leads completos da última semana com o diagnóstico
select number, lead_name, lead_email, lead_phone, diag_area, diag_career_score, coalesce(temperature_manual, temperature) as temperatura
from responses
where form_id = 'A6BNBSMsX6' and status = 'complete' and created_at > now() - interval '7 days'
order by number desc;
```

### `assets`

Imagens e PDFs enviados no editor, em base64. Servidos por `/a/[id]/[nome]` com CSP que impede script em SVG.

### `email_tokens`

Cadastros esperando confirmação por e-mail (guarda só o hash do token). Vencidos são apagados quando alguém se cadastra.

### `rate_limits`

Contadores do limite por IP. Janelas antigas (> 2 dias) são apagadas de vez em quando pelo próprio app.

## Backups

Antes das mudanças de novembro/2026 foi feita uma cópia em `backup_20261109` (users, forms, responses, assets). Pode ser apagada quando as mudanças estiverem estáveis:

```sql
drop schema backup_20261109 cascade;
```
