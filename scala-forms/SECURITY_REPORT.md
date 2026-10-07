# Relatório de Segurança — Scala Forms — 2026-10-07

## 1. Resumo executivo

**Veredito (atualizado após as correções): ⚠️ Apto com ressalvas para uso interno.** Veredito original: ❌ Não apto. Os controles de base são bons (senhas com bcrypt, SQL parametrizado, sessão em cookie HttpOnly, RLS ligado, segredos fora do git). Os bloqueios são pontuais e corrigíveis em poucos dias: falta limite de tentativas/requisições, as URLs configuradas por usuários não são validadas, não há cabeçalhos de segurança e há credenciais expostas que precisam ser trocadas. Depois de corrigir os achados Altos e os Médios SEC-004 a SEC-006, o veredito passa a **⚠️ Apto com ressalvas**.

Contagem original: Crítica 0 | Alta 2 | Média 7 | Baixa 5 | Info 2. Situação atual: ver coluna Status de cada achado e a seção 4.

## 2. Escopo e metodologia

- **Stack:** Next.js 16 (App Router, Server Actions), React 19, Postgres (Supabase, conexão direta via `postgres`), PGlite em desenvolvimento, bcryptjs, jose (JWT), Resend (e-mail).
- **Analisado (estático e local):** todas as rotas em `src/app/api` e `src/app/a`, Server Actions (`auth-actions.ts`, `dash/actions.ts`), `src/lib` (auth, db, signup, mailer, responses), `proxy.ts`, `next.config.ts`, trackers e redirecionamentos do formulário público, histórico git (segredos), `npm audit`, alertas de segurança do Supabase.
- **NÃO coberto:** teste dinâmico/pentest, configuração da Vercel e do DNS, a página estática `index.html` da raiz, a lógica interna de `ScalaDiagnosis.tsx`, revisão jurídica de LGPD. Recomenda-se um pentest independente antes de operar com muitos leads reais.

## 3. Achados

### [SEC-001] Credenciais expostas em conversa — Alta

- **Local:** fora do repositório (histórico do chat de desenvolvimento).
- **Descrição:** a senha do banco Postgres e a chave `RESEND_API_KEY` (`re_4b****1bR`) foram coladas em texto no chat.
- **Impacto:** quem tiver acesso a esse histórico lê/escreve todo o banco (leads, hashes de senha) e envia e-mail em nome de `ptadigital.com.br`.
- **Correção:** rotacionar as duas credenciais (nova senha no Supabase, nova chave no Resend, apagar a antiga) e atualizar `.env.local` e a Vercel.
- **Status:** Risco aceito pelo dono (ferramenta interna; credenciais não serão rotacionadas por ora).

### [SEC-002] Sem limite de requisições (login, cadastro e endpoints públicos) — Alta (CWE-307, CWE-770)

- **Local:** `auth-actions.ts` (`loginAction`, `signupAction`), `api/f/[id]/route.ts`, `api/f/[id]/event/route.ts`.
- **Descrição:** nenhum rate limit ou bloqueio.
- **Impacto:**
  - Login: força bruta de senha (bcrypt custo 10, sem lockout).
  - Cadastro: o limite de 1 minuto é por e-mail. Um atacante que conheça nomes de funcionários envia pedidos para vários endereços, esgota os 100 e-mails/dia do plano grátis do Resend (cadastro fora do ar), gera bounces que prejudicam a reputação do domínio e pode virar bombardeio de e-mail.
  - Endpoints públicos: qualquer um cria respostas em massa (banco enche) e, por resposta concluída, dispara o webhook/planilha configurado (amplificação).
- **Correção:** limite por IP (e global) no login, cadastro e `/api/f/*`, com contador no banco (funciona na Vercel sem serviço extra) e/ou regras no Vercel Firewall; teto diário global de e-mails de cadastro.
- **Status:** Corrigido. Limite por IP e por e-mail no login (8 tentativas/15 min por e-mail), cadastro (5/h por IP e 40/dia no total) e endpoints públicos; contadores na tabela `rate_limits`. Testado: 429 na prática.

### [SEC-003] Autorização plana: toda conta vê e apaga tudo — Média (CWE-285, LGPD)

- **Local:** `dash/actions.ts`, `lib/forms.ts`, `api/forms/[id]/export`.
- **Descrição:** não há dono nem permissão por formulário. Qualquer conta logada (agora também qualquer pessoa com e-mail `@ptadigital.com.br` confirmado) lê todos os leads (nome, telefone, e-mail, respostas), exporta CSV, edita integrações e apaga formulários e respostas.
- **Impacto:** vazamento interno de dados pessoais e exclusão acidental ou maliciosa.
- **Correção:** novas contas entram sem acesso até o admin liberar; ou restringir exclusão/exportação/integrações ao admin; idealmente permissão por formulário.
- **Status:** Risco aceito pelo dono (só o time usa).

### [SEC-004] URLs configuráveis sem checar o esquema (XSS armazenado) — Média (CWE-79)

- **Local:** `components/runner/FormRunner.tsx` (`location.href = buttonUrl/redirectUrl`, `window.open(fileUrl)`).
- **Descrição:** `buttonUrl`, `redirectUrl` e `fileUrl` aceitam `javascript:`. O código é executado na página pública do formulário.
- **Impacto:** uma conta de membro, ou um admin comprometido, injeta script que roda no navegador de todos os leads.
- **Correção:** aceitar só `https:`/`http:` (e `tel:`/`mailto:` se necessário), no salvamento e na hora de usar.
- **Status:** Corrigido. `safeUrl` só libera http(s), mailto, tel e caminhos do site; `javascript:` e `data:` são recusados.

### [SEC-005] SSRF em integrações e no teste de webhook — Média (CWE-918)

- **Local:** `api/forms/[id]/test-integration/route.ts`, `lib/responses.ts` (`post`).
- **Descrição:** o servidor faz POST para qualquer URL `http(s)` informada, inclusive `localhost` e IPs internos, com `redirect: "follow"`, e a rota de teste devolve o status.
- **Impacto:** sondagem de rede interna/metadados do provedor a partir do servidor.
- **Correção:** só `https`, resolver o DNS e recusar IPs privados, loopback e link-local; não seguir redirecionamentos para destinos não validados.
- **Status:** Corrigido. Integrações só em https, DNS resolvido e IPs internos recusados, inclusive em cada redirecionamento. Limite conhecido: janela de DNS rebinding.

### [SEC-006] Sem cabeçalhos de segurança — Média (CWE-1021)

- **Local:** `next.config.ts` (nenhum `headers()`).
- **Descrição:** sem CSP, `frame-ancestors`/`X-Frame-Options`, `X-Content-Type-Options`, HSTS, `Referrer-Policy`, `Permissions-Policy`.
- **Impacto:** o painel e o login podem ser embutidos em outro site (clickjacking); sem defesa em profundidade contra XSS.
- **Correção:** cabeçalhos globais; `frame-ancestors 'none'` para `/dash`, `/login`, `/cadastro`, `/confirmar`; deixar a página pública do formulário embutível se for desejado; CSP gradual.
- **Status:** Corrigido. nosniff, HSTS, Referrer-Policy, Permissions-Policy em tudo; `frame-ancestors 'none'` e X-Frame-Options no painel e nas telas de acesso. CSP completa não aplicada (exigiria nonces para os scripts de pixel).

### [SEC-007] Eventos públicos sem limite de tamanho — Média (CWE-770)

- **Local:** `api/f/[id]/event/route.ts`.
- **Descrição:** cada chamada acrescenta ao array `meta.events` da resposta (sem teto) e dispara as integrações a cada evento (exceto vídeo).
- **Impacto:** linha do banco cresce sem limite; spam de webhook.
- **Correção:** teto de eventos por resposta, deduplicar eventos repetidos, aplicar o rate limit do SEC-002.
- **Status:** Corrigido. Máximo de 100 eventos por resposta e limite por IP.

### [SEC-008] Dependências com vulnerabilidades — Média

- **Evidência:** `npm audit`: 10 (6 altas, 4 moderadas); em produção só `source-map-js` (DoS, corrigível com `npm audit fix` sem breaking). As demais vêm de `drizzle-kit`/`esbuild` (dev), e `drizzle-orm`/`drizzle-kit` **não são usados** no código.
- **Correção:** `npm audit fix`; remover `drizzle-orm` e `drizzle-kit`.
- **Status:** Corrigido. `drizzle-orm`/`drizzle-kit` removidos (não eram usados); `npm audit` em produção: 0. Resta 1 alerta só de ferramenta de lint (`braces` via eslint-config-next), sem impacto em produção.

### [SEC-009] Enumeração de usuários por tempo de resposta — Baixa (CWE-204)

- **Local:** `lib/auth.ts` (`verifyLogin`): o bcrypt só roda se o usuário existe.
- **Correção:** comparar com um hash fictício quando o usuário não existe.

- **Status:** Corrigido. Login compara com hash fictício quando o e-mail não existe.

### [SEC-010] Sessões sem revogação — Baixa

- **Descrição:** JWT de 30 dias; trocar a senha não derruba outras sessões (apagar o usuário derruba, pois `getUser` consulta o banco).
- **Correção:** guardar versão de sessão no usuário e invalidar na troca de senha.

- **Status:** Corrigido. Trocar a senha incrementa `session_version` e derruba sessões em outros aparelhos.

### [SEC-011] Upload: tipo confiado ao cliente — Baixa

- **Local:** `api/upload/route.ts`, `a/[id]/[name]/route.ts`.
- **Descrição:** valida só `file.type` enviado pelo cliente; SVG/PDF não são inspecionados (mitigado pelo CSP `sandbox` ao servir); arquivos em base64 no Postgres (+33%); falta `X-Content-Type-Options: nosniff`.
- **Correção:** conferir assinatura (magic bytes), adicionar `nosniff`; avaliar Supabase Storage.

- **Status:** Corrigido. Tipo detectado pelos primeiros bytes (não confia no navegador) e `nosniff` ao servir. Arquivos continuam no Postgres.

### [SEC-012] Respostas sem validação de campos obrigatórios no servidor — Baixa

- **Descrição:** `complete: true` é aceito sem checar obrigatórios; geram-se leads vazios/lixo.
- **Correção:** validar com as mesmas regras de `engine.ts` antes de marcar como completa.

- **Status:** Risco aceito. Validar obrigatórios no servidor poderia rejeitar respostas legítimas com lógica de pulo de perguntas e perder leads; o custo de leads vazios é menor.

### [SEC-013] `/setup` aberto em ambiente sem usuários — Baixa

- **Descrição:** num banco novo, quem acessar primeiro cria o administrador.
- **Correção:** exigir um código de instalação (variável de ambiente) ou criar o admin por script.

- **Status:** Risco aceito. Só afeta ambientes novos sem usuários; o banco atual já tem administrador.

### [SEC-014] RLS ativado nas tabelas — Info (corrigido)

- As 5 tabelas (`users`, `forms`, `responses`, `assets`, `email_tokens`) têm RLS ligado. O alerta restante "RLS sem policies" é esperado: o app usa conexão direta como `postgres`, que ignora RLS, e as chaves `anon`/`authenticated` ficam sem acesso. Não criar policies a menos que o app passe a usar a API do Supabase no navegador.

### [SEC-015] Operação e resiliência — Média

- **Descrição:** sem monitoramento, alertas ou plano de resposta a incidentes. No plano Free do Supabase, confirmar no painel: pausa por inatividade (site cairia) e ausência de backups gerenciados.
- **Correção:** plano pago ou rotina de backup (`pg_dump` agendado), alerta de erros (ex.: Vercel/Sentry), checagem de saúde.

### [SEC-016] Dados pessoais (LGPD) — Info

- O sistema guarda nome, telefone, e-mail e respostas de leads. Definir base legal/consentimento nos formulários, política de privacidade, prazo de retenção e rotina de exclusão a pedido do titular.

## 4. Resumo das correções

- Novos arquivos: `lib/rate-limit.ts`, `lib/safe-url.ts`, `lib/safe-fetch.ts`, `lib/ip.ts`, `lib/file-sniff.ts`.
- Novas tabelas/colunas criadas automaticamente: `rate_limits` (com RLS) e `users.session_version`.
- Testes novos: 21 (URLs seguras, IPs internos, SSRF, tipo de arquivo, limite de requisições). Total: 44.

## 4.1 Controles que já estavam corretos

- Senhas com bcrypt; sessão em cookie `HttpOnly`, `SameSite=lax`, `Secure` em produção; `AUTH_SECRET` obrigatório em produção.
- Todas as consultas SQL são parametrizadas (únicas interpolações são constantes numéricas no código).
- Pontuação e temperatura calculadas no servidor, não no cliente.
- Cadastro com confirmação por e-mail: token aleatório de 256 bits, guardado só como hash, uso único e atômico, expira em 1 hora; resposta igual para e-mail já cadastrado.
- Redirecionamento pós-login só para caminhos `/dash` (sem open redirect).
- SVG enviado por usuário é servido com CSP `sandbox`.
- IDs de pixels (Meta, GTM, GA, TikTok) são sanitizados antes de entrar em script.
- Nenhum segredo no repositório nem no histórico git; `.env*` ignorado.

## 5. Pendências que exigem ação do usuário

1. (Opcional, risco aceito) Rotacionar a senha do banco e a chave do Resend (SEC-001).
2. (Opcional, risco aceito) Política de acesso de novas contas (SEC-003).
3. Configurar variáveis na Vercel: `DATABASE_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`.
4. Conferir plano, pausa e backups do Supabase (SEC-015).

## 6. Checklist de go-live

- [ ] SEC-001 a SEC-002 resolvidos; SEC-004 a SEC-006 resolvidos
- [ ] Credenciais rotacionadas
- [ ] Cabeçalhos de segurança ativos
- [ ] Rate limit em login, cadastro e endpoints públicos
- [ ] Política de acesso de novas contas definida
- [ ] Dependências sem CVE alto em produção
- [ ] Backups e alertas configurados
- [ ] Testes passando; teste manual do fluxo completo em staging

## 7. Recomendações contínuas

- `npm audit` no CI e atualização periódica de dependências.
- Testes de regressão para autorização e para os limites de requisição.
- Pentest independente antes de escalar o volume de leads.
