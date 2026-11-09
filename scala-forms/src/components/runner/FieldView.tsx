"use client";
import { useEffect, useMemo, useRef } from "react";
import { MediaView } from "@/components/editor/FieldPreview";
import { interpolate } from "@/lib/engine";
import { LETTERS, alpha, onColor } from "@/lib/theme";
import { afterOf, type AnswerValue, type Field, type FormDoc } from "@/lib/types";
import EndButton from "./EndButton";
import EntryButton from "./EntryButton";
import PhoneInput from "./PhoneInput";
import { shuffled } from "./runner-utils";

export type ViewProps = {
  field: Field;
  theme: FormDoc["theme"];
  vars: Record<string, string>;
  value: AnswerValue | undefined;
  error: string;
  /** `true` enquanto a conclusão está sendo enviada ao servidor */
  sending: boolean;
  seed: string;
  onChange: (v: AnswerValue) => void;
  onSubmit: (v?: AnswerValue) => void;
  score: number;
  onEndAction: (f: Field) => void;
  onBack: () => void;
  canBack: boolean;
};

/** Uma tela do formulário: pergunta (texto, escolha, telefone...), boas-vindas ou tela final. */
export default function FieldView({
  field: f,
  theme: t,
  vars,
  value,
  error,
  sending,
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

      {sending && (
        <p className="mt-4 text-sm" style={{ color: alpha(t.answerColor, 0.7) }} role="status">
          Enviando suas respostas...
        </p>
      )}

      {error && (
        <p
          role="alert"
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
