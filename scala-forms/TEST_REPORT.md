# Relatório de Testes — scala-forms — 2026-10-07

## 1. Resumo
Veredito: ⚠️ Estável com ressalvas (E2E/UI não executado)
Testes: antes 44 (8 arquivos) → depois 64 (12 arquivos), todos passando; 20 novos.
Typecheck, lint, prettier e `next build` limpos. Cobertura (%) não medida: sem provider de cobertura instalado.
Bugs: Crítico 0 | Alto 0 | Médio 4 | Baixo 1 (todos corrigidos)

## 2. Ambiente e metodologia
Next 16 / React 19 / Vitest 4. Comandos: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `prettier --check`.
Cobertos: lógica pura (engine, scala, theme, respondi), rotas públicas `POST /api/f/[id]` e `/event` (com mocks de banco/rate-limit).
NÃO cobertos: E2E/UI no navegador, responsividade, acessibilidade, performance, migrações, integrações reais (webhook/Resend/Supabase), upload, auth, concorrência real no banco.
Motivo: `.env.local` aponta para um `DATABASE_URL` real; subir o app contra ele para testes de escrita seria arriscado. Para E2E, rodar com banco embutido (sem `DATABASE_URL`) ou um banco de teste.

## 3. Bugs
### [BUG-001] Corpo `null` derruba `POST /api/f/[id]` e `/event` com 500 — Média
- Local: `src/app/api/f/[id]/route.ts`, `src/app/api/f/[id]/event/route.ts`
- Repro: enviar body `null` (ou `42`). Esperado 400; obtido TypeError (500).
- Causa: `req.json()` válido mas não-objeto não era checado.
- Correção: valida que o corpo é objeto; senão 400.
- Teste: `tests/api-form-route.test.ts`
- Status: Corrigido

### [BUG-002] `other` não-string derruba o envio — Média
- Local: `src/app/api/f/[id]/route.ts` (`v.other?.slice`)
- Repro: `answers.q = {options:["a"], other:123}` → TypeError 500.
- Correção: só aceita `other` string.
- Status: Corrigido

### [BUG-003] Pontuação ignora vírgula decimal e conta resposta em branco como 0 — Média
- Local: `src/lib/engine.ts` `computeScore`
- `validateAnswer` aceita "18,5", mas o score usava `Number("18,5")` = NaN (sem pontos). `"   "` virava 0 e pontuava faixa que inclui 0.
- Correção: normaliza vírgula e ignora texto vazio.
- Teste: `tests/lib/engine.test.ts › computeScore com número digitado`
- Status: Corrigido

### [BUG-004] Diagnóstico Scala aceita negativos/infinito — Média
- Local: `src/lib/scala.ts` `computeScala`
- renda 5000 + aumento -5000 → meta 0 → `pctMeta` NaN/Infinity; renda "1e999" → Infinity.
- Correção: exige valores finitos e > 0, senão retorna `null` (como já fazia para vazio).
- Teste: `tests/lib/scala.test.ts`
- Status: Corrigido. Nota: se o produto quiser permitir aumento negativo, é decisão de negócio.

## 4. Riscos potenciais (sem falha reproduzida)
- `flatten()`: chave de campo igual a `status`, `numero`, `pontuacao` etc. sobrescreve colunas fixas do webhook.
- `POST /api/upload`: `formData()` com corpo não-multipart lança 500 (sem try/catch).
- `theme.alpha/onColor`: hex inválido gera `NaN` no CSS.
- Evento `corrigiu` guarda `vars.*` sem checar tipo/tamanho.
- `saveResponse`: qualquer `responseId` conhecido de resposta completa pode ser sobrescrito (ids de 16 chars, risco baixo).

## 5. Lacunas de cobertura
`responses.ts`, `forms.ts`, `signup.ts`, `auth.ts`, `db.ts`, `templates.ts`, rotas do dashboard, componentes React, E2E.

## 6. Recomendações
Instalar `@vitest/coverage-v8`; criar testes de integração com pglite (já é dependência); E2E Playwright (já instalado) contra banco embutido; pipeline CI com lint + typecheck + test + build.

## 7. Responsividade (Playwright, banco embutido local)
Viewports: 320, 375, 414, 768, 1024, 1440. Páginas: login, cadastro, formulário público (percorrido até o diagnóstico), dashboard, equipe, conta, editor, opções, compartilhar, integrações, respostas (lista e tabela), menus e modais.
Antes: 19 combinações página×largura com overflow horizontal (cabeçalho do formulário, editor de 3 colunas, compartilhar com aside fixo de 480px, respostas com `h-[calc(100vh-5rem)]`, títulos `text-6xl`, campos de cor, modais com grid `auto`).
Correções: `FormHeader` (abas rolam na horizontal, ações quebram de linha abaixo de `lg`), `TopBar`, empilhamento de colunas abaixo de `lg` no editor/compartilhar/respostas, títulos responsivos, `Line`/`Color` com `min-w-0`/`shrink-0`, popover de filtros, `Modal` com `grid-cols-[minmax(0,1fr)]`.
Depois: 0 overflow em todas as combinações testadas. Não testado: Firefox/WebKit, aparelhos reais, orientação paisagem em celular.
