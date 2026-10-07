import { describe, expect, it } from "vitest";
import { safeUrl } from "@/lib/safe-url";

describe("safeUrl", () => {
  it("deve_aceitar_https_http_mailto_tel_e_caminho_do_site", () => {
    expect(safeUrl("https://exemplo.com/a?b=1")).toBe("https://exemplo.com/a?b=1");
    expect(safeUrl("http://exemplo.com")).toBe("http://exemplo.com");
    expect(safeUrl("mailto:oi@exemplo.com")).toBe("mailto:oi@exemplo.com");
    expect(safeUrl("tel:+5541999999999")).toBe("tel:+5541999999999");
    expect(safeUrl("/obrigado")).toBe("/obrigado");
  });

  it("deve_recusar_javascript_data_e_disfarces", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("  JaVaScRiPt:alert(1)")).toBeNull();
    expect(safeUrl("java\tscript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeUrl("vbscript:x")).toBeNull();
  });

  it("deve_recusar_vazio_e_urls_que_pulam_para_outro_site", () => {
    expect(safeUrl("")).toBeNull();
    expect(safeUrl(undefined)).toBeNull();
    expect(safeUrl("//evil.com")).toBeNull();
    expect(safeUrl("/\\evil.com")).toBeNull();
    expect(safeUrl("texto sem esquema")).toBeNull();
  });
});
