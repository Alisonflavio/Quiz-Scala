/* Descobre o tipo real de um arquivo pelos primeiros bytes (o `type` enviado pelo navegador pode ser forjado). */

export type SniffedMime = "image/png" | "image/jpeg" | "image/webp" | "image/gif" | "image/svg+xml" | "application/pdf";

const startsWith = (b: Uint8Array, sig: number[], offset = 0) => sig.every((v, i) => b[offset + i] === v);

/** @returns o tipo detectado, ou `null` se não for uma das imagens/PDF aceitas. */
export function sniffMime(bytes: Uint8Array): SniffedMime | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return "image/webp";
  // SVG é texto: procura a tag <svg no começo do arquivo
  const head = new TextDecoder().decode(bytes.slice(0, 1024)).trimStart().toLowerCase();
  if (head.startsWith("<") && head.includes("<svg")) return "image/svg+xml";
  return null;
}
