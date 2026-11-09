import { describe, expect, it } from "vitest";
import { missingRequiredKeys, requiredKeys } from "@/lib/required-keys";
import { scalaTemplate } from "@/lib/templates";
import { DEFAULT_SETTINGS } from "@/lib/types";

describe("variáveis obrigatórias", () => {
  it("deve_aceitar_o_modelo_do_diagnostico_scala_completo", () => {
    expect(missingRequiredKeys(scalaTemplate())).toEqual([]);
  });

  it("deve_acusar_variavel_renomeada_no_diagnostico", () => {
    const doc = scalaTemplate();
    doc.fields = doc.fields.map((f) => (f.key === "email" ? { ...f, key: "e_mail" } : f));
    expect(missingRequiredKeys(doc)).toEqual(["email"]);
  });

  it("deve_exigir_nome_email_whatsapp_no_webhook_formato_respondi", () => {
    const doc = {
      fields: [],
      theme: scalaTemplate().theme,
      settings: { ...DEFAULT_SETTINGS, webhook: { enabled: true, url: "x", format: "respondi" as const } },
    };
    expect(requiredKeys(doc).sort()).toEqual(["email", "nome", "whatsapp"]);
  });

  it("nao_deve_exigir_nada_em_formulario_comum", () => {
    expect(requiredKeys({ fields: [], theme: scalaTemplate().theme, settings: DEFAULT_SETTINGS })).toEqual([]);
  });
});
