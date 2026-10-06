/* Regras do formulário usadas tanto no navegador (quiz) quanto no servidor (respostas e webhook). */
import type { AnswerValue, Field, FormDoc, Temperature, TemperatureRules } from "./types";

export function optionIds(v: AnswerValue | undefined): string[] {
  if (!v || typeof v === "string") return [];
  return v.options;
}

/** Soma dos pontos das opções escolhidas (múltipla escolha) e das faixas batidas (campos numéricos) */
export function computeScore(doc: FormDoc, answers: Record<string, AnswerValue>): number {
  let total = 0;
  for (const f of doc.fields) {
    if (f.type === "multiple_choice" && f.options) {
      const chosen = optionIds(answers[f.id]);
      for (const o of f.options) if (chosen.includes(o.id)) total += Number(o.points) || 0;
      continue;
    }
    if (f.type === "number" && f.scoreThresholds?.length) {
      const v = answers[f.id];
      const n = typeof v === "string" ? Number(v) : NaN;
      if (!isNaN(n)) {
        const hit = f.scoreThresholds.find((t) => n >= t.min && n <= t.max);
        if (hit) total += Number(hit.points) || 0;
      }
    }
  }
  return total;
}

/** Maior pontuação possível: o melhor ponto de cada pergunta que pontua (a soma, se aceitar várias opções) */
export function maxScore(doc: FormDoc): number {
  let total = 0;
  for (const f of doc.fields) {
    if (f.type === "multiple_choice" && f.options) {
      const pts = f.options.map((o) => Number(o.points) || 0).filter((p) => p > 0);
      total += f.multiple ? pts.reduce((a, b) => a + b, 0) : Math.max(0, ...pts);
    } else if (f.type === "number" && f.scoreThresholds?.length) {
      total += Math.max(0, ...f.scoreThresholds.map((t) => Number(t.points) || 0));
    }
  }
  return total;
}

export function temperatureFor(score: number, rules: TemperatureRules): Temperature | null {
  if (!rules.enabled) return null;
  if (score <= rules.coldMax) return "frio";
  if (score <= rules.warmMax) return "morno";
  return "quente";
}

/** Texto legível de uma resposta */
export function answerText(field: Field, v: AnswerValue | undefined): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  const labels = (field.options ?? []).filter((o) => v.options.includes(o.id)).map((o) => o.label);
  if (v.other) labels.push(v.other);
  return labels.join(", ");
}

/** Rótulo da opção escolhida para um campo, a partir do valor salvo (ex.: "2000" -> "Menos de R$ 3.000").
 *  Usado para mostrar de volta o que a pessoa realmente escolheu, e não o número aproximado que a opção carrega. */
export function optionLabelFor(doc: FormDoc, key: string, value: string | undefined): string | undefined {
  if (!value) return undefined;
  const field = doc.fields.find((f) => f.key === key);
  const opt = field?.options?.find((o) => (o.value || o.label) === value);
  return opt?.label;
}

/** Valor da variável de um campo: o "valor" da opção se existir, senão o texto */
export function answerValue(field: Field, v: AnswerValue | undefined): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  const vals = (field.options ?? [])
    .filter((o) => v.options.includes(o.id))
    .map((o) => (o.value !== undefined && o.value !== "" ? o.value : o.label));
  if (v.other) vals.push(v.other);
  return vals.join(", ");
}

/** Mapa variável → valor, para textos com {{variavel}}, webhook e resultados */
export function variables(doc: FormDoc, answers: Record<string, AnswerValue>) {
  const vars: Record<string, string> = {};
  for (const f of doc.fields) {
    if (!f.key || f.type === "welcome" || f.type === "thankyou") continue;
    vars[f.key] = answerValue(f, answers[f.id]);
  }
  return vars;
}

export function interpolate(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

/**
 * Próximo campo depois de `currentId`.
 * Aplica a lógica do campo atual (por resposta ou por pontos); sem regra que bata, segue a ordem.
 * Retorna null quando não há mais nada (fim sem tela de agradecimento).
 */
export function nextFieldId(
  doc: FormDoc,
  currentId: string,
  answers: Record<string, AnswerValue>,
): string | null {
  const idx = doc.fields.findIndex((f) => f.id === currentId);
  const field = doc.fields[idx];
  if (!field) return null;
  if (field.type === "thankyou") return null;

  if (field.logicEnabled && field.logic?.length) {
    const chosen = optionIds(answers[field.id]);
    const score = computeScore(doc, answers);
    for (const r of field.logic) {
      const hit =
        r.kind === "answer"
          ? r.op === "is" ? chosen.includes(r.optionId) : !chosen.includes(r.optionId)
          : score >= r.min && score <= r.max;
      if (hit && r.goTo && doc.fields.some((f) => f.id === r.goTo)) return r.goTo;
    }
  }
  const nxt = doc.fields[idx + 1];
  return nxt ? nxt.id : null;
}

export function isAnswered(field: Field, v: AnswerValue | undefined) {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  return v.options.length > 0 || !!v.other?.trim();
}

export function validateAnswer(field: Field, v: AnswerValue | undefined): string {
  if (!isAnswered(field, v)) return field.required ? "Este campo é obrigatório." : "";
  if (typeof v !== "string") return "";
  const s = v.trim();
  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "Digite um e-mail válido.";
  if (field.type === "phone") {
    const d = s.replace(/\D/g, "");
    if (d.length < 10 || d.length > 13) return "Digite um telefone válido com DDD.";
  }
  if (field.type === "number" && isNaN(Number(s.replace(",", ".")))) return "Digite um número.";
  if (field.type === "name" && s.length < 2) return "Digite seu nome.";
  return "";
}

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];
