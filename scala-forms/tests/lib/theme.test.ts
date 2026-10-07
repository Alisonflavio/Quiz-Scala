import { describe, expect, it } from "vitest";
import { alpha, onColor, youtubeEmbed } from "@/lib/theme";

describe("theme", () => {
  it("alpha_deve_expandir_hex_curto", () => {
    expect(alpha("#fff", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
    expect(alpha("#FF0000", 1)).toBe("rgba(255, 0, 0, 1)");
  });
  it("onColor_deve_escolher_contraste", () => {
    expect(onColor("#ffffff")).toBe("#111111");
    expect(onColor("#000000")).toBe("#FFFFFF");
  });
  it("youtubeEmbed_deve_reconhecer_formatos_e_rejeitar_outros", () => {
    const id = "dQw4w9WgXcQ";
    const out = `https://www.youtube.com/embed/${id}`;
    expect(youtubeEmbed(`https://www.youtube.com/watch?v=${id}`)).toBe(out);
    expect(youtubeEmbed(`https://youtu.be/${id}`)).toBe(out);
    expect(youtubeEmbed(`https://youtube.com/shorts/${id}`)).toBe(out);
    expect(youtubeEmbed("https://vimeo.com/123")).toBeNull();
  });
});
