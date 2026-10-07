/* Classificação de endereços IP: usada para impedir que o servidor faça requisições a redes internas (SSRF). */
import { isIP } from "node:net";

/** Converte um IPv4 "a.b.c.d" em número de 32 bits. */
const ipv4ToInt = (ip: string) => ip.split(".").reduce((n, p) => n * 256 + Number(p), 0);

/** Faixas IPv4 que nunca devem ser alvo de uma integração (rede privada, loopback, link-local, CGNAT, reservadas). */
const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

/** `true` se o IP (v4 ou v6) é interno/reservado e, portanto, proibido como destino. Entrada inválida também é bloqueada. */
export function isBlockedIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) {
    const n = ipv4ToInt(ip);
    return BLOCKED_V4.some(
      ([base, bits]) => Math.floor(n / 2 ** (32 - bits)) === Math.floor(ipv4ToInt(base) / 2 ** (32 - bits)),
    );
  }
  if (kind === 6) {
    const v = ip.toLowerCase();
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedIp(mapped[1]);
    return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff");
  }
  return true;
}
