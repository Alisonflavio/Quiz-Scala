import { describe, expect, it } from "vitest";
import { computeScala, scoreLevel } from "@/lib/scala";

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
