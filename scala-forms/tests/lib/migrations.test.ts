import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { MIGRATIONS, migrate, type MigrationDb } from "@/lib/migrations";

/** Banco Postgres em memória, novo para cada teste. */
function memoryDb(): MigrationDb & { pg: PGlite } {
  const pg = new PGlite();
  return {
    pg,
    run: async (text, params = []) => (await pg.query<Record<string, unknown>>(text, params)).rows,
    transaction: async (fn) => {
      await pg.transaction(async (tx) => {
        await fn(async (text, params = []) => (await tx.query<Record<string, unknown>>(text, params)).rows);
      });
    },
  };
}

let db: ReturnType<typeof memoryDb>;
beforeEach(async () => {
  db = memoryDb();
  await migrate(db);
  await db.run("INSERT INTO forms (id, title, draft) VALUES ('f1', 'F', '{}')");
});

describe("migrações", () => {
  it("deve_registrar_todas_e_nao_reaplicar_na_segunda_vez", async () => {
    const rows = await db.run("SELECT version FROM schema_migrations ORDER BY version");
    expect(rows.map((r) => r.version)).toEqual(MIGRATIONS.map((m) => m.version));
    expect(await migrate(db)).toEqual([]);
  });

  it("deve_desfazer_a_migracao_inteira_quando_um_comando_falha", async () => {
    const ruim = [{ version: "999_teste", up: "CREATE TABLE tmp_ok (id int); SELECT * FROM tabela_que_nao_existe" }];
    await expect(migrate(db, ruim)).rejects.toThrow("999_teste");
    expect(await db.run("SELECT to_regclass('tmp_ok') AS t")).toEqual([{ t: null }]);
    expect(await db.run("SELECT 1 FROM schema_migrations WHERE version = '999_teste'")).toEqual([]);
  });

  it("deve_recusar_status_e_temperatura_desconhecidos", async () => {
    const ins = (status: string, temp: string | null) =>
      db.run("INSERT INTO responses (id, form_id, number, status, temperature) VALUES ($1, 'f1', $2, $3, $4)", [
        `r${Math.random()}`,
        Math.floor(Math.random() * 1e6),
        status,
        temp,
      ]);
    await expect(ins("complete", "quente")).resolves.toBeDefined();
    await expect(ins("finalizado", null)).rejects.toThrow();
    await expect(ins("partial", "morna")).rejects.toThrow();
  });

  it("deve_impedir_numero_repetido_no_mesmo_formulario", async () => {
    await db.run("INSERT INTO responses (id, form_id, number) VALUES ('a', 'f1', 1)");
    await expect(db.run("INSERT INTO responses (id, form_id, number) VALUES ('b', 'f1', 1)")).rejects.toThrow();
  });

  it("deve_recusar_papel_invalido_e_email_com_maiuscula", async () => {
    const user = (email: string, role: string) =>
      db.run("INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, 'N', $2, 'h', $3)", [
        email,
        email,
        role,
      ]);
    await expect(user("a@b.com", "admin")).resolves.toBeDefined();
    await expect(user("c@d.com", "dono")).rejects.toThrow();
    await expect(user("E@F.com", "member")).rejects.toThrow();
  });
});
