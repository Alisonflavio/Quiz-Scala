/* Fábrica de campos e modelos de formulário (em branco e Diagnóstico Scala). */
import { nanoid } from "nanoid";
import { DEFAULT_SETTINGS, DEFAULT_THEME, type Field, type FieldType, type FormDoc, type Option } from "./types";

export const uid = () => nanoid(8);

export const SCALA_WA_MESSAGE =
  "Olá, tudo bom? Fiz o diagnóstico da Scala Fitness e gostaria de mais informações sobre a mentoria. Sou {{nome}} ({{insta}}) e meu diagnóstico foi: {{diagnostico}}.";

/** Cria um campo novo do tipo pedido, com título/chave padrão; `index` numera a chave genérica (`campo_N`). */
export function newField(type: FieldType, index = 0): Field {
  const base: Field = { id: uid(), type, title: "", required: true, key: `campo_${index + 1}` };
  switch (type) {
    case "welcome":
      return { ...base, key: "", required: false, title: "Bem-vindo(a)!", description: "", buttonLabel: "Começar" };
    case "thankyou":
      return { ...base, key: "", required: false, title: "Obrigado por responder!", description: "", ending: "simple" };
    case "name":
      return { ...base, key: "nome", title: "Qual é o seu nome?", placeholder: "Seu nome" };
    case "email":
      return { ...base, key: "email", title: "Qual é o seu e-mail?", placeholder: "seu@email.com" };
    case "phone":
      return { ...base, key: "telefone", title: "Qual é o seu telefone com DDD?", placeholder: "(11) 99999-9999" };
    case "multiple_choice":
      return {
        ...base,
        title: "Nova pergunta",
        options: [
          { id: uid(), label: "Opção 1", points: 0 },
          { id: uid(), label: "Opção 2", points: 0 },
        ],
      };
    default:
      return { ...base, title: "Nova pergunta", placeholder: "Digite sua resposta" };
  }
}

/** Formulário inicial: boas-vindas, nome e agradecimento. */
export function blankForm(): FormDoc {
  return {
    fields: [newField("welcome"), newField("name", 1), newField("thankyou")],
    theme: { ...DEFAULT_THEME },
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}

const opts = (list: [string, number, string?][]): Option[] =>
  list.map(([label, points, value]) => ({ id: uid(), label, points, value }));

/** Modelo do Diagnóstico de Carreira da Mentoria Scala Fitness (mesmas perguntas e pesos do Respondi) */
export function scalaTemplate(): FormDoc {
  const fields: Field[] = [
    {
      id: uid(),
      type: "welcome",
      key: "",
      required: false,
      title: "Descubra o que trava a sua carreira como Personal Trainer",
      description: "Diagnóstico gratuito em 2 minutos.",
      buttonLabel: "Fazer meu diagnóstico",
      media: { kind: "image", url: "/scala/selo-orange.svg" },
    },
    /* ===== Etapa 1 — quiz: dor, desejo, bloqueio e venda. Cards visuais (2 colunas), com espaço pra imagem por opção. ===== */
    {
      id: uid(),
      type: "multiple_choice",
      key: "dor",
      required: true,
      media: { kind: "image", url: "/quiz/trava.webp" },
      sameLine: true,
      title: "O que mais trava o seu crescimento hoje?",
      options: opts([
        ["Não consigo atrair novos clientes", 0, "atrair"],
        ["Minha agenda até enche, mas meu faturamento não cresce", 0, "agenda_cheia"],
        ["Meu Instagram não vende", 0, "instagram"],
        ["Dificuldade para cobrar mais", 0, "vender"],
      ]),
    },
    {
      id: uid(),
      type: "multiple_choice",
      key: "resultado",
      required: true,
      media: { kind: "image", url: "/quiz/resultado.webp" },
      sameLine: true,
      title: "Qual resultado você quer em 12 meses?",
      options: opts([
        ["Agenda cheia de clientes", 0, "agenda_cheia"],
        ["Dobrar meu faturamento", 0, "dobrar_faturamento"],
        ["Viver de consultoria online", 0, "online"],
        ["Virar referência no mercado", 0, "referencia"],
      ]),
    },
    {
      id: uid(),
      type: "multiple_choice",
      key: "bloqueio",
      required: true,
      media: { kind: "image", url: "/quiz/falta.png" },
      sameLine: true,
      title: "O que mais falta pra chegar lá?",
      options: opts([
        ["Atrair clientes certos", 0, "atrair"],
        ["Posicionamento e conteúdo", 0, "posicionamento"],
        ["Vender melhor", 0, "vender"],
        ["Estratégia pra escalar", 0, "estrategia"],
      ]),
    },
    {
      id: uid(),
      type: "multiple_choice",
      key: "venda",
      required: true,
      sameLine: true,
      title: "Como você vende hoje?",
      options: opts([
        ["Indicação / boca a boca", 0, "indicacao"],
        ["Instagram, mas sem constância", 0, "instagram_sem_constancia"],
        ["Já faço campanhas e ações", 0, "campanhas"],
        ["Já tenho processo, quero escalar", 0, "processo"],
      ]),
    },
    /* ===== Etapa 2 — qualificação ===== */
    {
      id: uid(),
      type: "multiple_choice",
      key: "area",
      required: true,
      title: "Qual é a sua área de atuação?",
      options: opts([
        ["Personal Trainer", 0],
        ["Educador Físico", 0],
        ["Treinador Esportivo", 0],
        ["Outra área relacionada", 0],
      ]),
    },
    {
      id: uid(),
      type: "multiple_choice",
      key: "renda",
      required: true,
      title: "Qual sua renda mensal hoje?",
      description: "Some presencial e online.",
      options: opts([
        ["Menos de R$ 3.000", 0, "2000"],
        ["Entre R$ 3.000 e R$ 6.000", 15, "4500"],
        ["Entre R$ 6.000 e R$ 10.000", 30, "8000"],
        ["Acima de R$ 10.000", 40, "14000"],
      ]),
    },
    {
      id: uid(),
      type: "multiple_choice",
      key: "aumento",
      required: true,
      title: "Quanto a mais você quer faturar por mês?",
      options: opts([
        ["Até R$ 3.000 a mais", 5, "2500"],
        ["Entre R$ 3.000 e R$ 6.000 a mais", 10, "4500"],
        ["Entre R$ 6.000 e R$ 10.000 a mais", 15, "8000"],
        ["Acima de R$ 10.000 a mais", 20, "15000"],
      ]),
    },
    {
      id: uid(),
      type: "multiple_choice",
      key: "horas",
      required: true,
      title: "Quantas horas por semana você atende?",
      description: "Sem contar deslocamento.",
      options: opts([
        ["Menos de 20 horas", 0, "15"],
        ["20 a 35 horas", 0, "28"],
        ["35 a 50 horas", 0, "43"],
        ["Mais de 50 horas", 0, "55"],
      ]),
    },
    {
      id: uid(),
      type: "multiple_choice",
      key: "objetivo",
      required: true,
      title: "Qual seu maior objetivo em 12 meses?",
      options: opts([
        ["Aumentar a renda online", 10, "renda_online"],
        ["Aumentar o número de clientes", 8, "dobrar_clientes"],
        ["Criar um produto digital", 10, "produto_digital"],
        ["Crescer nas redes sociais", 5, "presenca_redes"],
      ]),
    },
    {
      id: uid(),
      type: "short_text",
      key: "insta",
      required: true,
      media: { kind: "image", url: "/quiz/insta.png" },
      title: "Qual o @ da sua rede principal?",
      placeholder: "@seuusuario",
    },
    /* A pergunta "você teria 20 minutos pra conversar com um especialista" foi retirada daqui:
     * pedir esse compromisso antes da pessoa ver o próprio diagnóstico é pedir cedo demais, e
     * hoje esse mesmo sinal já existe de forma melhor (comportamental, não autodeclarada) no
     * clique em "Ver a solução" e no clique do botão de WhatsApp na tela de resultado. */
    /* ===== Etapa 3 — liberação do diagnóstico: só agora pede os dados pessoais ===== */
    {
      id: uid(),
      type: "welcome",
      key: "",
      required: false,
      title: "Seu diagnóstico está quase pronto.",
      description: "Só faltam seus dados.",
      buttonLabel: "Continuar",
    },
    { id: uid(), type: "name", key: "nome", required: true, title: "Qual é o seu nome?", placeholder: "Seu nome" },
    {
      id: uid(),
      type: "phone",
      key: "whatsapp",
      required: true,
      title: "Qual seu WhatsApp?",
      description: "Pra enviar seu diagnóstico.",
      placeholder: "(11) 99999-9999",
    },
    {
      id: uid(),
      type: "email",
      key: "email",
      required: true,
      title: "Qual seu e-mail?",
      placeholder: "seu@email.com",
      buttonLabel: "Ver meu diagnóstico",
    },
    {
      id: uid(),
      type: "thankyou",
      key: "",
      required: false,
      ending: "scala_diagnosis",
      title: "Seu diagnóstico",
      description: "",
      scala: {
        whatsapp: "",
        whatsappMessage: SCALA_WA_MESSAGE,
        videoUrl: "/scala/depoimento-reinaldo.mp4",
        videoPoster: "/scala/depoimento-reinaldo-poster.jpg",
      },
    },
  ];
  return {
    fields,
    theme: {
      ...DEFAULT_THEME,
      logo: "/scala/logo-horizontal-orange.svg",
      bgColor: "#000000",
      questionColor: "#FFFFFF",
    },
    settings: {
      ...structuredClone(DEFAULT_SETTINGS),
      // Recalibrado depois de tirar a pergunta de disponibilidade: pontuação máxima possível
      // caiu de 100 (renda 40 + aumento 20 + objetivo 10 + disponibilidade 30) pra 70 (sem ela).
      // Mantendo a mesma proporção de antes (frio até 40%, morno até 70%).
      temperature: { enabled: true, coldMax: 28, warmMax: 49 },
      share: {
        title: "Diagnóstico de Carreira | Scala Fitness",
        description: "Descubra em que nível você está hoje como Personal Trainer.",
        image: "",
      },
    },
  };
}
