import "server-only";

/*
 * Banco de dados.
 * - Com DATABASE_URL (Supabase ou qualquer Postgres): usa o driver `postgres`.
 * - Sem DATABASE_URL (desenvolvimento local): usa o PGlite, um Postgres embutido salvo em ./.data/pglite.
 * As duas opções falam o mesmo SQL, então nada muda no resto do app.
 * A estrutura das tabelas vem das migrações versionadas em `migrations.ts` (aplicadas na primeira requisição).
 */
import { migrate, type MigrationDb } from "./migrations";

type Row = Record<string, unknown>;
type Runner = (text: string, params?: unknown[]) => Promise<Row[]>;

const globalForDb = globalThis as unknown as { __runner?: Promise<Runner> };

async function createRunner(): Promise<Runner> {
  const url = process.env.DATABASE_URL;
  let run: Runner;
  let transaction: MigrationDb["transaction"];
  if (url) {
    const postgres = (await import("postgres")).default;
    // prepare:false é necessário no pooler do Supabase (modo transaction)
    const sql = postgres(url, { prepare: false, max: 5 });
    // o driver serializa parâmetro jsonb uma segunda vez e grava o JSON como texto; passando como text e convertendo no servidor fica igual ao PGlite
    const jsonbAsText = (t: string) => t.replace(/\$(\d+)::jsonb/g, (_, n) => `$${n}::text::jsonb`);
    run = async (text, params = []) => (await sql.unsafe(jsonbAsText(text), params as never[])) as unknown as Row[];
    // sql.begin prende uma conexão só para a transação inteira
    transaction = async (fn) => {
      await sql.begin(async (tx) => {
        await fn(async (text, params = []) => (await tx.unsafe(text, params as never[])) as unknown as Row[]);
      });
    };
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
    transaction = async (fn) => {
      await pg.transaction(async (tx) => {
        await fn(async (text, params = []) => (await tx.query<Row>(text, params)).rows);
      });
    };
  }
  const applied = await migrate({ run, transaction });
  if (applied.length) console.info("[db] migrações aplicadas:", applied.join(", "));

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
