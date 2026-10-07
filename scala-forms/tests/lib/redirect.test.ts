import { describe, expect, it } from "vitest";
import { sanitizeNext } from "@/lib/redirect";

describe("sanitizeNext", () => {
  it("deve_aceitar_caminhos_do_painel_com_query", () => {
    expect(sanitizeNext("/dash/forms/abc/editor")).toBe("/dash/forms/abc/editor");
    expect(sanitizeNext("/dash?q=quiz")).toBe("/dash?q=quiz");
  });

  it("deve_cair_em_dash_quando_vazio_ou_ausente", () => {
    expect(sanitizeNext(undefined)).toBe("/dash");
    expect(sanitizeNext(null)).toBe("/dash");
    expect(sanitizeNext("")).toBe("/dash");
  });

  it("deve_recusar_redirecionamento_aberto", () => {
    expect(sanitizeNext("https://evil.com")).toBe("/dash");
    expect(sanitizeNext("//evil.com")).toBe("/dash");
    expect(sanitizeNext("/\\evil.com")).toBe("/dash");
    expect(sanitizeNext("/dash\\..\\evil")).toBe("/dash");
  });

  it("deve_recusar_rotas_fora_do_painel_e_quebras_de_linha", () => {
    expect(sanitizeNext("/login")).toBe("/dash");
    expect(sanitizeNext("/dash\r\nSet-Cookie: x=1")).toBe("/dash");
  });
});
