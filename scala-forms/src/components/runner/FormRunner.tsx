"use client";
import { safeUrl } from "@/lib/safe-url";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MediaView } from "@/components/editor/FieldPreview";
import { UTM_KEYS, computeScore, interpolate, nextFieldId, validateAnswer, variables } from "@/lib/engine";
import { LETTERS, alpha, background, fontHref, onColor } from "@/lib/theme";
import { DEFAULT_WA_MESSAGE, afterOf, endButtonLabel, type AnswerValue, type Field, type FormDoc } from "@/lib/types";
import { comImagemPadrao } from "@/lib/quiz-images";
import PhoneInput from "./PhoneInput";
import ScalaDiagnosis from "./ScalaDiagnosis";
import { loadTrackers, trackConversion, trackEvent } from "./trackers";

type Props = { formId: string; doc: FormDoc; preview: boolean };

function readUtm() {
  const out: Record<string, string> = {};
  if (typeof window === "undefined") return out;
  const qs = new URLSearchParams(location.search);
  for (const k of UTM_KEYS) {
    let v = qs.get(k);
    try {
      if (v) sessionStorage.setItem(`sf_${k}`, v);
      else v = sessionStorage.getItem(`sf_${k}`);
    } catch {}
    if (v) out[k] = v;
  }
  return out;
}

function shuffled<T>(arr: T[], seed: string) {
  // embaralha de forma estável por pessoa (não muda a cada renderização)
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) | 0;
    const j = Math.abs(h) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Fundo com degradê laranja sutil + grade de pontinhos, baseado na referência que o usuário
 * mandou (um brilho suave vindo de um canto, com pontinhos aparecendo mais perto do brilho),
 * só que laranja em vez de azul, e se deslocando devagar de um lado pro outro. */
function AnimatedBackdrop({ acc }: { acc: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="sf-glow absolute"
        style={{
          inset: "-25%",
          background: `radial-gradient(ellipse 55% 48% at 78% 22%, rgba(255,190,140,0.45) 0%, ${alpha(acc, 0.32)} 25%, ${alpha(acc, 0.14)} 50%, transparent 75%)`,
        }}
      />
      <div
        className="sf-dots absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,.35) 1.2px, transparent 1.2px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse 65% 55% at 78% 22%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 65% 55% at 78% 22%, black, transparent 75%)",
        }}
      />
      <style>{`
        @keyframes sfDrift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-4%, 2.5%); } }
        .sf-glow, .sf-dots { animation: sfDrift 11s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

/* Tela de "carregando o diagnóstico": aparece só na transição pro resultado (scala_diagnosis),
 * pra dar a sensação de que a gente está processando as respostas da pessoa antes de mostrar o
 * resultado — a logo redonda (mesma da tela de boas-vindas) com um anel girando em volta, e
 * frases trocando embaixo. */
const LOADING_MS = 2400;
const LOADING_MESSAGES = [
  "Lendo suas respostas...",
  "Identificando onde você está travando...",
  "Montando o seu passo a passo...",
  "Quase lá...",
];
function LoadingReveal({ acc, color }: { acc: string; color: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setI((v) => Math.min(v + 1, LOADING_MESSAGES.length - 1)),
      LOADING_MS / LOADING_MESSAGES.length,
    );
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-7 px-6 text-center">
      <div className="relative h-28 w-28">
        <div className="absolute inset-0 rounded-full border-4" style={{ borderColor: alpha(color, 0.15) }} />
        <div
          className="absolute inset-0 animate-spin rounded-full border-4 border-transparent"
          style={{ borderTopColor: acc, animationDuration: "0.9s" }}
        />
        <img
          src="/scala/selo-orange.svg"
          alt=""
          className="absolute inset-3 h-[calc(100%-24px)] w-[calc(100%-24px)] rounded-full object-contain"
        />
      </div>
      <p className="sf-in text-base" key={i} style={{ color: alpha(color, 0.75) }}>
        {LOADING_MESSAGES[i]}
      </p>
      <style>{`.sf-in{animation:sfin .35s ease}@keyframes sfin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

export default function FormRunner({ formId, doc, preview }: Props) {
  const t = doc.theme;
  const s = doc.settings;
  const [currentId, setCurrentId] = useState(doc.fields[0]?.id ?? "");
  const [revealing, setRevealing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState("");
  const [fatal, setFatal] = useState("");
  const [finished, setFinished] = useState(false);
  const responseId = useRef<string | undefined>(undefined);
  const [savedId, setSavedId] = useState<string | undefined>(undefined);
  const converted = useRef(false);
  // UTMs do link (ou guardadas na sessão, se a pessoa navegou antes de chegar aqui)
  const [utm] = useState<Record<string, string>>(readUtm);
  const [seed] = useState(() => Math.random().toString(36));

  const field = doc.fields.find((f) => f.id === currentId);
  const vars = useMemo(() => variables(doc, answers), [doc, answers]);
  const inputs = doc.fields.filter((f) => f.type !== "welcome" && f.type !== "thankyou");
  const progress =
    field?.type === "thankyou" || finished
      ? 1
      : Math.max(
          0,
          inputs.findIndex((f) => f.id === currentId),
        ) / Math.max(1, inputs.length);

  useEffect(() => {
    if (!preview) loadTrackers(s);
  }, [preview, s]);

  const send = useCallback(
    async (ans: Record<string, AnswerValue>, complete: boolean, endingId: string | null) => {
      if (preview) return true;
      try {
        const res = await fetch(`/api/f/${formId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ responseId: responseId.current, answers: ans, complete, endingId, utm: utm }),
          keepalive: true,
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 409 && data.error === "duplicate") {
          setFatal("Você já respondeu este formulário. Obrigado!");
          return false;
        }
        if (!res.ok) return !complete; // falha no parcial não trava a pessoa
        if (data.responseId) {
          responseId.current = data.responseId;
          setSavedId(data.responseId);
        }
        return true;
      } catch {
        return !complete;
      }
    },
    [formId, preview, utm],
  );

  // os envios vão em fila: o segundo só sai depois que o primeiro devolveu o id da resposta (evita duplicar)
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const save = useCallback(
    (ans: Record<string, AnswerValue>, complete: boolean, endingId: string | null): Promise<boolean> => {
      const run = queue.current.then(() => send(ans, complete, endingId));
      queue.current = run.catch(() => {});
      return run;
    },
    [send],
  );

  const convert = useCallback(() => {
    if (converted.current || preview) return;
    converted.current = true;
    trackConversion(s, { form_id: formId });
  }, [formId, preview, s]);

  const goTo = useCallback(
    async (fromId: string, ans: Record<string, AnswerValue>) => {
      const nxt = nextFieldId(doc, fromId, ans);
      const nxtField = doc.fields.find((f) => f.id === nxt);
      const ending = !nxtField || nxtField.type === "thankyou";
      if (ending) {
        const ok = await save(ans, true, nxtField?.id ?? null);
        if (!ok) return;
        if (s.conversion.mode === "complete") convert();
        setFinished(true);
      } else if (Object.keys(ans).length > 0) {
        void save(ans, false, null); // parcial: guarda quem abandona no meio
      }
      if (nxtField) {
        if (s.conversion.mode === "field" && s.conversion.fieldId === nxtField.id) convert();
        setHistory((h) => [...h, fromId]);
        const isDiagnosis = nxtField.type === "thankyou" && nxtField.ending === "scala_diagnosis";
        window.scrollTo({ top: 0 });
        if (isDiagnosis) {
          // mostra "carregando o diagnóstico" antes de revelar o resultado
          setRevealing(true);
          setTimeout(() => {
            setCurrentId(nxtField.id);
            setError("");
            setRevealing(false);
            window.scrollTo({ top: 0 });
          }, LOADING_MS);
        } else {
          setCurrentId(nxtField.id);
          setError("");
        }
      }
    },
    [convert, doc, s.conversion, save],
  );

  const submit = (value?: AnswerValue) => {
    if (!field) return;
    const v = value !== undefined ? value : answers[field.id];
    const err = field.type === "welcome" ? "" : validateAnswer(field, v);
    if (err) return setError(err);
    const ans = value !== undefined ? { ...answers, [field.id]: value } : answers;
    if (value !== undefined) setAnswers(ans);
    void goTo(field.id, ans);
  };

  const back = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setCurrentId(prev);
    setError("");
  };

  const withUtm = useCallback(
    (url: string) => {
      if (!s.utmOnLinks || !Object.keys(utm).length) return url;
      try {
        const u = new URL(url);
        for (const [k, v] of Object.entries(utm)) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
        return u.toString();
      } catch {
        return url;
      }
    },
    [s.utmOnLinks, utm],
  );

  /* botões da tela final: link, WhatsApp com mensagem padrão, arquivo */
  const endAction = useCallback(
    (f: Field) => {
      const all = { ...vars, ...utm }; // UTMs também viram variáveis (ex.: {{utm_campaign}})
      const kind = afterOf(f);
      const event = (name: string) => {
        if (preview || !responseId.current) return;
        void fetch(`/api/f/${formId}/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ responseId: responseId.current, event: name }),
          keepalive: true,
        });
      };
      if (kind === "button_whatsapp" && f.whatsappNumber) {
        const text = interpolate(f.whatsappMessage ?? DEFAULT_WA_MESSAGE, all).trim();
        event("clicou_whatsapp");
        if (!preview) trackEvent(s, "Contact");
        window.open(
          `https://wa.me/${f.whatsappNumber}${text ? `?text=${encodeURIComponent(text)}` : ""}`,
          "_blank",
          "noopener",
        );
      } else if (kind === "button_file" && f.fileUrl) {
        event("baixou_arquivo");
        const file = safeUrl(f.fileUrl);
        if (file) window.open(file, "_blank", "noopener");
      } else if (kind === "button_link" && f.buttonUrl) {
        event("clicou_botao");
        const link = safeUrl(withUtm(interpolate(f.buttonUrl, all)));
        if (link) location.href = link;
      }
    },
    [formId, preview, s, utm, vars, withUtm],
  );

  /* redirecionamento automático da tela final */
  useEffect(() => {
    if (field?.type !== "thankyou" || afterOf(field) !== "redirect" || !field.redirectUrl || preview) return;
    const url = safeUrl(withUtm(interpolate(field.redirectUrl, { ...vars, ...utm })));
    if (!url) return;
    const tm = setTimeout(() => (location.href = url), 2500);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field?.id]);

  const logoAlign = t.logoPosition === "left" ? "mr-auto" : t.logoPosition === "right" ? "ml-auto" : "mx-auto";
  const style: React.CSSProperties = {
    background: background(t),
    fontFamily: `"${t.font}", system-ui, sans-serif`,
    color: t.answerColor,
  };

  if (revealing) {
    return (
      <div style={style} className="min-h-dvh isolate">
        <link rel="stylesheet" href={fontHref(t.font)} />
        <AnimatedBackdrop acc={t.buttonColor} />
        <LoadingReveal acc={t.buttonColor} color={t.answerColor} />
      </div>
    );
  }

  if (fatal) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center text-xl" style={style}>
        <link rel="stylesheet" href={fontHref(t.font)} />
        {fatal}
      </main>
    );
  }

  if (field?.type === "thankyou" && field.ending === "scala_diagnosis") {
    return (
      <div style={style} className="min-h-dvh isolate">
        <link rel="stylesheet" href={fontHref(t.font)} />
        <AnimatedBackdrop acc={t.buttonColor} />
        {preview && <PreviewBar />}
        <ScalaDiagnosis
          doc={doc}
          field={field}
          vars={vars}
          utm={utm}
          responseId={savedId}
          formId={formId}
          preview={preview}
        />
      </div>
    );
  }

  return (
    <div style={style} className="flex min-h-dvh flex-col isolate">
      <link rel="stylesheet" href={fontHref(t.font)} />
      <AnimatedBackdrop acc={t.buttonColor} />
      {preview && <PreviewBar />}
      {field?.type !== "welcome" && (
        <div className="fixed left-0 top-0 z-10 h-1 w-full" style={{ background: alpha(t.answerColor, 0.12) }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progress * 100}%`, background: t.buttonColor }}
          />
        </div>
      )}
      <div className="px-5 pt-8 sm:px-10">
        {t.logo && <img src={t.logo} alt="" className={`${logoAlign} h-8 max-w-[220px] object-contain sm:h-9`} />}
      </div>
      <main className="flex flex-1 items-center px-5 py-10 sm:px-10">
        {field ? (
          <div key={field.id} className="sf-in mx-auto w-full max-w-2xl">
            <FieldView
              field={comImagemPadrao(doc, field)}
              theme={t}
              vars={vars}
              value={answers[field.id]}
              error={error}
              seed={seed}
              onChange={(v) => {
                setAnswers((a) => ({ ...a, [field.id]: v }));
                setError("");
              }}
              onSubmit={submit}
              score={computeScore(doc, answers)}
              onEndAction={endAction}
              onBack={back}
              canBack={history.length > 0}
            />
          </div>
        ) : (
          <div className="mx-auto text-xl">Obrigado!</div>
        )}
      </main>
      <style>{`.sf-in{animation:sfin .35s ease}@keyframes sfin{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

function EndButton({ f, btn, onClick }: { f: Field; btn: React.CSSProperties; onClick: () => void }) {
  const kind = afterOf(f);
  const ready =
    (kind === "button_link" && f.buttonUrl) ||
    (kind === "button_whatsapp" && f.whatsappNumber) ||
    (kind === "button_file" && f.fileUrl);
  if (!ready) return null;
  const wa = kind === "button_whatsapp";
  return (
    <div className="mt-10">
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2.5 px-9 py-4 text-lg font-semibold shadow-lg transition hover:brightness-110"
        style={wa ? { ...btn, background: "#25D366", color: "#fff" } : btn}
      >
        {wa && (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z" />
          </svg>
        )}
        {kind === "button_file" && "⤓ "}
        {endButtonLabel(f)}
      </button>
    </div>
  );
}

function PreviewBar() {
  return (
    <div className="sticky top-0 z-20 bg-amber-400 px-4 py-1.5 text-center text-sm font-medium text-black">
      Pré-visualização do rascunho: as respostas não são salvas.
    </div>
  );
}

/* Botão de entrada do diagnóstico (só a 1ª tela, sem histórico de navegação ainda). Uma luz
 * percorre a borda em loop, desenhada com SVG (não CSS conic-gradient): assim ela anda pelo
 * contorno de verdade, em velocidade constante, sem distorcer nos cantos ou no lado mais comprido
 * de um botão retangular. Mede o próprio tamanho via ResizeObserver pra desenhar o retângulo certo.
 * No hover (só desktop): pulsa pra frente e troca de laranja pra preto (texto vira laranja). */
function EntryButton({
  label,
  acc,
  color,
  radius,
  onClick,
}: {
  label: string;
  acc: string;
  color: string;
  radius: number;
  onClick: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const stroke = 3;
  const { w, h } = size;
  const r = Math.max(0, Math.min(radius, h / 2) - stroke / 2);
  const perimeter = w && h ? 2 * (w - 2 * r - stroke) + 2 * (h - 2 * r - stroke) + 2 * Math.PI * r : 0;
  const dash = perimeter * 0.32;
  const raceColor = "#361509"; // cor escolhida pelo Alison
  return (
    <div ref={ref} className="sf-entry-wrap relative mt-10 inline-block">
      <button
        onClick={onClick}
        className="sf-entry-btn relative block px-9 py-4 text-lg font-semibold shadow-lg transition"
        style={{ background: acc, color, borderRadius: radius }}
      >
        {label}
      </button>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} className="pointer-events-none absolute left-0 top-0 block">
          <rect
            x={stroke / 2}
            y={stroke / 2}
            width={w - stroke}
            height={h - stroke}
            rx={r}
            fill="none"
            stroke={raceColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${Math.max(0, perimeter - dash)}`}
            className="sf-race-dash"
            style={{ filter: `drop-shadow(0 0 5px ${raceColor})` }}
          />
        </svg>
      )}
      <style>{`
        .sf-race-dash { stroke-dashoffset: 0; animation: sfRaceDash 6s linear infinite; }
        @keyframes sfRaceDash { to { stroke-dashoffset: -${perimeter}; } }
        .sf-entry-wrap:hover .sf-entry-btn { background: #000 !important; color: ${acc} !important; animation: sfPulse .45s ease; }
        @keyframes sfPulse { 0% { transform: scale(1); } 45% { transform: scale(1.07); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  );
}

type ViewProps = {
  field: Field;
  theme: FormDoc["theme"];
  vars: Record<string, string>;
  value: AnswerValue | undefined;
  error: string;
  seed: string;
  onChange: (v: AnswerValue) => void;
  onSubmit: (v?: AnswerValue) => void;
  score: number;
  onEndAction: (f: Field) => void;
  onBack: () => void;
  canBack: boolean;
};

function FieldView({
  field: f,
  theme: t,
  vars,
  value,
  error,
  seed,
  onChange,
  onSubmit,
  score,
  onEndAction,
  onBack,
  canBack,
}: ViewProps) {
  const centered = f.type === "welcome" || f.type === "thankyou";
  const btn: React.CSSProperties = { background: t.buttonColor, color: onColor(t.buttonColor), borderRadius: t.radius };
  const title = interpolate(f.title, vars);
  const desc = interpolate(f.description ?? "", vars);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const opts = useMemo(
    () => (f.shuffle ? shuffled(f.options ?? [], seed + f.id) : (f.options ?? [])),
    [f.options, f.shuffle, f.id, seed],
  );
  const chosen = value && typeof value !== "string" ? value.options : [];
  const other = value && typeof value !== "string" ? (value.other ?? "") : "";

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, [f.id]);

  const pick = (oid: string) => {
    if (f.multiple) {
      const next = chosen.includes(oid) ? chosen.filter((x) => x !== oid) : [...chosen, oid];
      onChange({ options: next, other });
    } else {
      const v = { options: [oid] };
      onChange(v);
      setTimeout(() => onSubmit(v), 220);
    }
  };

  /* atalhos: letras escolhem opções, Enter confirma */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (f.type === "multiple_choice" && tag !== "INPUT" && tag !== "TEXTAREA") {
        const i = LETTERS.indexOf(e.key.toUpperCase());
        if (i >= 0 && i < opts.length) pick(opts[i].id);
        if (e.key === "Enter" && f.multiple) onSubmit();
      }
      if (f.type === "welcome" && e.key === "Enter") onSubmit();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  return (
    <div className={centered ? "text-center" : ""}>
      <MediaView media={f.media} wide={!centered} />
      <h1
        className={`font-bold leading-tight ${f.type === "welcome" ? "text-[clamp(28px,5.5vw,46px)]" : "text-[clamp(22px,4vw,32px)]"}`}
        style={{ color: t.questionColor, whiteSpace: "pre-line" }}
      >
        {title}
      </h1>
      {desc && (
        <p
          className="mt-3 text-[clamp(15px,2.2vw,19px)] leading-relaxed"
          style={{ color: alpha(t.questionColor, 0.72), whiteSpace: "pre-line" }}
        >
          {desc}
        </p>
      )}

      {f.type === "multiple_choice" && (
        <div className={`mt-8 ${f.sameLine ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "space-y-3"}`}>
          {opts.map((o, i) => {
            const on = chosen.includes(o.id);
            const hasImage = f.sameLine && !!o.image;
            return (
              <button
                key={o.id}
                onClick={() => pick(o.id)}
                className={
                  hasImage
                    ? "sf-opt flex w-full flex-col overflow-hidden border text-left transition"
                    : "sf-opt flex w-full items-center gap-3 border px-4 py-3.5 text-left text-[clamp(15px,2.2vw,18px)] transition"
                }
                style={{
                  borderColor: on ? t.buttonColor : alpha(t.answerColor, 0.6),
                  background: on ? alpha(t.buttonColor, 0.18) : alpha(t.answerColor, 0.04),
                  borderRadius: t.radius,
                  color: t.answerColor,
                }}
              >
                {hasImage && <img src={o.image} alt="" className="aspect-[4/3] w-full object-cover" />}
                <span
                  className={
                    hasImage ? "flex w-full items-center gap-3 px-4 py-3.5 text-[clamp(15px,2.2vw,18px)]" : "contents"
                  }
                >
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm"
                    style={{
                      background: on ? t.buttonColor : alpha(t.answerColor, 0.15),
                      color: on ? onColor(t.buttonColor) : t.answerColor,
                    }}
                  >
                    {on && f.multiple ? "✓" : LETTERS[i]}
                  </span>
                  {o.label}
                </span>
              </button>
            );
          })}
          {f.allowOther && (
            <input
              value={other}
              onChange={(e) => onChange({ options: f.multiple ? chosen : [], other: e.target.value })}
              placeholder="Outros..."
              className="w-full border bg-transparent px-4 py-3.5 text-lg outline-none"
              style={{ borderColor: alpha(t.answerColor, 0.6), borderRadius: t.radius, color: t.answerColor }}
            />
          )}
          {(f.multiple || f.allowOther) && (
            <button onClick={() => onSubmit()} className="mt-3 px-6 py-3 font-semibold" style={btn}>
              OK ✓
            </button>
          )}
        </div>
      )}

      {["name", "short_text", "email", "phone", "number"].includes(f.type) && (
        <form
          className="mt-8"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {f.type === "phone" ? (
            <PhoneInput
              key={f.id}
              dddRef={inputRef}
              value={typeof value === "string" ? value : ""}
              onChange={onChange}
              color={t.answerColor}
            />
          ) : (
            <input
              ref={inputRef}
              type={f.type === "email" ? "email" : "text"}
              inputMode={f.type === "number" ? "numeric" : undefined}
              autoComplete={f.type === "name" ? "given-name" : f.type === "email" ? "email" : "off"}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={f.placeholder}
              className="w-full border-b-2 bg-transparent pb-2 text-[clamp(20px,3.6vw,28px)] outline-none placeholder:opacity-40"
              style={{ borderColor: alpha(t.answerColor, 0.5), color: t.answerColor }}
            />
          )}
          <button className="mt-6 px-6 py-3 font-semibold" style={btn}>
            {f.buttonLabel || "OK ✓"}
          </button>
          <span className="ml-3 hidden text-sm opacity-50 sm:inline">ou pressione Enter ↵</span>
        </form>
      )}

      {f.type === "long_text" && (
        <div className="mt-8">
          <textarea
            ref={inputRef}
            rows={4}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={f.placeholder}
            className="w-full border-b-2 bg-transparent pb-2 text-xl outline-none placeholder:opacity-40"
            style={{ borderColor: alpha(t.answerColor, 0.5), color: t.answerColor }}
          />
          <button onClick={() => onSubmit()} className="mt-6 px-6 py-3 font-semibold" style={btn}>
            OK ✓
          </button>
        </div>
      )}

      {error && (
        <p
          className="mt-4 inline-block rounded px-3 py-1.5 text-sm"
          style={{ background: "#fde2e2", color: "#b42318" }}
        >
          {error}
        </p>
      )}

      {!centered && canBack && (
        <button
          onClick={onBack}
          className="mt-6 block text-sm underline-offset-2 hover:underline"
          style={{ color: alpha(t.answerColor, 0.55) }}
        >
          ← Voltar
        </button>
      )}

      {f.type === "welcome" &&
        (!canBack ? (
          <EntryButton
            label={f.buttonLabel || "Começar"}
            acc={t.buttonColor}
            color={onColor(t.buttonColor)}
            radius={t.radius}
            onClick={() => onSubmit()}
          />
        ) : (
          <button
            onClick={() => onSubmit()}
            className="mt-10 px-9 py-4 text-lg font-semibold shadow-lg transition hover:brightness-110"
            style={btn}
          >
            {f.buttonLabel || "Começar"}
          </button>
        ))}
      {f.type === "thankyou" && f.showScore && (
        <div
          className="mx-auto mt-8 inline-block rounded-xl px-8 py-4"
          style={{ background: alpha(t.answerColor, 0.08) }}
        >
          <div className="text-sm opacity-70">Sua pontuação</div>
          <div className="text-4xl font-extrabold" style={{ color: t.buttonColor }}>
            {score}
          </div>
        </div>
      )}
      {f.type === "thankyou" && <EndButton f={f} btn={btn} onClick={() => onEndAction(f)} />}
      {f.type === "thankyou" && afterOf(f) === "redirect" && f.redirectUrl && (
        <p className="mt-8 text-sm opacity-60">Redirecionando...</p>
      )}
      {/* hover só pra quem tem mouse: no celular (iPhone/Android) o ":hover" fica "preso" onde o dedo
       * tocou antes, e a opção da pergunta seguinte parecia já marcada */}
      <style>{`@media (hover: hover) and (pointer: fine){.sf-opt:hover{border-color:${alpha(t.buttonColor, 0.55)} !important;background:${alpha(t.buttonColor, 0.09)} !important;}}`}</style>
    </div>
  );
}
