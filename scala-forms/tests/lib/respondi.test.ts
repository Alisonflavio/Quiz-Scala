import { describe, expect, it } from "vitest";
import { respondiPayload } from "@/lib/respondi";
import { DEFAULT_SETTINGS, DEFAULT_THEME, type FormDoc } from "@/lib/types";

const doc: FormDoc = { fields: [], theme: DEFAULT_THEME, settings: DEFAULT_SETTINGS };
const row = { id: "r1", form_id: "f1", score: 0, utm: {}, completed_at: "2026-01-02T03:04:05Z" } as never;

describe("respondiPayload", () => {
  it("deve_prefixar_55_no_telefone_sem_duplicar", () => {
    const a = respondiPayload(doc, row, "T", { whatsapp: "(11) 91234-5678" });
    const b = respondiPayload(doc, row, "T", { whatsapp: "5511912345678" });
    expect(a.respondent.answers["Telefone com DDD"]).toBe("55 11912345678");
    expect(b.respondent.answers["Telefone com DDD"]).toBe("55 11912345678");
  });
  it("deve_classificar_faixa_de_meta", () => {
    const f = (m: number) => respondiPayload(doc, row, "T", { renda_meta: m }).respondent.answers;
    const q = "Quanto você gostaria de faturar mensalmente nos próximos 12 meses?";
    expect(f(5000)[q]).toBe("Até R$ 5.000");
    expect(f(10000)[q]).toBe("Entre R$ 5.000 e R$ 10.000");
    expect(f(25000)[q]).toBe("Acima de R$ 20.000");
  });
  it("deve_formatar_data_sem_T_e_sem_ms", () => {
    expect(respondiPayload(doc, row, "T", {}).respondent.date).toBe("2026-01-02 03:04:05");
  });
});
