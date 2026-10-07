import { describe, expect, it } from "vitest";
import { sniffMime } from "@/lib/file-sniff";

const bytes = (...n: number[]) => new Uint8Array(n);
const text = (s: string) => new TextEncoder().encode(s);

describe("sniffMime", () => {
  it("deve_reconhecer_formatos_pelos_primeiros_bytes", () => {
    expect(sniffMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("image/png");
    expect(sniffMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffMime(text("GIF89a...."))).toBe("image/gif");
    expect(sniffMime(text("%PDF-1.7"))).toBe("application/pdf");
    expect(sniffMime(text("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(sniffMime(text('  <?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe(
      "image/svg+xml",
    );
  });

  it("deve_recusar_conteudo_que_so_finge_ser_imagem", () => {
    expect(sniffMime(text("<html><script>alert(1)</script></html>"))).toBeNull();
    expect(sniffMime(text("MZ executavel"))).toBeNull();
    expect(sniffMime(new Uint8Array())).toBeNull();
  });
});
