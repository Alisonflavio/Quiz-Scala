/*
 * Dados da página de obrigado (/obrigado).
 * Nome, telefone e valores chegam pelo sessionStorage, gravado pelo diagnóstico antes de trocar de página
 * (ver `irParaObrigado` em lib/scala.ts). Pela URL chegam só os ids (rid/fid) e as UTMs.
 * A URL também é lida como alternativa, para links antigos que ainda levavam os dados na query.
 */

export const STORAGE_KEY = "scala_obrigado";

export type ObrigadoData = {
  nome: string;
  telefone: string;
  email: string;
  renda: number;
  meta: number;
  /** id da resposta e do formulário: usados para registrar eventos desta página */
  rid: string;
  fid: string;
};

/** Primeiro valor não vazio. */
function pick(...values: unknown[]): string {
  for (const v of values) if (v != null && String(v).trim() !== "") return String(v).trim();
  return "";
}

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

/** Converte "5000", "5.000", "R$ 5.000,00" em número; inválido vira 0. */
export function parseReais(v: unknown): number {
  if (v == null || v === "") return 0;
  const s = String(v).trim();
  // "4.000" e "12.500.000" são milhar (padrão brasileiro), não decimal
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ""));
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const n = Number(
    s
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.]/g, ""),
  );
  return Number.isFinite(n) ? n : 0;
}

/** Junta o que veio do sessionStorage com a URL (o sessionStorage tem prioridade). */
export function readData(query: URLSearchParams, saved: Record<string, unknown>): ObrigadoData {
  const renda = parseReais(pick(saved.renda, saved.fatura, query.get("renda"), query.get("fatura")));
  const aumento = parseReais(pick(saved.aumento, query.get("aumento")));
  const metaInformada = parseReais(pick(saved.meta, query.get("meta")));
  return {
    nome: pick(saved.nome, query.get("nome")),
    telefone: digits(pick(saved.telefone, saved.whatsapp, query.get("telefone"), query.get("whatsapp"))),
    email: pick(saved.email, query.get("email")),
    renda,
    meta: metaInformada || (renda && aumento ? renda + aumento : 0),
    rid: pick(query.get("rid"), saved.rid),
    fid: pick(query.get("fid"), saved.fid),
  };
}

/** Lê os dados no navegador (sessionStorage + URL). */
export function loadData(): ObrigadoData {
  let saved: Record<string, unknown> = {};
  try {
    saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}") || {};
  } catch {}
  return readData(new URLSearchParams(window.location.search), saved);
}

/** Guarda os dados de novo (ex.: depois de corrigir o telefone). */
export function saveData(d: ObrigadoData) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}") || {};
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, ...d, whatsapp: d.telefone }));
  } catch {}
}

/** Primeiro nome ("Ana Souza" -> "Ana"); vazio se não houver nome. */
export const firstName = (nome: string) => nome.split(/\s+/)[0] ?? "";

/** "41988887777" -> "(41) 98888-7777"; aceita com ou sem 55. Vazio se não houver telefone. */
export function formatPhone(value: string): string {
  let d = digits(value);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

/** 5000 -> "R$ 5.000"; zero ou negativo vira vazio. */
export function formatReais(n: number): string {
  if (!n || n <= 0) return "";
  return `R$ ${Math.round(n).toLocaleString("pt-BR")}`;
}

/** Telefone aceito na correção: 10 ou 11 dígitos (DDD + número). */
export const isValidPhone = (value: string) => {
  const d = digits(value);
  return d.length >= 10 && d.length <= 11;
};

/** Registra um evento na resposta (painel e integrações). Sem ids, não faz nada. */
export function sendEvent(d: Pick<ObrigadoData, "rid" | "fid">, event: string, vars?: Record<string, string>) {
  if (!d.rid || !d.fid) return;
  fetch(`/api/f/${encodeURIComponent(d.fid)}/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responseId: d.rid, event, ...(vars ? { vars } : {}) }),
    keepalive: true,
  }).catch(() => {});
}

/** Evento personalizado no Pixel da Meta, se o Pixel estiver carregado nesta página. */
export function pixelEvent(name: string) {
  try {
    (window as Window & { fbq?: (...a: unknown[]) => void }).fbq?.("trackCustom", name);
  } catch {}
}
