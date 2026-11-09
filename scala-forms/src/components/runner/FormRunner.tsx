"use client";
import { safeUrl } from "@/lib/safe-url";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeScore, interpolate, nextFieldId, validateAnswer, variables } from "@/lib/engine";
import { alpha, background, fontHref } from "@/lib/theme";
import { DEFAULT_WA_MESSAGE, afterOf, type AnswerValue, type Field, type FormDoc } from "@/lib/types";
import { comImagemPadrao } from "@/lib/quiz-images";
import AnimatedBackdrop from "./AnimatedBackdrop";
import FieldView from "./FieldView";
import LoadingReveal, { LOADING_MS } from "./LoadingReveal";
import PreviewBar from "./PreviewBar";
import { SEND_ATTEMPTS, SEND_FAILED_MESSAGE, SEND_RETRY_MS, readUtm } from "./runner-utils";
import ScalaDiagnosis from "./scala/ScalaDiagnosis";
import { loadTrackers, trackConversion, trackEvent } from "./trackers";

type Props = { formId: string; doc: FormDoc; preview: boolean };

/**
 * Formulário público: mostra uma pergunta por vez, salva cada resposta (parcial) no servidor,
 * conclui com novas tentativas, dispara pixels e, no Diagnóstico Scala, mostra o resultado.
 * As telas ficam em FieldView (perguntas) e ScalaDiagnosis (resultado).
 */
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
  const finishing = useRef(false);
  const [sending, setSending] = useState(false);
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

  /**
   * Envia as respostas. Parcial: uma tentativa (falha não trava a pessoa).
   * Conclusão: até SEND_ATTEMPTS tentativas com espera crescente; se todas falharem, devolve `false`
   * e quem chamou mostra a mensagem de erro com a opção de tentar de novo.
   */
  const send = useCallback(
    async (ans: Record<string, AnswerValue>, complete: boolean, endingId: string | null) => {
      if (preview) return true;
      const attempts = complete ? SEND_ATTEMPTS : 1;
      for (let i = 0; i < attempts; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, SEND_RETRY_MS * i));
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
          if (!res.ok) continue;
          if (data.responseId) {
            responseId.current = data.responseId;
            setSavedId(data.responseId);
          }
          return true;
        } catch {
          // sem internet ou queda de conexão: tenta de novo
        }
      }
      return !complete; // falha no parcial não trava a pessoa
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
        if (finishing.current) return; // toque duplo no último botão: o primeiro envio já está em andamento
        finishing.current = true;
        setError("");
        setSending(true);
        const ok = await save(ans, true, nxtField?.id ?? null);
        setSending(false);
        finishing.current = false;
        if (!ok) {
          setError(SEND_FAILED_MESSAGE);
          return;
        }
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
              sending={sending}
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
