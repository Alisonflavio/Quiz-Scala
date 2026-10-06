"use client";
import { useEffect, useRef, useState } from "react";
import Toggle from "@/components/ui/Toggle";
import { uid } from "@/lib/templates";
import { LETTERS, alpha, background, fontHref, onColor, youtubeEmbed } from "@/lib/theme";
import { FIELD_TYPES, afterOf, endButtonLabel, type Field, type FieldType, type FormDoc, type Media } from "@/lib/types";

type Props = {
  doc: FormDoc;
  field: Field;
  index: number;
  onChange: (p: Partial<Field>) => void;
  onChangeType: (t: FieldType) => void;
  onOpenMedia: () => void;
};

/* textarea que cresce com o texto, usado para editar título e descrição direto na prévia */
function AutoText({ value, onChange, placeholder, className, style }: {
  value: string; onChange: (v: string) => void; placeholder: string; className: string; style: React.CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full resize-none overflow-hidden bg-transparent outline-none placeholder:opacity-60 ${className}`}
      style={style}
    />
  );
}

export function MediaView({ media, small, wide }: { media?: Media | null; small?: boolean; wide?: boolean }) {
  if (!media?.url) return null;
  // wide = foto de uma pergunta do quiz (larga e arredondada); o normal é logo/selo pequeno (boas-vindas)
  if (media.kind === "image" && wide) return <img src={media.url} alt="" className={`mx-auto mb-6 block h-auto w-full ${small ? "max-w-[220px] max-h-32" : "max-w-[420px] max-h-[210px] sm:max-h-[280px]"} rounded-2xl object-cover object-[50%_30%]`} />;
  if (media.kind === "image") return <img src={media.url} alt="" className={`mx-auto mb-8 ${small ? "max-h-28" : "max-h-40"} max-w-full object-contain`} />;
  const yt = youtubeEmbed(media.url);
  return yt ? (
    <iframe src={yt} className="mb-8 aspect-video w-full rounded-lg" allow="autoplay; encrypted-media" allowFullScreen />
  ) : (
    <video src={media.url} controls playsInline className="mb-8 max-h-72 w-full rounded-lg bg-black" />
  );
}

export default function FieldPreview({ doc, field: f, onChange, onChangeType, onOpenMedia }: Props) {
  const t = doc.theme;
  const [newItem, setNewItem] = useState("");
  const typeInfo = FIELD_TYPES.find((x) => x.type === f.type);
  const logoAlign = t.logoPosition === "left" ? "mr-auto" : t.logoPosition === "right" ? "ml-auto" : "mx-auto";

  const addOption = () => {
    const label = newItem.trim();
    if (!label) return;
    onChange({ options: [...(f.options ?? []), { id: uid(), label, points: 0 }] });
    setNewItem("");
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-surface shadow-sm">
      <link rel="stylesheet" href={fontHref(t.font)} />
      <div className="flex flex-wrap items-center gap-4 border-b border-gray-200 bg-gray-50 px-6 py-5">
        <select
          value={f.type}
          onChange={(e) => onChangeType(e.target.value as FieldType)}
          className={`min-w-64 rounded-md border px-5 py-2.5 text-[17px] outline-none ${f.type === "welcome" || f.type === "thankyou" ? "border-emerald-500 bg-emerald-50 text-emerald-300" : "border-violet-400 bg-violet-50 text-violet-300"}`}
        >
          {FIELD_TYPES.map((x) => <option key={x.type} value={x.type}>{x.label}</option>)}
        </select>
        <div className="flex-1" />
        {f.type !== "welcome" && f.type !== "thankyou" && (
          <label className="flex items-center gap-2 text-sm text-gray-500">
            Obrigatória <Toggle on={f.required} onChange={(v) => onChange({ required: v })} />
          </label>
        )}
        <button className="btn-outline" onClick={onOpenMedia}>🖼 Imagem/Vídeo</button>
      </div>

      <div
        className="flex flex-1 flex-col px-6 py-10 2xl:px-16"
        style={{ background: background(t), fontFamily: `"${t.font}", sans-serif`, color: t.answerColor }}
      >
        {t.logo && <img src={t.logo} alt="" className={`${logoAlign} mb-16 h-8 max-w-[220px] object-contain`} />}
        <div className={`my-auto w-full max-w-2xl ${f.type === "welcome" || f.type === "thankyou" ? "mx-auto text-center" : "mx-auto"}`}>
          <MediaView media={f.media} small wide={f.type !== "welcome" && f.type !== "thankyou"} />
          <AutoText
            value={f.title}
            onChange={(v) => onChange({ title: v })}
            placeholder="Digite a pergunta..."
            className={`font-bold leading-tight ${f.type === "welcome" ? "text-4xl" : "text-3xl"} ${f.type === "welcome" || f.type === "thankyou" ? "text-center" : ""}`}
            style={{ color: t.questionColor }}
          />
          <AutoText
            value={f.description ?? ""}
            onChange={(v) => onChange({ description: v })}
            placeholder="Se desejar, adicione uma descrição..."
            className={`mt-3 text-lg ${f.type === "welcome" || f.type === "thankyou" ? "text-center" : ""}`}
            style={{ color: alpha(t.questionColor, 0.75) }}
          />

          {f.type === "multiple_choice" && (
            <div className={`mt-8 ${f.sameLine ? "grid grid-cols-2 gap-3" : "space-y-3"}`}>
              {(f.options ?? []).map((o, i) => (
                <div
                  key={o.id}
                  className="group flex min-w-0 items-center gap-3 border px-4 py-3"
                  style={{ borderColor: alpha(t.answerColor, 0.8), borderRadius: t.radius }}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm" style={{ background: alpha(t.answerColor, 0.15) }}>{LETTERS[i]}</span>
                  <input
                    value={o.label}
                    onChange={(e) => onChange({ options: f.options!.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)) })}
                    className="min-w-0 flex-1 bg-transparent text-lg outline-none"
                    style={{ color: t.answerColor }}
                  />
                  {o.points !== 0 && <span className="text-xs opacity-60">{o.points} pts</span>}
                  <button
                    title="Remover opção"
                    onClick={() => onChange({ options: f.options!.filter((x) => x.id !== o.id), logic: f.logic?.filter((r) => r.kind !== "answer" || r.optionId !== o.id) })}
                    className="opacity-0 transition group-hover:opacity-70 hover:!opacity-100"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {f.allowOther && (
                <div className="border border-dashed px-4 py-3 text-lg opacity-60" style={{ borderColor: alpha(t.answerColor, 0.6), borderRadius: t.radius }}>Outros...</div>
              )}
              <div className="flex gap-3 pt-2">
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addOption()}
                  placeholder="Novo item..."
                  className="min-w-0 flex-1 rounded-md bg-surface px-4 py-3 text-lg text-gray-800 outline-none"
                />
                <button onClick={addOption} className="btn-primary px-5">Adicionar</button>
              </div>
            </div>
          )}

          {["name", "short_text", "email", "phone", "number", "long_text"].includes(f.type) && (
            <div className="mt-8">
              <input
                value={f.placeholder ?? ""}
                onChange={(e) => onChange({ placeholder: e.target.value })}
                placeholder="Texto de exemplo do campo (placeholder)"
                className="w-full border-b-2 bg-transparent pb-2 text-2xl outline-none"
                style={{ borderColor: alpha(t.answerColor, 0.5), color: alpha(t.answerColor, 0.6) }}
              />
              <div className="mt-6 inline-block px-6 py-3 font-semibold" style={{ background: t.buttonColor, color: onColor(t.buttonColor), borderRadius: t.radius }}>OK ✓</div>
            </div>
          )}

          {f.type === "welcome" && (
            <div className="mt-10 inline-block px-8 py-4 text-lg font-semibold" style={{ background: t.buttonColor, color: onColor(t.buttonColor), borderRadius: t.radius }}>
              {f.buttonLabel || "Começar"}
            </div>
          )}
          {f.type === "thankyou" && f.ending !== "scala_diagnosis" && (() => {
            const kind = afterOf(f);
            const wa = kind === "button_whatsapp";
            return (
              <>
                {f.showScore && <div className="mx-auto mt-8 w-fit rounded-xl px-8 py-3" style={{ background: alpha(t.answerColor, 0.08) }}><div className="text-sm opacity-70">Sua pontuação</div><div className="text-3xl font-extrabold" style={{ color: t.buttonColor }}>00</div></div>}
                {kind.startsWith("button_") && (
                  <div className="mt-10 inline-block px-8 py-4 text-lg font-semibold" style={wa ? { background: "#25D366", color: "#fff", borderRadius: t.radius } : { background: t.buttonColor, color: onColor(t.buttonColor), borderRadius: t.radius }}>
                    {wa ? "🟢 " : kind === "button_file" ? "⤓ " : "✔ "}
                    {endButtonLabel(f)}
                  </div>
                )}
                {kind === "redirect" && <p className="mt-8 text-sm opacity-60">↪ Redireciona para {f.redirectUrl || "(configure o link)"}</p>}
              </>
            );
          })()}

          {f.ending === "scala_diagnosis" && (
            <div className="mt-8 rounded-lg border border-dashed p-6 text-center text-sm opacity-80" style={{ borderColor: alpha(t.answerColor, 0.5) }}>
              Aqui aparece o <b>diagnóstico personalizado</b> (o problema da pessoa, seus números, a solução da mentoria, o vídeo do Reinaldo e o botão do especialista) calculado a partir das respostas.
              <br />Use o botão “Ver” para testar com respostas de verdade.
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-gray-100 px-6 py-2 text-xs text-gray-400">{typeInfo?.label} · a prévia edita o texto direto: clique no título, na descrição ou nas opções.</div>
    </div>
  );
}
