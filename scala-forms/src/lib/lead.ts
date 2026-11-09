/*
 * Dados do lead e do diagnóstico extraídos das respostas, para as colunas próprias de `responses`
 * (lead_name, lead_email, lead_phone, diag_area, diag_bottleneck, diag_career_score).
 * Função pura: usada ao salvar a resposta, nos eventos e no preenchimento das respostas antigas.
 */
import { variables } from "./engine";
import { computeScala } from "./scala";
import type { AnswerValue, FormDoc } from "./types";

export type LeadColumns = {
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  diag_area: string | null;
  diag_bottleneck: string | null;
  diag_career_score: number | null;
};

/** Ordem das colunas como aparecem nos comandos SQL (`leadValues`). */
export const LEAD_COLUMN_NAMES = [
  "lead_name",
  "lead_email",
  "lead_phone",
  "diag_area",
  "diag_bottleneck",
  "diag_career_score",
] as const;

const orNull = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

/**
 * Calcula as colunas a partir das respostas e do `meta` (correções feitas no diagnóstico e na página de obrigado).
 * O telefone corrigido pela pessoa tem prioridade sobre o que ela digitou no formulário.
 */
export function leadColumns(
  doc: FormDoc,
  answers: Record<string, AnswerValue>,
  meta: Record<string, unknown> = {},
): LeadColumns {
  const vars = variables(doc, answers);
  const corrected = typeof meta.telefone_corrigido === "string" ? meta.telefone_corrigido : "";
  const phone = (corrected || vars.whatsapp || vars.telefone || "").replace(/\D/g, "");
  const out: LeadColumns = {
    lead_name: orNull(vars.nome),
    lead_email: orNull(vars.email)?.toLowerCase() ?? null,
    lead_phone: phone || null,
    diag_area: null,
    diag_bottleneck: null,
    diag_career_score: null,
  };
  if (doc.fields.some((f) => f.type === "thankyou" && f.ending === "scala_diagnosis")) {
    const corr = (meta.correcao ?? {}) as Record<string, string>;
    const sc = computeScala({ ...vars, ...Object.fromEntries(Object.entries(corr).filter(([, v]) => v)) });
    if (sc) {
      out.diag_area = sc.diagnosis.area;
      out.diag_bottleneck = sc.diagnosis.gargalo;
      out.diag_career_score = sc.score;
    }
  }
  return out;
}

/** Valores na ordem de `LEAD_COLUMN_NAMES`, para parâmetros SQL. */
export function leadValues(c: LeadColumns) {
  return LEAD_COLUMN_NAMES.map((k) => c[k]);
}
