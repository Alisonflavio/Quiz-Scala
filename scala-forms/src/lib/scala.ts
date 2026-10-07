/*
 * Diagnóstico Scala Fitness.
 * Estrutura de venda high ticket: problema concreto (a partir das respostas) → a mentoria como solução.
 * Aponta O QUE a pessoa precisa e O QUE a mentoria entrega; o "como fazer" fica para a conversa com o especialista.
 */

export type Diagnosis = {
  key: "vendas" | "escalar" | "produto" | "posicionamento" | "conteudo";
  /** Área do especialista que a pessoa precisa (vai no título e no webhook) */
  area: string;
  /** O gargalo em uma frase curta */
  gargalo: string;
  /** 3 ações de uma linha cada: só O QUE fazer, sem o detalhe de como (isso fica pra conversa) */
  acoes: string[];
  /** O desejo, em poucas palavras (completa "dá para ...") */
  desejo: string;
  /** Qual entregável resolve primeiro o caso dela */
  entregavel: number;
};

export const DIAGNOSES: Record<Diagnosis["key"], Diagnosis> = {
  vendas: {
    key: "vendas",
    area: "Vendas",
    gargalo: "O interesse não vira venda.",
    acoes: ["Roteiro de venda pro WhatsApp", "Gerar conversas novas toda semana", "Usar prova social na venda"],
    desejo: "ter alunos novos todo mês",
    entregavel: 2,
  },
  escalar: {
    key: "escalar",
    area: "escalar o seu negócio",
    gargalo: "Renda presa às suas horas.",
    acoes: ["Levar atendimentos pro online", "Modelo presencial + online", "Precificar o online"],
    desejo: "ganhar mais sem mais horas",
    entregavel: 3,
  },
  produto: {
    key: "produto",
    area: "Produto Digital",
    gargalo: "Falta vender todo mês.",
    acoes: ["Definir a oferta antes do produto", "Montar vendas recorrentes", "Validar com um grupo pequeno"],
    desejo: "vender um produto digital todo mês",
    entregavel: 1,
  },
  posicionamento: {
    key: "posicionamento",
    area: "Posicionamento",
    gargalo: "Você parece igual aos outros.",
    acoes: ["Definir uma especialidade", "Deixar a bio clara em 3 segundos", "Mostrar resultados de alunos"],
    desejo: "ser o personal mais procurado",
    entregavel: 1,
  },
  conteudo: {
    key: "conteudo",
    area: "Conteúdo que vende",
    gargalo: "Conteúdo não puxa conversa.",
    acoes: ["Fazer mais carrosséis", "Mostrar o problema que resolve", "Responder rápido quem chama"],
    desejo: "atrair alunos pelo Instagram",
    entregavel: 1,
  },
};

/** O que a mentoria entrega (ficha oficial do produto), em uma linha cada */
export const ENTREGAVEIS = [
  "Aulas dos 3 pilares do método",
  "Modelos de perfil e conteúdo",
  "Roteiros de venda pro WhatsApp",
  "Lives e acompanhamento",
];

export const TETO_HORAS = 60;

export const brl = (n: number) => "R$ " + Math.round(n).toLocaleString("pt-BR");

export type ScalaResult = {
  renda: number;
  aumento: number;
  horas: number;
  meta: number;
  objetivo: string;
  diagnosis: Diagnosis;
  rateHour: number;
  hoursNeeded: number;
  fits: boolean;
  /** "Especialista em Vendas" */
  label: string;
  pct: number;
  pctMeta: number;
  /** Score de carreira de 0 a 100 (baixo = situação ruim), calculado de 4 respostas */
  score: number;
};

export function computeScala(vars: Record<string, string>): ScalaResult | null {
  const renda = Number(vars.renda),
    aumento = Number(vars.aumento),
    horas = Number(vars.horas);
  // só valores finitos e positivos: negativo ou infinito zera a meta e quebra os percentuais (NaN/Infinity)
  if (![renda, aumento, horas].every((n) => Number.isFinite(n) && n > 0)) return null;
  const objetivo = vars.objetivo || "renda_online";
  const meta = renda + aumento;
  const agendaCheia = horas >= 35;
  // o objetivo decide a área; quem quer mais clientes com a agenda cheia precisa escalar, não de mais clientes
  const key: Diagnosis["key"] =
    objetivo === "produto_digital"
      ? "produto"
      : objetivo === "presenca_redes"
        ? "conteudo"
        : objetivo === "dobrar_clientes"
          ? agendaCheia
            ? "escalar"
            : "posicionamento"
          : "vendas";
  const diagnosis = DIAGNOSES[key];
  const hoursNeeded = (horas * meta) / renda;
  return {
    renda,
    aumento,
    horas,
    meta,
    objetivo,
    diagnosis,
    rateHour: renda / (horas * 4.3),
    hoursNeeded,
    fits: hoursNeeded <= TETO_HORAS,
    label: `Especialista em ${diagnosis.area}`,
    pct: Math.min(100, Math.round((horas / TETO_HORAS) * 100)),
    pctMeta: Math.min(100, Math.round((renda / meta) * 100)),
    score: careerScore(renda, horas, meta, vars.venda),
  };
}

/* Score de carreira (0–100, quanto menor pior). Soma 4 coisas que a própria pessoa respondeu:
 * como vende (até 30), renda atual (até 25), horas atendendo (até 20, menos horas = mais livre)
 * e quão perto a renda já está da meta (até 25). */
const VENDA_PTS: Record<string, number> = { indicacao: 5, instagram_sem_constancia: 12, campanhas: 22, processo: 30 };
function careerScore(renda: number, horas: number, meta: number, venda?: string) {
  const vendas = VENDA_PTS[venda ?? ""] ?? 12;
  const rendaPts = renda >= 14000 ? 25 : renda >= 8000 ? 18 : renda >= 4500 ? 10 : 4;
  const tempo = horas >= 55 ? 2 : horas >= 43 ? 7 : horas >= 28 ? 14 : 20;
  const alvo = Math.round((renda / meta) * 25);
  return Math.max(5, Math.min(100, vendas + rendaPts + tempo + alvo));
}

/*
 * O que falta e o que fazer, em pares montados com as respostas da própria pessoa: cada problema que ela
 * mostrou (dor, forma de vender, horas, bloqueio, produto digital) vira uma linha do que falta e, na mesma
 * posição, a ação que resolve aquela linha. Textos de uma linha; **assim** marca o trecho em destaque.
 * Nada entra sem uma resposta que justifique: quem não marcou algo sobre produto digital não vê isso.
 */
export type Par = { falta: string; fazer: string };

const POR_DOR: Record<string, Par> = {
  atrair: { falta: "Você **não atrai alunos novos**", fazer: "Criar conteúdo que atrai alunos" },
  agenda_cheia: { falta: "Agenda cheia, **faturamento parado**", fazer: "Valorizar seu tempo e faturar mais" },
  instagram: { falta: "Seu Instagram **não vira venda**", fazer: "Transformar seguidores em conversas de venda" },
  vender: { falta: "**Dificuldade para cobrar mais**", fazer: "Vender com segurança e cobrar mais" },
};
const POR_VENDA: Record<string, Par> = {
  indicacao: { falta: "Você depende de **indicação**", fazer: "Atrair alunos sem depender de indicação" },
  instagram_sem_constancia: { falta: "Instagram **sem constância**", fazer: "Postar com constância e estratégia" },
  campanhas: { falta: "Ações **sem processo que se repita**", fazer: "Montar um processo de vendas que se repita" },
  processo: { falta: "Processo **preso às suas horas**", fazer: "Tirar o processo da dependência das suas horas" },
};
const POR_BLOQUEIO: Record<string, Par> = {
  atrair: { falta: "Falta **atrair os alunos certos**", fazer: "Atrair os alunos certos" },
  posicionamento: {
    falta: "Falta **posicionamento e conteúdo**",
    fazer: "Definir posicionamento e conteúdo que destacam você",
  },
  vender: { falta: "Falta **vender melhor**", fazer: "Vender melhor para quem já chama" },
  estrategia: { falta: "Falta **estratégia para escalar**", fazer: "Montar uma estratégia para escalar" },
};
const PRODUTO_DIGITAL: Par = {
  falta: "**Sem produto digital** que vende todo mês",
  fazer: "Montar uma oferta digital que vende todo mês",
};

/** De 1 a 4 pares falta/fazer, do mais importante ao menos, só com o que a pessoa respondeu */
export function diagnosticoPorResposta(vars: Record<string, string>, r: ScalaResult): Par[] {
  const lista: (Par | undefined)[] = [POR_DOR[vars.dor ?? ""], POR_VENDA[vars.venda ?? ""]];
  const h = Math.round(r.hoursNeeded);
  lista.push({
    falta: r.fits ? `Meta pede **${h}h/semana** vendendo hora` : `Meta pede **${h}h/semana**: não cabe`,
    fazer: "Faturar mais sem aumentar suas horas",
  });
  // o bloqueio só entra se for um problema diferente da dor que ela já marcou ("atrair" e "vender" repetiriam a dor)
  if (vars.bloqueio !== vars.dor) lista.push(POR_BLOQUEIO[vars.bloqueio ?? ""]);
  if (vars.objetivo === "produto_digital") lista.push(PRODUTO_DIGITAL);
  return lista.filter((p): p is Par => !!p).slice(0, 4);
}

/** Rótulo e cor do score: vermelho (crítico) → laranja → âmbar → verde */
export function scoreLevel(score: number): { label: string; color: string } {
  if (score < 40) return { label: "Crítico", color: "#FF4D4D" };
  if (score < 60) return { label: "Baixo", color: "#FF8A3D" };
  if (score < 80) return { label: "Médio", color: "#FFC247" };
  return { label: "Bom", color: "#2FBF71" };
}
