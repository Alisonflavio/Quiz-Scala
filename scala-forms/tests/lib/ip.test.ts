import { describe, expect, it } from "vitest";
import { isBlockedIp } from "@/lib/ip";

describe("isBlockedIp", () => {
  it("deve_bloquear_redes_internas_e_reservadas_ipv4", () => {
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "224.0.0.1",
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("deve_liberar_ips_publicos_ipv4", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.15.0.1", "172.32.0.1", "142.250.80.46"]) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });

  it("deve_bloquear_ipv6_interno_e_ipv4_mapeado", () => {
    for (const ip of ["::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
    expect(isBlockedIp("2606:4700:4700::1111")).toBe(false);
    expect(isBlockedIp("::ffff:8.8.8.8")).toBe(false);
  });

  it("deve_bloquear_entrada_invalida", () => {
    expect(isBlockedIp("não é ip")).toBe(true);
    expect(isBlockedIp("")).toBe(true);
  });
});
