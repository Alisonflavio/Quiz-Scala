# Deploy

## Onde está

- **Vercel**, time _Personal Trainer Academy_ (plano Pro), projeto **`scala-forms`**.
- Root Directory: `scala-forms`. Região: `iad1`.
- URL em uso: `https://scala-forms-seven.vercel.app` (o formulário fica em `/f/A6BNBSMsX6`).
- Domínio próprio previsto no código: `scala.personaltraineracademy.com.br` (a raiz abre direto o diagnóstico, ver `next.config.ts`). **Ainda sem DNS.**

## Variáveis de ambiente (Production)

| Variável                       | Para quê                                                           |
| ------------------------------ | ------------------------------------------------------------------ |
| `DATABASE_URL`                 | Supabase, Transaction pooler (porta 6543)                          |
| `AUTH_SECRET`                  | Assina o cookie de sessão. Sem ela o app não sobe em produção      |
| `APP_URL`                      | Endereço usado nos links de e-mail                                 |
| `RESEND_API_KEY`, `EMAIL_FROM` | E-mail de confirmação do cadastro                                  |
| `SIGNUP_DOMAIN`                | Domínio que pode se cadastrar sozinho (padrão `ptadigital.com.br`) |

Modelo em `.env.example`. Nunca commite `.env*`.

## Publicar

Hoje o deploy é feito pelo terminal:

```bash
cd scala-forms
npm test && npm run typecheck && npm run lint && npm run build
vercel deploy --prod
```

As migrações pendentes rodam sozinhas na primeira requisição depois do deploy. Confira no log da Vercel a linha `[db] migrações aplicadas: …`.

**Recomendado:** ligar o projeto ao GitHub na Vercel (Settings → Git) para preview automático por branch e produção na `main`. Para o preview não gravar no banco de produção, configure um `DATABASE_URL` de teste em _Preview_.

## Domínio próprio

1. Vercel → projeto `scala-forms` → Settings → Domains → adicionar `scala.personaltraineracademy.com.br`.
2. No DNS de `personaltraineracademy.com.br`, criar o registro que a Vercel indicar (normalmente `CNAME scala → cname.vercel-dns.com`).
3. Atualizar `APP_URL` e os links das campanhas.

## Endereço antigo

`diagnostico-scala.vercel.app` responde **HTTP 500** e não pertence ao time. Se algum anúncio ainda aponta para ele, troque pelo endereço atual.
