import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, DEFAULT_THEME } from "@/lib/types";

const save = vi.fn(async () => ({ id: "r1", score: 0, temperature: null }));
vi.mock("@/lib/forms", () => ({
  getForm: async () => ({
    title: "F",
    published: {
      fields: [{ id: "q", type: "short_text", title: "q", required: false, key: "q" }],
      theme: DEFAULT_THEME,
      settings: DEFAULT_SETTINGS,
    },
  }),
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true, clientIp: () => "1.1.1.1" }));
vi.mock("@/lib/responses", () => ({
  isDuplicate: async () => false,
  saveResponse: save,
  getResponse: async () => null,
  dispatchIntegrations: async () => {},
}));
vi.mock("@/lib/db", () => ({ json: JSON.stringify, query: async () => [] }));

const call = async (raw: string) => {
  const { POST } = await import("@/app/api/f/[id]/route");
  const req = new Request("http://x/api/f/f1", { method: "POST", body: raw });
  return POST(req, { params: Promise.resolve({ id: "f1" }) } as never);
};

beforeEach(() => save.mockClear());

describe("POST /api/f/[id]", () => {
  it("deve_responder_400_para_json_invalido", async () => {
    expect((await call("{oops")).status).toBe(400);
  });
  it("deve_responder_400_para_corpo_null_ou_nao_objeto", async () => {
    expect((await call("null")).status).toBe(400);
    expect((await call("42")).status).toBe(400);
  });
  it("deve_ignorar_campos_inexistentes_e_truncar_texto", async () => {
    const res = await call(JSON.stringify({ answers: { q: "x".repeat(6000), fake: "y" } }));
    expect(res.status).toBe(200);
    const sent = (save.mock.calls[0] as unknown[])[3] as { answers: Record<string, string> };
    expect(Object.keys(sent.answers)).toEqual(["q"]);
    expect(sent.answers.q).toHaveLength(5000);
  });
  it("nao_deve_quebrar_com_other_nao_string", async () => {
    const res = await call(JSON.stringify({ answers: { q: { options: ["a"], other: 123 } } }));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/f/[id]/event", () => {
  it("deve_responder_400_para_corpo_null", async () => {
    const { POST } = await import("@/app/api/f/[id]/event/route");
    const req = new Request("http://x", { method: "POST", body: "null" });
    const res = await POST(req, { params: Promise.resolve({ id: "f1" }) } as never);
    expect(res.status).toBe(400);
  });
});
