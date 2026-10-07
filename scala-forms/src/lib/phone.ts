/* Telefone em dois campos (DDD + número) que continuam sendo uma resposta só: "(41) 99515-0509". */

/** Só os dígitos do número, com hífen: celular (começa com 9) vira 99999-9999, fixo vira 9999-9999 */
export function formatNumero(digitos: string): string {
  const d = digitos.replace(/\D/g, "").slice(0, 9);
  const corte = d.startsWith("9") ? 5 : 4;
  return d.length > corte ? `${d.slice(0, corte)}-${d.slice(corte)}` : d;
}

/** Junta DDD e número na mesma forma que o campo antigo guardava. Vazio se nada foi digitado. */
export function joinPhone(ddd: string, numero: string): string {
  const d = ddd.replace(/\D/g, "").slice(0, 2);
  const n = formatNumero(numero);
  return d || n ? `(${d}) ${n}` : "";
}

/** Separa uma resposta já guardada (inclusive no formato antigo, sem parênteses ou com +55) em DDD e número */
export function splitPhone(valor: string): { ddd: string; numero: string } {
  const m = /^\((\d{0,2})\)\s*(.*)$/.exec(valor.trim());
  if (m) return { ddd: m[1], numero: formatNumero(m[2]) };
  let d = valor.replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  return { ddd: d.slice(0, 2), numero: formatNumero(d.slice(2)) };
}
