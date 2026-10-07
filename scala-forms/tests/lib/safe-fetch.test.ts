import { describe, expect, it } from "vitest";
import { assertPublicUrl, UnsafeUrlError } from "@/lib/safe-fetch";

describe("assertPublicUrl", () => {
  it("deve_recusar_http_e_esquemas_que_nao_sao_https", async () => {
    await expect(assertPublicUrl("http://8.8.8.8/x")).rejects.toThrow("https");
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow(UnsafeUrlError);
    await expect(assertPublicUrl("lixo")).rejects.toThrow("inválida");
  });

  it("deve_recusar_destinos_internos", async () => {
    for (const url of [
      "https://127.0.0.1/",
      "https://localhost/",
      "https://[::1]/",
      "https://169.254.169.254/latest/meta-data",
      "https://10.0.0.5/admin",
      "https://192.168.0.1/",
    ]) {
      await expect(assertPublicUrl(url), url).rejects.toThrow(UnsafeUrlError);
    }
  });

  it("deve_aceitar_ip_publico_por_https", async () => {
    await expect(assertPublicUrl("https://8.8.8.8/hook")).resolves.toBeInstanceOf(URL);
  });
});
