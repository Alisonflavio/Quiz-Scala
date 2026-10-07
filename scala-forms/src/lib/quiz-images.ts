import type { Field, FormDoc } from "./types";

/** Foto de cada pergunta do Diagnóstico Scala, pela chave do campo (arquivos em public/quiz, 840px, WebP) */
export const IMAGEM_DA_PERGUNTA: Record<string, string> = {
  dor: "/quiz/trava.webp",
  resultado: "/quiz/resultado.webp",
  bloqueio: "/quiz/falta.webp",
  venda: "/quiz/venda.webp",
  area: "/quiz/area.webp",
  renda: "/quiz/renda.webp",
  aumento: "/quiz/aumento.webp",
  horas: "/quiz/horas.webp",
  objetivo: "/quiz/objetivo.webp",
};

/**
 * No Diagnóstico Scala, a pergunta de múltipla escolha que ainda não tem foto no formulário salvo mostra a foto
 * padrão dela. Foto escolhida no editor sempre vale mais, e formulários que não são o diagnóstico não mudam.
 */
export function comImagemPadrao(doc: FormDoc, field: Field): Field {
  if (field.media?.url || field.type !== "multiple_choice") return field;
  if (!doc.fields.some((f) => f.ending === "scala_diagnosis")) return field;
  const url = IMAGEM_DA_PERGUNTA[field.key];
  return url ? { ...field, media: { kind: "image", url } } : field;
}
