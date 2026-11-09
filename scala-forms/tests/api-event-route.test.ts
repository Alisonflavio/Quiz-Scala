import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, DEFAULT_THEME } from "@/lib/types";

const query = vi.fn<(sql: string, params?: unknown[]) => Promise<unknown[]>>(async () => []);
const dispatch = vi.fn(async () => {});
const resposta = { id: "r1", form_id: "f1", meta: {}, answers: {}, utm: {} };

vi.mock("@/lib/forms", () => ({
  getForm: async () => ({
    title: "F",
    published: { fields: [], theme: DEFAULT_THEME, settings: DEFAULT_SETTINGS },
  }),
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true, clientIp: () => "1.1.1.1" }));
vi.mock("@/lib/responses", () => ({
  getResponse: async () => resposta,
  dispatchIntegrations: dispatch,
  refreshLeadColumns: async () => {},
}));
vi.mock("@/lib/db", () => ({ json: JSON.stringify, query }));
// fora de uma requisição real o `after` do Next não existe: aqui ele roda a tarefa na hora
vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: (fn: () => unknown) => void fn(),
}));

const send = async (body: unknown) => {
  const { POST } = await import("@/app/api/f/[id]/event/route");
  const req = new Request("http://x", { method: "POST", body: JSON.stringify(body) });
  return POST(req, { params: Promise.resolve({ id: "f1" }) } as never);
};

beforeEach(() => {
  query.mockClear();
  dispatch.mockClear();
});

describe("POST /api/f/[id]/event — página de obrigado", () => {
  it("deve_gravar_telefone_corrigido_so_com_digitos", async () => {
    const res = await send({ responseId: "r1", event: "telefone_corrigido", vars: { telefone: "(41) 98888-7777" } });
    expect(res.status).toBe(200);
    const patch = JSON.parse(String(query.mock.calls[0]?.[1]?.[2]));
    expect(patch.telefone_corrigido).toBe("41988887777");
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("deve_recusar_telefone_corrigido_invalido", async () => {
    const res = await send({ responseId: "r1", event: "telefone_corrigido", vars: { telefone: "123" } });
    expect(res.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it("deve_guardar_progresso_da_aula_sem_disparar_integracoes", async () => {
    const res = await send({ responseId: "r1", event: "aula_50" });
    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("deve_recusar_evento_desconhecido", async () => {
    expect((await send({ responseId: "r1", event: "qualquer" })).status).toBe(400);
  });
});
