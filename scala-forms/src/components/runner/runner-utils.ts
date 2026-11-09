/* Utilitários do formulário público: envio com novas tentativas, UTMs e embaralhamento estável das opções. */
import { UTM_KEYS } from "@/lib/engine";

/** Tentativas de envio na conclusão e espera base entre elas (cresce a cada tentativa). */
export const SEND_ATTEMPTS = 3;
export const SEND_RETRY_MS = 1500;
export const SEND_FAILED_MESSAGE =
  "Não conseguimos enviar suas respostas. Confira sua internet e toque no botão de novo.";

export function readUtm() {
  const out: Record<string, string> = {};
  if (typeof window === "undefined") return out;
  const qs = new URLSearchParams(location.search);
  for (const k of UTM_KEYS) {
    let v = qs.get(k);
    try {
      if (v) sessionStorage.setItem(`sf_${k}`, v);
      else v = sessionStorage.getItem(`sf_${k}`);
    } catch {}
    if (v) out[k] = v;
  }
  return out;
}

export function shuffled<T>(arr: T[], seed: string) {
  // embaralha de forma estável por pessoa (não muda a cada renderização)
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) | 0;
    const j = Math.abs(h) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
