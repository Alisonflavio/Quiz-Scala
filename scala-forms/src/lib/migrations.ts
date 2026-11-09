/*
 * Migrações versionadas do banco.
 *
 * Cada migração roda uma única vez, em ordem, e fica registrada em `schema_migrations`.
 * Para mudar o banco: acrescente uma migração nova no fim da lista (nunca edite uma que já rodou).
 * Roda na primeira requisição de cada servidor (ver `db.ts`); um lock do Postgres impede que dois
 * servidores apliquem a mesma migração ao mesmo tempo.
 *
 * Documentação das tabelas: docs/banco.md
 */
import { LEAD_COLUMN_NAMES, leadColumns, leadValues } from "./lead";
import type { AnswerValue, FormDoc } from "./types";

export type Run = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

/** Acesso ao banco para as migrações: comandos soltos e uma transação de verdade (mesma conexão). */
export type MigrationDb = {
  run: Run;
  transaction: (fn: (tx: Run) => Promise<void>) => Promise<void>;
};

export type Migration = {
  /** Número sequencial com 3 dígitos + nome curto. Ex.: "002_colunas_do_lead" */
  version: string;
  /** SQL simples (vários comandos separados por ";") ou função para passos que precisam de código. */
  up: string | ((run: Run) => Promise<void>);
};

/** Chave do lock de migração (qualquer número fixo; só precisa ser sempre o mesmo). */
const LOCK_KEY = 726_100_001;

export const MIGRATIONS: Migration[] = [
  {
    // Estrutura que já existia antes das migrações versionadas. Tudo com IF NOT EXISTS: no banco de
    // produção não muda nada, só registra o ponto de partida.
    version: "001_estrutura_inicial",
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id            text PRIMARY KEY,
        name          text NOT NULL,
        email         text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        role          text NOT NULL DEFAULT 'member',
        created_at    timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;

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

      CREATE TABLE IF NOT EXISTS email_tokens (
        token_hash text PRIMARY KEY,
        email      text NOT NULL,
        name       text NOT NULL,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS email_tokens_email_idx ON email_tokens(email);

      CREATE TABLE IF NOT EXISTS rate_limits (
        key        text NOT NULL,
        bucket     bigint NOT NULL,
        count      integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (key, bucket)
      );

      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
      ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
      ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
      ALTER TABLE email_tokens ENABLE ROW LEVEL SECURITY;
      ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY
    `,
  },
  {
    // Travas de integridade: só valores que o app conhece entram no banco.
    version: "002_travas_de_valores",
    up: `
      ALTER TABLE responses ADD CONSTRAINT responses_status_chk CHECK (status IN ('partial', 'complete'));
      ALTER TABLE responses ADD CONSTRAINT responses_temperature_chk
        CHECK (temperature IS NULL OR temperature IN ('frio', 'morno', 'quente'));
      ALTER TABLE responses ADD CONSTRAINT responses_temperature_manual_chk
        CHECK (temperature_manual IS NULL OR temperature_manual IN ('frio', 'morno', 'quente'));
      ALTER TABLE users ADD CONSTRAINT users_role_chk CHECK (role IN ('admin', 'member'));
      ALTER TABLE users ADD CONSTRAINT users_email_lower_chk CHECK (email = lower(email))
    `,
  },
  {
    // O número da resposta ("nº 179") não pode repetir no mesmo formulário. O índice único substitui o
    // índice comum que já existia nas mesmas colunas.
    version: "003_numero_unico_por_formulario",
    up: `
      CREATE UNIQUE INDEX IF NOT EXISTS responses_form_number_uniq ON responses(form_id, number DESC);
      DROP INDEX IF EXISTS responses_form_idx
    `,
  },
  {
    // Dados do lead e do diagnóstico em colunas próprias: consulta direta no Supabase, busca e relatório
    // sem precisar decifrar o JSON das respostas. Preenchidas pelo app a cada envio (ver responses.ts).
    version: "004_colunas_do_lead_e_diagnostico",
    up: `
      ALTER TABLE responses ADD COLUMN IF NOT EXISTS lead_name text;
      ALTER TABLE responses ADD COLUMN IF NOT EXISTS lead_email text;
      ALTER TABLE responses ADD COLUMN IF NOT EXISTS lead_phone text;
      ALTER TABLE responses ADD COLUMN IF NOT EXISTS diag_area text;
      ALTER TABLE responses ADD COLUMN IF NOT EXISTS diag_bottleneck text;
      ALTER TABLE responses ADD COLUMN IF NOT EXISTS diag_career_score integer;
      CREATE INDEX IF NOT EXISTS responses_lead_email_idx ON responses(lower(lead_email));
      CREATE INDEX IF NOT EXISTS responses_lead_phone_idx ON responses(lead_phone);
      CREATE INDEX IF NOT EXISTS responses_form_status_created_idx ON responses(form_id, status, created_at DESC)
    `,
  },
  {
    // Índice que o Supabase apontou como faltando (chave estrangeira sem índice).
    version: "005_indice_forms_created_by",
    up: `CREATE INDEX IF NOT EXISTS forms_created_by_idx ON forms(created_by)`,
  },
  {
    // Preenche as colunas do lead e do diagnóstico nas respostas que já existiam.
    version: "006_preenche_colunas_do_lead",
    up: async (tx) => {
      const parse = <T>(v: unknown) => (typeof v === "string" ? JSON.parse(v) : v) as T;
      const sets = LEAD_COLUMN_NAMES.map((c, i) => c + " = $" + (i + 2)).join(", ");
      const forms = await tx("SELECT id, coalesce(published, draft) AS doc FROM forms");
      for (const f of forms) {
        const doc = parse<FormDoc>(f.doc);
        if (!doc?.fields) continue;
        const rows = await tx("SELECT id, answers, meta FROM responses WHERE form_id = $1", [f.id]);
        for (const r of rows) {
          const cols = leadColumns(doc, parse<Record<string, AnswerValue>>(r.answers), parse(r.meta));
          await tx("UPDATE responses SET " + sets + " WHERE id = $1", [r.id, ...leadValues(cols)]);
        }
      }
    },
  },
];

/** Divide um bloco SQL em comandos (as migrações não usam ";" dentro de textos). */
function statements(sql: string) {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Aplica as migrações pendentes, em ordem, cada uma numa transação.
 * @returns as versões aplicadas agora (vazio se o banco já estava em dia).
 */
export async function migrate(db: MigrationDb, migrations: Migration[] = MIGRATIONS): Promise<string[]> {
  const { run } = db;
  await run(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version    text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  await run("ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY");

  const applied: string[] = [];
  for (const m of migrations) {
    try {
      await db.transaction(async (tx) => {
        // lock da transação: outro servidor subindo ao mesmo tempo espera aqui e depois vê a migração já feita
        await tx("SELECT pg_advisory_xact_lock($1)", [LOCK_KEY]);
        const done = await tx("SELECT 1 FROM schema_migrations WHERE version = $1", [m.version]);
        if (done.length > 0) return;
        if (typeof m.up === "string") for (const stmt of statements(m.up)) await tx(stmt);
        else await m.up(tx);
        await tx("INSERT INTO schema_migrations (version) VALUES ($1)", [m.version]);
        applied.push(m.version);
      });
    } catch (err) {
      throw new Error(`Migração ${m.version} falhou: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return applied;
}
