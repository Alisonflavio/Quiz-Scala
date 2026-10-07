import { describe, expect, it } from "vitest";
import { computeScala, pontosCriticos, precisaDe, scoreLevel } from "@/lib/scala";

const base = { renda: "5000", aumento: "5000", horas: "40", objetivo: "renda_online" };

describe("computeScala", () => {
  it("deve_retornar_null_sem_renda_aumento_ou_horas", () => {
    expect(computeScala({ ...base, renda: "" })).toBeNull();
    expect(computeScala({ ...base, aumento: "0" })).toBeNull();
    expect(computeScala({ ...base, horas: "abc" })).toBeNull();
  });

  it("deve_calcular_meta_e_percentuais", () => {
    const r = computeScala(base)!;
    expect(r.meta).toBe(10000);
    expect(r.pctMeta).toBe(50);
    expect(r.pct).toBe(67);
    expect(r.diagnosis.key).toBe("vendas");
  });

  it("deve_escolher_escalar_com_agenda_cheia_e_posicionamento_com_agenda_livre", () => {
    expect(computeScala({ ...base, objetivo: "dobrar_clientes", horas: "40" })!.diagnosis.key).toBe("escalar");
    expect(computeScala({ ...base, objetivo: "dobrar_clientes", horas: "20" })!.diagnosis.key).toBe("posicionamento");
  });

  it("deve_manter_score_entre_5_e_100", () => {
    const r = computeScala({ ...base, venda: "processo", renda: "20000", aumento: "1", horas: "10" })!;
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(5);
  });

  it("deve_rejeitar_valores_negativos_que_zeram_ou_invertem_a_meta", () => {
    expect(computeScala({ ...base, renda: "5000", aumento: "-5000" })).toBeNull();
    expect(computeScala({ ...base, renda: "-100" })).toBeNull();
    expect(computeScala({ ...base, horas: "-5" })).toBeNull();
  });

  it("deve_rejeitar_valores_nao_finitos", () => {
    expect(computeScala({ ...base, renda: "1e999" })).toBeNull();
  });

  it("scoreLevel_deve_respeitar_limites", () => {
    expect(scoreLevel(39).label).toBe("Crítico");
    expect(scoreLevel(40).label).toBe("Baixo");
    expect(scoreLevel(80).label).toBe("Bom");
  });
});

describe("pontosCriticos", () => {
  const vars = { ...base, dor: "atrair", venda: "indicacao", bloqueio: "atrair" };

  it("deve_listar_a_dor_a_forma_de_vender_e_a_meta_em_horas", () => {
    const pontos = pontosCriticos(vars, computeScala(vars)!);
    expect(pontos).toEqual([
      "Você **não atrai alunos novos**",
      "Você depende de **indicação**",
      "Meta pede **80h/semana**: não cabe",
    ]);
  });

  it("deve_incluir_o_bloqueio_so_quando_for_diferente_da_dor", () => {
    const outro = { ...vars, bloqueio: "posicionamento" };
    expect(pontosCriticos(outro, computeScala(outro)!)).toContain("Falta **posicionamento e conteúdo**");
  });

  it("deve_dizer_que_cabe_quando_a_meta_esta_dentro_do_teto", () => {
    const folgado = { ...vars, horas: "20" };
    expect(pontosCriticos(folgado, computeScala(folgado)!)).toContain("Meta pede **40h/semana** vendendo hora");
  });

  it("deve_funcionar_com_respostas_antigas_sem_dor_nem_venda", () => {
    const antigo = { ...base };
    expect(pontosCriticos(antigo, computeScala(antigo)!)).toHaveLength(1);
  });
});

describe("precisaDe", () => {
  it("deve_seguir_a_dor_e_nao_so_o_objetivo", () => {
    // quer aumentar a renda online (objetivo de vendas), mas a dor é não atrair: conteúdo vem primeiro
    const lista = precisaDe(
      { dor: "atrair", bloqueio: "atrair", venda: "instagram_sem_constancia", objetivo: "renda_online" },
      20,
    );
    expect(lista[0]).toBe("Conteúdo que gera conversa");
  });

  it("deve_trazer_sempre_3_itens_diferentes", () => {
    const lista = precisaDe(
      { dor: "vender", bloqueio: "estrategia", venda: "processo", objetivo: "produto_digital" },
      50,
    );
    expect(lista).toHaveLength(3);
    expect(new Set(lista).size).toBe(3);
  });

  it("deve_incluir_oferta_digital_para_quem_quer_produto_digital", () => {
    const lista = precisaDe({ dor: "vender", bloqueio: "vender", venda: "campanhas", objetivo: "produto_digital" }, 20);
    expect(lista).toContain("Oferta digital que vende todo mês");
  });

  it("deve_priorizar_modelo_online_com_agenda_cheia", () => {
    expect(
      precisaDe({ dor: "agenda_cheia", bloqueio: "estrategia", venda: "processo", objetivo: "dobrar_clientes" }, 45)[0],
    ).toBe("Modelo presencial + online");
  });

  it("deve_ter_uma_resposta_padrao_sem_nenhuma_resposta", () => {
    expect(precisaDe({}, 10)).toEqual([
      "Processo de vendas previsível",
      "Conteúdo que gera conversa",
      "Posicionamento forte",
    ]);
  });
});
