import { describe, expect, it } from "vitest";
import {
  answerText,
  answerValue,
  computeScore,
  interpolate,
  isAnswered,
  maxScore,
  nextFieldId,
  optionLabelFor,
  temperatureFor,
  validateAnswer,
  variables,
} from "@/lib/engine";
import { DEFAULT_SETTINGS, DEFAULT_THEME, type Field, type FormDoc } from "@/lib/types";

/** Monta um campo mínimo válido; cada teste sobrescreve só o que importa. */
const field = (over: Partial<Field> & Pick<Field, "id" | "type">): Field => ({
  title: over.id,
  required: false,
  key: over.id,
  ...over,
});

const doc = (fields: Field[]): FormDoc => ({ fields, theme: DEFAULT_THEME, settings: DEFAULT_SETTINGS });

const budget = field({
  id: "budget",
  type: "multiple_choice",
  options: [
    { id: "a", label: "Menos de R$ 3.000", points: 10, value: "2000" },
    { id: "b", label: "Mais de R$ 3.000", points: 30 },
  ],
});
const age = field({
  id: "age",
  type: "number",
  scoreThresholds: [
    { min: 0, max: 17, points: 0 },
    { min: 18, max: 99, points: 20 },
  ],
});

describe("computeScore", () => {
  it("deve_somar_pontos_das_opcoes_escolhidas", () => {
    const d = doc([budget]);
    expect(computeScore(d, { budget: { options: ["a", "b"] } })).toBe(40);
  });

  it("deve_aplicar_faixa_numerica_que_bate_com_o_valor", () => {
    expect(computeScore(doc([age]), { age: "25" })).toBe(20);
  });

  it("deve_ignorar_numero_invalido_ou_fora_das_faixas", () => {
    expect(computeScore(doc([age]), { age: "abc" })).toBe(0);
    expect(computeScore(doc([age]), { age: "150" })).toBe(0);
  });

  it("deve_retornar_zero_sem_respostas", () => {
    expect(computeScore(doc([budget, age]), {})).toBe(0);
  });
});

describe("maxScore", () => {
  it("deve_usar_melhor_opcao_quando_escolha_unica", () => {
    expect(maxScore(doc([budget]))).toBe(30);
  });

  it("deve_somar_opcoes_quando_aceita_varias", () => {
    expect(maxScore(doc([{ ...budget, multiple: true }]))).toBe(40);
  });

  it("deve_somar_maior_faixa_dos_campos_numericos", () => {
    expect(maxScore(doc([budget, age]))).toBe(50);
  });
});

describe("temperatureFor", () => {
  const rules = { enabled: true, coldMax: 40, warmMax: 70 };

  it("deve_classificar_pelos_limites_inclusivos", () => {
    expect(temperatureFor(40, rules)).toBe("frio");
    expect(temperatureFor(41, rules)).toBe("morno");
    expect(temperatureFor(70, rules)).toBe("morno");
    expect(temperatureFor(71, rules)).toBe("quente");
  });

  it("deve_retornar_null_quando_desativada", () => {
    expect(temperatureFor(100, { ...rules, enabled: false })).toBeNull();
  });
});

describe("textos e variaveis", () => {
  it("answerText_deve_usar_rotulo_e_incluir_outros", () => {
    expect(answerText(budget, { options: ["a"], other: "talvez" })).toBe("Menos de R$ 3.000, talvez");
  });

  it("answerValue_deve_preferir_value_e_cair_no_rotulo", () => {
    expect(answerValue(budget, { options: ["a", "b"] })).toBe("2000, Mais de R$ 3.000");
  });

  it("optionLabelFor_deve_achar_rotulo_pelo_valor_salvo", () => {
    const d = doc([{ ...budget, key: "faturamento" }]);
    expect(optionLabelFor(d, "faturamento", "2000")).toBe("Menos de R$ 3.000");
    expect(optionLabelFor(d, "faturamento", undefined)).toBeUndefined();
  });

  it("variables_deve_ignorar_telas_e_campos_sem_chave", () => {
    const d = doc([field({ id: "w", type: "welcome" }), field({ id: "n", type: "name", key: "nome" })]);
    expect(variables(d, { n: "Ana" })).toEqual({ nome: "Ana" });
  });

  it("interpolate_deve_trocar_variaveis_e_apagar_desconhecidas", () => {
    expect(interpolate("Oi {{ nome }}, {{x}}!", { nome: "Ana" })).toBe("Oi Ana, !");
  });
});

describe("validateAnswer / isAnswered", () => {
  it("deve_exigir_campo_obrigatorio_vazio", () => {
    const f = field({ id: "n", type: "name", required: true });
    expect(validateAnswer(f, "")).toBe("Este campo é obrigatório.");
    expect(isAnswered(f, "  ")).toBe(false);
  });

  it("deve_aceitar_campo_opcional_vazio", () => {
    expect(validateAnswer(field({ id: "e", type: "email" }), undefined)).toBe("");
  });

  it("deve_validar_email_telefone_numero_e_nome", () => {
    expect(validateAnswer(field({ id: "e", type: "email" }), "x@y")).toBe("Digite um e-mail válido.");
    expect(validateAnswer(field({ id: "e", type: "email" }), "a@b.co")).toBe("");
    expect(validateAnswer(field({ id: "p", type: "phone" }), "123")).toBe("Digite um telefone válido com DDD.");
    expect(validateAnswer(field({ id: "p", type: "phone" }), "(11) 91234-5678")).toBe("");
    expect(validateAnswer(field({ id: "n", type: "number" }), "1,5")).toBe("");
    expect(validateAnswer(field({ id: "n", type: "number" }), "x")).toBe("Digite um número.");
    expect(validateAnswer(field({ id: "m", type: "name" }), "A")).toBe("Digite seu nome.");
  });

  it("deve_considerar_opcao_ou_outros_como_respondido", () => {
    const f = field({ id: "c", type: "multiple_choice" });
    expect(isAnswered(f, { options: [] })).toBe(false);
    expect(isAnswered(f, { options: [], other: "x" })).toBe(true);
    expect(isAnswered(f, { options: ["a"] })).toBe(true);
  });
});

describe("nextFieldId", () => {
  const q1 = field({
    id: "q1",
    type: "multiple_choice",
    options: [
      { id: "a", label: "A", points: 0 },
      { id: "b", label: "B", points: 50 },
    ],
    logicEnabled: true,
    logic: [{ id: "r1", kind: "answer", op: "is", optionId: "a", goTo: "end" }],
  });
  const q2 = field({ id: "q2", type: "short_text" });
  const end = field({ id: "end", type: "thankyou" });
  const d = doc([q1, q2, end]);

  it("deve_seguir_regra_de_resposta_quando_bate", () => {
    expect(nextFieldId(d, "q1", { q1: { options: ["a"] } })).toBe("end");
  });

  it("deve_seguir_ordem_quando_nenhuma_regra_bate", () => {
    expect(nextFieldId(d, "q1", { q1: { options: ["b"] } })).toBe("q2");
  });

  it("deve_seguir_regra_por_pontos", () => {
    const byPoints = doc([{ ...q1, logic: [{ id: "r", kind: "points", min: 40, max: 100, goTo: "end" }] }, q2, end]);
    expect(nextFieldId(byPoints, "q1", { q1: { options: ["b"] } })).toBe("end");
  });

  it("deve_ignorar_destino_inexistente", () => {
    const broken = doc([{ ...q1, logic: [{ id: "r", kind: "answer", op: "is", optionId: "a", goTo: "sumiu" }] }, q2]);
    expect(nextFieldId(broken, "q1", { q1: { options: ["a"] } })).toBe("q2");
  });

  it("deve_retornar_null_no_agradecimento_no_ultimo_campo_e_em_id_desconhecido", () => {
    expect(nextFieldId(d, "end", {})).toBeNull();
    expect(nextFieldId(doc([q2]), "q2", {})).toBeNull();
    expect(nextFieldId(d, "nao-existe", {})).toBeNull();
  });
});

describe("computeScore com número digitado", () => {
  const d = doc([age]);
  it("deve_aceitar_virgula_decimal_como_validateAnswer_aceita", () => {
    expect(validateAnswer(age, "18,5")).toBe("");
    expect(computeScore(d, { age: "18,5" })).toBe(20);
  });
  it("nao_deve_pontuar_resposta_em_branco_como_zero", () => {
    expect(computeScore(d, { age: "   " })).toBe(0);
    const zero = doc([{ ...age, scoreThresholds: [{ min: 0, max: 5, points: 9 }] }]);
    expect(computeScore(zero, { age: "  " })).toBe(0);
  });
});
