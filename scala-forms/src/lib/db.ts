import "server-only";

/*
 * Banco de dados.
 * - Com DATABASE_URL (Supabase ou qualquer Postgres): usa o driver `postgres`.
 * - Sem DATABASE_URL (desenvolvimento local): usa o PGlite, um Postgres embutido salvo em ./.data/pglite.
 * As duas opções falam o mesmo SQL, então nada muda no resto do app.
 */

type Row = Record<string, unknown>;
type Runner = (text: string, params?: unknown[]) => Promise<Row[]>;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'member',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forms (
  id           text PRIMARY KEY,
  title        text NOT NULL,
  draft        jsonb NOT NULL,
  published    jsonb,
  published_at timestamptz,
  created_by   text REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS responses (
  id                 text PRIMARY KEY,
  form_id            text NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  number             integer NOT NULL,
  status             text NOT NULL DEFAULT 'partial',
  answers            jsonb NOT NULL DEFAULT '{}'::jsonb,
  score              integer NOT NULL DEFAULT 0,
  temperature        text,
  temperature_manual text,
  ending_id          text,
  utm                jsonb NOT NULL DEFAULT '{}'::jsonb,
  meta               jsonb NOT NULL DEFAULT '{}'::jsonb,
  webhook_log        jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz
);
CREATE INDEX IF NOT EXISTS responses_form_idx ON responses(form_id, number DESC);

CREATE TABLE IF NOT EXISTS assets (
  id         text PRIMARY KEY,
  mime       text NOT NULL,
  data       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Cadastros aguardando confirmação por e-mail. A conta só é criada quando a pessoa clica no link:
-- guarda-se o hash do token (nunca o token) e o pedido some depois de usado ou vencido.
CREATE TABLE IF NOT EXISTS email_tokens (
  token_hash text PRIMARY KEY,
  email      text NOT NULL,
  name       text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_tokens_email_idx ON email_tokens(email);
ALTER TABLE email_tokens ENABLE ROW LEVEL SECURITY;

-- Contadores do limite de requisições (ver rate-limit.ts)
CREATE TABLE IF NOT EXISTS rate_limits (
  key        text NOT NULL,
  bucket     bigint NOT NULL,
  count      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key, bucket)
);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Versão da sessão: trocar a senha incrementa e derruba as sessões antigas
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
`;

const globalForDb = globalThis as unknown as { __runner?: Promise<Runner> };

async function createRunner(): Promise<Runner> {
  const url = process.env.DATABASE_URL;
  let run: Runner;
  if (url) {
    const postgres = (await import("postgres")).default;
    // prepare:false é necessário no pooler do Supabase (modo transaction)
    const sql = postgres(url, { prepare: false, max: 5 });
    // o driver serializa parâmetro jsonb uma segunda vez e grava o JSON como texto; passando como text e convertendo no servidor fica igual ao PGlite
    const jsonbAsText = (t: string) => t.replace(/\$(\d+)::jsonb/g, (_, n) => `$${n}::text::jsonb`);
    run = async (text, params = []) => (await sql.unsafe(jsonbAsText(text), params as never[])) as unknown as Row[];
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { mkdirSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    // Fora do computador local (ex.: Vercel sem DATABASE_URL ainda) o disco do projeto é só
    // leitura — só /tmp aceita escrita. Serve pra testar a aparência e o fluxo (cada "cold start"
    // da função recomeça com o banco vazio, então nada fica salvo de verdade: é só visual,
    // até o Supabase entrar).
    const base = process.env.VERCEL ? tmpdir() : "./.data";
    mkdirSync(base, { recursive: true });
    const pg = new PGlite(`${base}/pglite`);
    run = async (text, params = []) => (await pg.query<Row>(text, params)).rows;
  }
  for (const stmt of SCHEMA.split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    await run(stmt);
  }

  // Modo temporário (sem DATABASE_URL, rodando fora do localhost): o banco nasce vazio a cada
  // "cold start", então recria o formulário de teste na hora, com o mesmo endereço de sempre
  // (A6BNBSMsX6) — só pra dar pra abrir e ver a aparência/fluxo no celular, sem precisar logar
  // nem configurar nada. Isso não é persistência de verdade; é só pra essa prévia visual.
  if (!url && process.env.VERCEL) {
    const already = await run("SELECT 1 FROM forms LIMIT 1");
    if (already.length === 0) {
      const { scalaTemplate } = await import("./templates");
      const doc = scalaTemplate();
      doc.fields = doc.fields.map((f) =>
        f.type === "thankyou"
          ? {
              ...f,
              scala: {
                ...f.scala!,
                whatsapp: "41995150509",
                whatsappMessage:
                  "Olá, tudo bem? Fui selecionado para falar com um especialista e gostaria de entender quais são os próximos passos.",
              },
            }
          : f,
      );
      await run(
        "INSERT INTO forms (id, title, draft, published, published_at) VALUES ($1,$2,$3::jsonb,$3::jsonb,now()) ON CONFLICT (id) DO NOTHING",
        ["A6BNBSMsX6", "Diagnóstico Scala Fitness", JSON.stringify(doc)],
      );
    }
  }

  return run;
}

function runner() {
  if (!globalForDb.__runner) {
    globalForDb.__runner = createRunner().catch((e) => {
      globalForDb.__runner = undefined; // tenta de novo na próxima requisição
      throw e;
    });
  }
  return globalForDb.__runner;
}

/** Executa SQL parametrizado (`$1`, `$2`...) e devolve todas as linhas. */
export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  const run = await runner();
  return (await run(text, params)) as T[];
}

/** Como `query`, mas devolve só a primeira linha (ou `null` se não houver). */
export async function queryOne<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Converte um objeto para ser gravado numa coluna jsonb (use com `$n::jsonb`). */
export const json = (v: unknown) => JSON.stringify(v ?? null);
