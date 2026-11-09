import { describe, expect, it } from "vitest";
import { firstName, formatPhone, formatReais, isValidPhone, parseReais, readData } from "@/components/obrigado/data";

describe("página de obrigado — dados", () => {
  it("deve_preferir_o_sessionStorage_e_pegar_ids_da_url", () => {
    const d = readData(new URLSearchParams("rid=r1&fid=f1&nome=Velho"), {
      nome: "Ana Souza",
      whatsapp: "41988887777",
      renda: 5000,
      aumento: 3000,
    });
    expect(d).toMatchObject({
      nome: "Ana Souza",
      telefone: "41988887777",
      renda: 5000,
      meta: 8000,
      rid: "r1",
      fid: "f1",
    });
  });

  it("deve_aceitar_links_antigos_com_dados_na_url", () => {
    const d = readData(new URLSearchParams("nome=Bia&telefone=(41)%2099999-0000&renda=4.000&meta=10000"), {});
    expect(d).toMatchObject({ nome: "Bia", telefone: "41999990000", renda: 4000, meta: 10000 });
  });

  it("deve_formatar_telefone_valores_e_nome", () => {
    expect(formatPhone("5541988887777")).toBe("(41) 98888-7777");
    expect(formatPhone("4133334444")).toBe("(41) 3333-4444");
    expect(formatPhone("")).toBe("");
    expect(formatReais(5000)).toBe("R$ 5.000");
    expect(formatReais(0)).toBe("");
    expect(parseReais("R$ 5.000,50")).toBe(5000.5);
    expect(firstName("Ana Souza")).toBe("Ana");
    expect(firstName("")).toBe("");
  });

  it("deve_validar_telefone_com_ddd", () => {
    expect(isValidPhone("41988887777")).toBe(true);
    expect(isValidPhone("988887777")).toBe(false);
  });
});
