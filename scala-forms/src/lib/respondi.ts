/* Monta o envio do webhook no mesmo formato do Respondi, para um cenário do Make já configurado para o Respondi continuar funcionando sem alteração. */
import { maxScore } from "./engine";
import type { FormDoc, ResponseRow } from "./types";

const PERGUNTAS = {
  nome: "Nome",
  telefone: "Telefone com DDD",
  email: "E-mail",
  area: "Qual sua área da atuação?",
  renda: "Qual é sua renda mensal média atual?",
  meta: "Quanto você gostaria de faturar mensalmente nos próximos 12 meses?",
  arroba: "Qual seu endereço @ na plataforma que mais usa?",
  objetivo: "Qual é o maior objetivo que você deseja alcançar nos próximos 12 meses?",
  vinteMin:
    "Você teria 20 minutos pra conversar com um dos nossos especialistas e entender qual o melhor caminho pra alcançá seu objetivo?",
};

const OBJETIVOS: Record<string, string> = {
  renda_online: "Aumentar a renda online",
  dobrar_clientes: "Dobrar e/ou Aumentar o número de clientes",
  produto_digital: "Criar um produto digital lucrativo",
  presenca_redes: "Ampliar minha presença nas redes sociais",
};

// os textos das faixas são exatamente os do Respondi (inclusive a faixa de R$10.000 sem espaços)
function faixaMeta(meta: number) {
  if (!meta) return "";
  if (meta <= 5000) return "Até R$ 5.000";
  if (meta <= 10000) return "Entre R$ 5.000 e R$ 10.000";
  if (meta <= 20000) return "Entre R$10.000 e R$20.000";
  return "Acima de R$ 20.000";
}

function telefone(v: unknown) {
  const d = String(v ?? "").replace(/\D/g, "");
  const nacional = d.length >= 12 && d.startsWith("55") ? d.slice(2) : d;
  return nacional ? `55 ${nacional}` : "";
}

type Base = Pick<ResponseRow, "id" | "form_id" | "score" | "utm" | "completed_at">;

export function respondiPayload(doc: FormDoc, r: Base, formTitle: string, flat: Record<string, string | number>) {
  const s = (v: unknown) => String(v ?? "");
  const meta = Number(flat.renda_meta) || (Number(flat.renda_valor) || 0) + (Number(flat.aumento_valor) || 0);
  const answers: Record<string, string> = {
    [PERGUNTAS.nome]: s(flat.nome),
    [PERGUNTAS.telefone]: telefone(flat.whatsapp),
    [PERGUNTAS.email]: s(flat.email),
    [PERGUNTAS.area]: s(flat.area),
    [PERGUNTAS.renda]: s(flat.renda),
    [PERGUNTAS.meta]: faixaMeta(meta),
    [PERGUNTAS.arroba]: s(flat.insta),
    [PERGUNTAS.objetivo]: OBJETIVOS[s(flat.objetivo_valor)] ?? s(flat.objetivo),
    [PERGUNTAS.vinteMin]: "",
  };
  const max = maxScore(doc);
  return {
    form: { form_name: formTitle, form_id: r.form_id },
    respondent: {
      respondent_id: r.id,
      status: "completed",
      // o Make classifica com cortes sobre uma nota de 0 a 100 (como no Respondi), então a nota é convertida proporcionalmente
      score: max ? Math.round((r.score / max) * 100) : r.score,
      date: new Date(r.completed_at ?? Date.now()).toISOString().replace("T", " ").slice(0, 19),
      answers,
      raw_answers: Object.entries(answers).map(([question, answer]) => ({ question, answer })),
      respondent_utms: r.utm ?? {},
    },
    extras: flat,
  };
}
