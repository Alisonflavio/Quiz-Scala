import { describe, expect, it } from "vitest";
import { computeScala, diagnosticoPorResposta, scoreLevel } from "@/lib/scala";

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

describe("diagnosticoPorResposta", () => {
  const base2 = { ...base, dor: "atrair", venda: "indicacao", bloqueio: "atrair" };
  const pares = (v: Record<string, string>) => diagnosticoPorResposta(v, computeScala(v)!);

  it("deve_montar_pares_falta_e_fazer_a_partir_das_respostas", () => {
    expect(pares(base2)).toEqual([
      { falta: "Você **não atrai alunos novos**", fazer: "Criar conteúdo que atrai alunos" },
      { falta: "Você depende de **indicação**", fazer: "Atrair alunos sem depender de indicação" },
      { falta: "Meta pede **80h/semana**: não cabe", fazer: "Faturar mais sem aumentar suas horas" },
    ]);
  });

  it("deve_dizer_que_a_meta_cabe_quando_esta_dentro_do_teto", () => {
    expect(pares({ ...base2, horas: "20" }).map((p) => p.falta)).toContain("Meta pede **40h/semana** vendendo hora");
  });

  it("deve_incluir_o_bloqueio_so_quando_for_diferente_da_dor", () => {
    expect(pares({ ...base2, bloqueio: "posicionamento" })).toContainEqual({
      falta: "Falta **posicionamento e conteúdo**",
      fazer: "Definir posicionamento e conteúdo que destacam você",
    });
    expect(pares(base2)).toHaveLength(3);
  });

  it("nunca_deve_falar_de_produto_digital_se_ela_nao_escolheu_esse_objetivo", () => {
    const dores = ["atrair", "agenda_cheia", "instagram", "vender"];
    const bloqueios = ["atrair", "posicionamento", "vender", "estrategia"];
    const vendas = ["indicacao", "instagram_sem_constancia", "campanhas", "processo"];
    for (const dor of dores)
      for (const bloqueio of bloqueios)
        for (const venda of vendas) {
          const texto = JSON.stringify(pares({ ...base, dor, bloqueio, venda, objetivo: "renda_online" }));
          expect(texto).not.toMatch(/digital/i);
        }
    expect(JSON.stringify(pares({ ...base2, objetivo: "produto_digital" }))).toMatch(/digital/i);
  });

  it("deve_trazer_de_1_a_4_pares_sem_repetir_acao", () => {
    const dores = ["atrair", "agenda_cheia", "instagram", "vender"];
    const bloqueios = ["atrair", "posicionamento", "vender", "estrategia"];
    const vendas = ["indicacao", "instagram_sem_constancia", "campanhas", "processo"];
    for (const dor of dores)
      for (const bloqueio of bloqueios)
        for (const venda of vendas)
          for (const objetivo of ["renda_online", "produto_digital"]) {
            const lista = pares({ ...base, dor, bloqueio, venda, objetivo });
            expect(lista.length).toBeGreaterThanOrEqual(1);
            expect(lista.length).toBeLessThanOrEqual(4);
            expect(new Set(lista.map((p) => p.fazer)).size).toBe(lista.length);
            expect(lista.every((p) => p.falta && p.fazer)).toBe(true);
          }
  });

  it("deve_funcionar_com_respostas_antigas_sem_dor_nem_venda", () => {
    expect(pares({ ...base })).toHaveLength(1);
  });
});
