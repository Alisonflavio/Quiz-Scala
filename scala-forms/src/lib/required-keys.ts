/*
 * Variáveis que o código usa pelo nome. Se alguém renomear ou apagar a pergunta no editor, o diagnóstico
 * e o envio ao Make quebram em silêncio (ex.: RD recusa lead sem e-mail). Por isso a publicação é barrada.
 */
import type { FormDoc } from "./types";

/** Usadas no envio ao Make no formato Respondi (`respondi.ts`): sem elas o RD não recebe o contato. */
const RESPONDI_KEYS = ["nome", "email", "whatsapp"] as const;

/** Usadas no cálculo do Diagnóstico Scala (`scala.ts`) e na página de obrigado. */
const SCALA_KEYS = ["nome", "email", "whatsapp", "renda", "aumento", "horas", "objetivo"] as const;

/** Variáveis que este formulário precisa ter, conforme o final escolhido e o formato do webhook. */
export function requiredKeys(doc: FormDoc): string[] {
  const keys = new Set<string>();
  if (doc.fields.some((f) => f.type === "thankyou" && f.ending === "scala_diagnosis"))
    SCALA_KEYS.forEach((k) => keys.add(k));
  if (doc.settings.webhook?.enabled && doc.settings.webhook.format === "respondi")
    RESPONDI_KEYS.forEach((k) => keys.add(k));
  return [...keys];
}

/** Variáveis obrigatórias que não existem em nenhuma pergunta. Lista vazia = pode publicar. */
export function missingRequiredKeys(doc: FormDoc): string[] {
  const present = new Set(doc.fields.map((f) => f.key).filter(Boolean));
  return requiredKeys(doc).filter((k) => !present.has(k));
}

/** Mensagem para o editor quando faltam variáveis. */
export function missingKeysMessage(missing: string[]): string {
  return `Não dá para publicar: falta pergunta com a variável ${missing.map((k) => `"${k}"`).join(", ")}. O diagnóstico e o envio ao Make dependem dela.`;
}
