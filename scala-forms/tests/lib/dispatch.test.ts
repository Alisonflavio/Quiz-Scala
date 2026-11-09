import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, DEFAULT_THEME, type FormDoc, type ResponseRow } from "@/lib/types";

const safePostJson = vi.fn();
const query = vi.fn<(sql: string, params?: unknown[]) => Promise<unknown[]>>(async () => []);
vi.mock("@/lib/safe-fetch", () => ({ safePostJson }));
vi.mock("@/lib/db", () => ({ json: JSON.stringify, query, queryOne: async () => null }));

const doc: FormDoc = {
  fields: [],
  theme: DEFAULT_THEME,
  settings: { ...DEFAULT_SETTINGS, webhook: { enabled: true, url: "https://hook.example.com/x" } },
};
const row = {
  id: "r1",
  form_id: "f1",
  number: 1,
  status: "complete",
  answers: {},
  score: 0,
  temperature: null,
  temperature_manual: null,
  utm: {},
  meta: {},
  webhook_log: [],
  created_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
} as unknown as ResponseRow;

const status = (s: number) => ({ ok: s >= 200 && s < 300, status: s });

beforeEach(() => {
  safePostJson.mockReset();
  query.mockClear();
  vi.useFakeTimers();
});

async function run() {
  const { dispatchIntegrations } = await import("@/lib/responses");
  const p = dispatchIntegrations(doc, row, "F", "completa");
  await vi.runAllTimersAsync();
  await p;
  return JSON.parse(String(query.mock.calls.at(-1)?.[1]?.[1] ?? "[]"));
}

describe("dispatchIntegrations — novas tentativas", () => {
  it("deve_tentar_de_novo_em_erro_5xx_e_registrar_o_sucesso", async () => {
    safePostJson.mockResolvedValueOnce(status(500)).mockResolvedValueOnce(status(502)).mockResolvedValueOnce(status(200));
    const log = await run();
    expect(safePostJson).toHaveBeenCalledTimes(3);
    expect(log[0]).toMatchObject({ target: "webhook", ok: true, status: 200 });
  });

  it("nao_deve_repetir_quando_o_destino_recusa_com_4xx", async () => {
    safePostJson.mockResolvedValue(status(400));
    const log = await run();
    expect(safePostJson).toHaveBeenCalledTimes(1);
    expect(log[0]).toMatchObject({ ok: false, status: 400 });
  });

  it("deve_registrar_falha_apos_3_erros_de_rede", async () => {
    safePostJson.mockRejectedValue(new Error("rede caiu"));
    const log = await run();
    expect(safePostJson).toHaveBeenCalledTimes(3);
    expect(log[0]).toMatchObject({ ok: false, error: "rede caiu" });
  });
});
