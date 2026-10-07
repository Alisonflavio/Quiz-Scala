import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { IMAGEM_DA_PERGUNTA, comImagemPadrao } from "@/lib/quiz-images";
import type { Field, FormDoc } from "@/lib/types";

const publico = (url: string) => join(process.cwd(), "public", url);

const pergunta = (key: string, extra: Partial<Field> = {}): Field => ({
  id: key,
  type: "multiple_choice",
  key,
  title: key,
  required: true,
  ...extra,
});
const diagnostico = (fields: Field[]): FormDoc => ({
  fields: [...fields, { id: "fim", type: "thankyou", key: "", title: "", required: false, ending: "scala_diagnosis" }],
  theme: {} as FormDoc["theme"],
  settings: {} as FormDoc["settings"],
});

describe("fotos das perguntas", () => {
  it("deve_ter_o_arquivo_de_cada_foto_e_nenhum_repetido", () => {
    const urls = Object.values(IMAGEM_DA_PERGUNTA);
    for (const url of urls) expect(existsSync(publico(url)), url).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("deve_manter_as_fotos_leves", () => {
    let total = 0;
    for (const url of Object.values(IMAGEM_DA_PERGUNTA)) {
      const kb = statSync(publico(url)).size / 1024;
      expect(kb, `${url} pesa ${Math.round(kb)} KB`).toBeLessThan(90);
      total += kb;
    }
    expect(total).toBeLessThan(600);
  });

  it("nao_deve_manter_a_foto_antiga_em_png_que_pesava_337_kb", () => {
    expect(existsSync(publico("/quiz/falta.png"))).toBe(false);
  });
});

describe("comImagemPadrao", () => {
  it("deve_dar_a_foto_padrao_a_pergunta_do_diagnostico_que_nao_tem_foto", () => {
    const f = pergunta("venda");
    expect(comImagemPadrao(diagnostico([f]), f).media).toEqual({ kind: "image", url: "/quiz/venda.webp" });
  });

  it("deve_respeitar_a_foto_escolhida_no_editor", () => {
    const f = pergunta("dor", { media: { kind: "image", url: "/minha-foto.webp" } });
    expect(comImagemPadrao(diagnostico([f]), f).media?.url).toBe("/minha-foto.webp");
  });

  it("nao_deve_mexer_em_perguntas_sem_foto_padrao_nem_em_outros_tipos", () => {
    const outra = pergunta("insta");
    expect(comImagemPadrao(diagnostico([outra]), outra).media).toBeUndefined();
    const texto = pergunta("renda", { type: "short_text" });
    expect(comImagemPadrao(diagnostico([texto]), texto).media).toBeUndefined();
  });

  it("nao_deve_afetar_formularios_que_nao_sao_o_diagnostico", () => {
    const f = pergunta("area");
    const outroForm: FormDoc = { ...diagnostico([f]), fields: [f] };
    expect(comImagemPadrao(outroForm, f).media).toBeUndefined();
  });
});
