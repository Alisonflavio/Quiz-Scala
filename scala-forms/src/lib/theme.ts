import type { Theme } from "./types";

export const fontHref = (font: string) =>
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700;800&display=swap`;

/** Fundo do formulário: cor + imagem opcional por cima */
export const background = (t: Theme) =>
  t.bgImage ? `url("${t.bgImage}") center / cover no-repeat, ${t.bgColor}` : t.bgColor;

/** Cor com transparência a partir de #RRGGBB */
export function alpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  const n = parseInt(full.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Texto legível (preto ou branco) sobre uma cor */
export function onColor(hex: string) {
  const h = hex.replace("#", "").padEnd(6, "0");
  const n = parseInt(h.slice(0, 6), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#111111" : "#FFFFFF";
}

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function youtubeEmbed(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}
