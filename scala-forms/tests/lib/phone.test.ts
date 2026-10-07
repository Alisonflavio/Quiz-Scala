import { describe, expect, it } from "vitest";
import { validateAnswer } from "@/lib/engine";
import { formatNumero, joinPhone, splitPhone } from "@/lib/phone";
import type { Field } from "@/lib/types";

const campo: Field = { id: "f1", type: "phone", key: "whatsapp", title: "Qual seu WhatsApp?", required: true };

describe("formatNumero", () => {
  it("deve_formatar_celular_como_99999_9999_e_fixo_como_9999_9999", () => {
    expect(formatNumero("995150509")).toBe("99515-0509");
    expect(formatNumero("33334444")).toBe("3333-4444");
  });

  it("deve_ignorar_letras_e_limitar_a_9_digitos", () => {
    expect(formatNumero("99a515-05099999")).toBe("99515-0509");
  });

  it("deve_formatar_enquanto_digita", () => {
    expect(formatNumero("9")).toBe("9");
    expect(formatNumero("99515")).toBe("99515");
    expect(formatNumero("995150")).toBe("99515-0");
  });
});

describe("joinPhone", () => {
  it("deve_juntar_ddd_e_numero_no_formato_do_campo_antigo", () => {
    expect(joinPhone("41", "995150509")).toBe("(41) 99515-0509");
  });

  it("deve_voltar_vazio_quando_nada_foi_digitado", () => {
    expect(joinPhone("", "")).toBe("");
  });

  it("deve_manter_o_que_ja_foi_digitado_quando_falta_uma_parte", () => {
    expect(joinPhone("41", "")).toBe("(41) ");
    expect(joinPhone("", "995150509")).toBe("() 99515-0509");
  });

  it("deve_gerar_uma_resposta_que_passa_na_validacao_do_telefone", () => {
    expect(validateAnswer(campo, joinPhone("41", "995150509"))).toBe("");
    expect(validateAnswer(campo, joinPhone("41", "33334444"))).toBe("");
  });

  it("deve_acusar_telefone_invalido_quando_falta_o_ddd_ou_o_numero", () => {
    expect(validateAnswer(campo, joinPhone("", "995150509"))).toMatch(/telefone válido/);
    expect(validateAnswer(campo, joinPhone("41", "9951"))).toMatch(/telefone válido/);
  });
});

describe("splitPhone", () => {
  it("deve_separar_o_formato_novo", () => {
    expect(splitPhone("(41) 99515-0509")).toEqual({ ddd: "41", numero: "99515-0509" });
  });

  it("deve_separar_respostas_antigas_sem_parenteses", () => {
    expect(splitPhone("41995150509")).toEqual({ ddd: "41", numero: "99515-0509" });
    expect(splitPhone("(11) 90000-0000")).toEqual({ ddd: "11", numero: "90000-0000" });
  });

  it("deve_tirar_o_55_de_respostas_com_codigo_do_pais", () => {
    expect(splitPhone("+55 41 99515-0509")).toEqual({ ddd: "41", numero: "99515-0509" });
  });

  it("deve_manter_o_ddd_vazio_quando_so_o_numero_foi_digitado", () => {
    expect(splitPhone(joinPhone("", "995150509"))).toEqual({ ddd: "", numero: "99515-0509" });
  });

  it("deve_ser_o_inverso_de_joinPhone", () => {
    const { ddd, numero } = splitPhone(joinPhone("21", "987654321"));
    expect(joinPhone(ddd, numero)).toBe("(21) 98765-4321");
  });
});
