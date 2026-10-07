import { beforeAll, describe, expect, it } from "vitest";

// VERCEL=1 faz o banco embutido gravar em /tmp (não toca em ./.data nem no Supabase)
process.env.VERCEL = "1";
delete process.env.DATABASE_URL;

let rateLimit: typeof import("@/lib/rate-limit").rateLimit;
beforeAll(async () => {
  ({ rateLimit } = await import("@/lib/rate-limit"));
});

describe("rateLimit", () => {
  const limit = { max: 3, windowSeconds: 60 };

  it("deve_liberar_ate_o_maximo_e_bloquear_depois", async () => {
    const id = `ip-${Date.now()}-a`;
    expect(await rateLimit("teste", id, limit)).toBe(true);
    expect(await rateLimit("teste", id, limit)).toBe(true);
    expect(await rateLimit("teste", id, limit)).toBe(true);
    expect(await rateLimit("teste", id, limit)).toBe(false);
  });

  it("deve_contar_cada_chave_separadamente", async () => {
    const a = `ip-${Date.now()}-b`;
    const b = `ip-${Date.now()}-c`;
    for (let i = 0; i < 4; i++) await rateLimit("teste", a, limit);
    expect(await rateLimit("teste", b, limit)).toBe(true);
  });
});
