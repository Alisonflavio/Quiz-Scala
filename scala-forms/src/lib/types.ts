/* Estrutura de um formulário. Tudo fica num único JSON (rascunho e versão publicada). */

export type FieldType =
  | "welcome"
  | "name"
  | "short_text"
  | "long_text"
  | "email"
  | "phone"
  | "number"
  | "multiple_choice"
  | "thankyou";

export const FIELD_TYPES: { type: FieldType; label: string; color: string }[] = [
  { type: "welcome", label: "Boas-vindas", color: "bg-emerald-50 text-emerald-300" },
  { type: "name", label: "Nome próprio", color: "bg-indigo-50 text-indigo-300" },
  { type: "short_text", label: "Resposta curta", color: "bg-sky-50 text-sky-300" },
  { type: "long_text", label: "Resposta longa", color: "bg-sky-50 text-sky-300" },
  { type: "email", label: "E-mail", color: "bg-fuchsia-50 text-fuchsia-300" },
  { type: "phone", label: "Telefone", color: "bg-rose-50 text-rose-300" },
  { type: "number", label: "Número", color: "bg-amber-50 text-amber-300" },
  { type: "multiple_choice", label: "Múltipla escolha", color: "bg-violet-50 text-violet-300" },
  { type: "thankyou", label: "Agradecimento", color: "bg-emerald-50 text-emerald-300" },
];

export const typeLabel = (t: FieldType) => FIELD_TYPES.find((f) => f.type === t)?.label ?? t;
export const isScreen = (t: FieldType) => t === "welcome" || t === "thankyou";
export const isInput = (t: FieldType) => !isScreen(t);

export type Option = {
  id: string;
  label: string;
  /** Pontos somados na pontuação total quando esta opção é escolhida */
  points: number;
  /** Valor da variável (ex.: 4500). Se vazio, a variável recebe o texto da opção. */
  value?: string;
  /** Imagem/ilustração do card desta opção (URL). Sem imagem, o card mostra só o texto. */
  image?: string;
};

/** Faixa de pontuação para campos numéricos (tipo "number"): quando o número digitado
 *  cai em [min, max], soma "points" na pontuação total. Não afeta o valor salvo, só o score. */
export type ScoreThreshold = { min: number; max: number; points: number };

export type LogicRule =
  | { id: string; kind: "answer"; op: "is" | "is_not"; optionId: string; goTo: string }
  | { id: string; kind: "points"; min: number; max: number; goTo: string };

export type Media = { kind: "image" | "video"; url: string };

export type EndingKind = "simple" | "scala_diagnosis";

/** O que acontece depois do envio, numa tela de agradecimento (igual ao "Após o envio" do Respondi) */
export type AfterSubmit = "message" | "redirect" | "button_link" | "button_whatsapp" | "button_file";

/** Texto do botão da tela final: cada tipo guarda o seu (trocar de WhatsApp para link não leva o texto junto) */
export function endButtonLabel(f: { after?: AfterSubmit; redirectUrl?: string; buttonUrl?: string; buttonLabel?: string; whatsappLabel?: string; fileLabel?: string }) {
  const k = afterOf(f);
  if (k === "button_whatsapp") return f.whatsappLabel || "Falar no WhatsApp";
  if (k === "button_file") return f.fileLabel || "Baixar arquivo";
  return f.buttonLabel || "Continuar";
}

export const DEFAULT_WA_MESSAGE = "Olá, tudo bom? Gostaria de mais informações sobre a mentoria.";

/** Descobre o "após o envio" de telas criadas antes desse campo existir */
export function afterOf(f: { after?: AfterSubmit; redirectUrl?: string; buttonUrl?: string }): AfterSubmit {
  if (f.after) return f.after;
  if (f.redirectUrl) return "redirect";
  if (f.buttonUrl) return "button_link";
  return "message";
}

export type Field = {
  id: string;
  type: FieldType;
  title: string;
  description?: string;
  required: boolean;
  /** Nome da variável usada no webhook, nos textos ({{variavel}}) e nos resultados */
  key: string;
  placeholder?: string;
  buttonLabel?: string;
  options?: Option[];
  /** Só para campos type "number": faixas de pontuação aplicadas ao número digitado (ver ScoreThreshold). */
  scoreThresholds?: ScoreThreshold[];
  multiple?: boolean;
  shuffle?: boolean;
  sameLine?: boolean;
  allowOther?: boolean;
  logicEnabled?: boolean;
  logic?: LogicRule[];
  media?: Media | null;
  /* Só para telas de agradecimento */
  buttonUrl?: string;
  redirectUrl?: string;
  after?: AfterSubmit;
  whatsappNumber?: string;
  whatsappMessage?: string;
  whatsappLabel?: string;
  fileUrl?: string;
  fileLabel?: string;
  showScore?: boolean;
  ending?: EndingKind;
  scala?: ScalaEndingConfig;
};

export type ScalaEndingConfig = {
  whatsapp: string;
  /** Mensagem que já vem escrita no WhatsApp. Aceita {{nome}}, {{diagnostico}}, {{utm_source}}... */
  whatsappMessage?: string;
  videoUrl: string;
  videoPoster: string;
  /** não é mais exibida (tirada para reduzir ruído); mantida para formulários antigos */
  proofImage?: string;
};

export type Theme = {
  buttonColor: string;
  questionColor: string;
  answerColor: string;
  bgColor: string;
  bgImage: string;
  logo: string;
  logoPosition: "left" | "center" | "right";
  font: string;
  radius: number;
};

export type TemperatureRules = {
  enabled: boolean;
  /** Pontuação até este valor = frio */
  coldMax: number;
  /** Pontuação até este valor = morno. Acima = quente */
  warmMax: number;
};

export type Settings = {
  temperature: TemperatureRules;
  saveUtm: boolean;
  utmOnLinks: boolean;
  limitDuplicateFieldId: string;
  blocked: boolean;
  share: { title: string; description: string; image: string };
  integrationsTrigger: "complete" | "all";
  webhook: { enabled: boolean; url: string; format?: "padrao" | "respondi" };
  sheets: { enabled: boolean; url: string };
  facebookPixel: { enabled: boolean; id: string };
  gtm: { enabled: boolean; id: string };
  ga: { enabled: boolean; id: string };
  tiktok: { enabled: boolean; id: string };
  conversion: { mode: "complete" | "field"; fieldId: string };
};

export type FormDoc = {
  fields: Field[];
  theme: Theme;
  settings: Settings;
};

export type Temperature = "frio" | "morno" | "quente";

export type ResponseRow = {
  id: string;
  form_id: string;
  number: number;
  status: "partial" | "complete";
  answers: Record<string, AnswerValue>;
  score: number;
  temperature: Temperature | null;
  temperature_manual: Temperature | null;
  ending_id: string | null;
  utm: Record<string, string>;
  meta: Record<string, unknown>;
  webhook_log: { at: string; target: string; ok: boolean; status?: number; error?: string }[];
  created_at: string | Date;
  updated_at: string | Date;
  completed_at: string | Date | null;
};

/** Resposta de um campo: texto, ou lista de ids de opções (múltipla escolha) + texto livre de "outros" */
export type AnswerValue = string | { options: string[]; other?: string };

export const DEFAULT_THEME: Theme = {
  buttonColor: "#FF642A",
  questionColor: "#FFFFFF",
  answerColor: "#FFFFFF",
  bgColor: "#0E0E0E",
  bgImage: "",
  logo: "",
  logoPosition: "center",
  font: "Montserrat",
  radius: 12,
};

export const DEFAULT_SETTINGS: Settings = {
  temperature: { enabled: true, coldMax: 40, warmMax: 70 },
  saveUtm: true,
  utmOnLinks: true,
  limitDuplicateFieldId: "",
  blocked: false,
  share: { title: "", description: "", image: "" },
  integrationsTrigger: "complete",
  webhook: { enabled: false, url: "" },
  sheets: { enabled: false, url: "" },
  facebookPixel: { enabled: false, id: "" },
  gtm: { enabled: false, id: "" },
  ga: { enabled: false, id: "" },
  tiktok: { enabled: false, id: "" },
  conversion: { mode: "complete", fieldId: "" },
};

export const FONTS = [
  "Montserrat", "Inter", "Poppins", "Roboto", "Open Sans", "Lato", "Raleway", "Nunito",
  "Oswald", "Playfair Display", "Merriweather", "Work Sans", "DM Sans", "Manrope",
  "Rubik", "Barlow", "Archivo", "Sora", "Outfit", "Space Grotesk",
];
