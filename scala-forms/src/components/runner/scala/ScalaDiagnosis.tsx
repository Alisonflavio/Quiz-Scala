"use client";
import { useRef, useState } from "react";
import { interpolate, optionLabelFor } from "@/lib/engine";
import { brl, computeScala, diagnosticoPorResposta, irParaObrigado } from "@/lib/scala";
import { SCALA_WA_MESSAGE } from "@/lib/templates";
import { alpha, onColor } from "@/lib/theme";
import type { Field, FormDoc } from "@/lib/types";
import { trackEvent } from "../trackers";
import ClimbChart from "./ClimbChart";
import FixScreen from "./FixScreen";
import ScoreMeter from "./ScoreMeter";
import { CRITICAL_RED, GOAL_GREEN, Item, Num, Tag, rich } from "./ui";

type Props = {
  doc: FormDoc;
  field: Field;
  vars: Record<string, string>;
  utm: Record<string, string>;
  responseId?: string;
  formId: string;
  preview: boolean;
};

/** Espera antes de trocar de página, para os eventos (Meta, servidor) não se perderem. */
const NAV_DELAY_MS = 300;

/*
 * Resultado do Diagnóstico Scala, em duas telas:
 * 1. O problema: veredito concreto + a dor com os números da pessoa + "isso tem solução"
 * 2. A solução: entregáveis, prova social (vídeo) e conversa com o especialista
 * Peças visuais em ./ui, ./ClimbChart, ./ScoreMeter; correção dos números em ./FixScreen.
 */
export default function ScalaDiagnosis({ doc, field, vars: initialVars, utm, responseId, formId, preview }: Props) {
  const t = doc.theme;
  const acc = t.buttonColor;
  const cfg = field.scala ?? { whatsapp: "", videoUrl: "", videoPoster: "" };
  const [vars, setVars] = useState(initialVars);
  const [page, setPage] = useState<"problem" | "fix" | "solution">("problem");
  const r = computeScala(vars);

  const event = (name: string) => {
    if (preview || !responseId) return;
    void fetch(`/api/f/${formId}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responseId, event: name, vars }),
      keepalive: true,
    });
  };
  const go = (p: typeof page) => {
    setPage(p);
    if (p === "solution") setSound(false);
    scrollTo({ top: 0 });
  };

  const [sound, setSound] = useState(false);
  const videoEl = useRef<HTMLVideoElement | null>(null);
  const vid = useRef({ played: 0, last: 0, sent: new Set<number>() });
  // só mede quanto foi assistido com som (o vídeo começa mudo sozinho); não trava nada
  const onVideoTime = (v: HTMLVideoElement) => {
    const s = vid.current;
    if (!v.duration) return;
    const delta = v.currentTime - s.last;
    s.last = v.currentTime;
    if (v.muted) return;
    if (delta > 0 && delta < 1.5) s.played += delta;
    const pct = Math.min(100, (s.played / v.duration) * 100);
    for (const m of [25, 50, 75, 100]) {
      if (pct < (m === 100 ? 95 : m) || s.sent.has(m)) continue;
      s.sent.add(m);
      event(`video_${m}`);
      if (m === 75 && !preview) trackEvent(doc.settings, "Video75", true);
    }
  };
  const onVideoPlay = () => {
    if (vid.current.sent.has(0)) return;
    vid.current.sent.add(0);
    event("video_play");
    if (!preview) trackEvent(doc.settings, "VideoPlay", true);
  };
  const startSound = (v: HTMLVideoElement) => {
    v.muted = false;
    v.currentTime = 0;
    vid.current.last = 0;
    void v.play().catch(() => {});
    setSound(true);
    onVideoPlay();
  };

  if (!r) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <h1 className="text-2xl font-bold" style={{ color: t.questionColor }}>
          Obrigado, {vars.nome}!
        </h1>
        <p className="mt-3 opacity-70">
          Para mostrar o diagnóstico, o formulário precisa das variáveis <code>renda</code>, <code>aumento</code> e{" "}
          <code>horas</code> com valores numéricos nas opções.
        </p>
      </div>
    );
  }

  const d = r.diagnosis;
  const nome = vars.nome || "";
  const text = alpha(t.answerColor, 0.88);
  const muted = alpha(t.answerColor, 0.6);
  const card: React.CSSProperties = {
    background: alpha(t.answerColor, 0.05),
    border: `1px solid ${alpha(t.answerColor, 0.12)}`,
    borderRadius: 18,
  };
  const btn: React.CSSProperties = { background: acc, color: onColor(acc), borderRadius: 14 };
  const logo = t.logo && <img src={t.logo} alt="" className="mx-auto mb-10 h-8 max-w-[200px] object-contain" />;

  /* ---------- tela 2: a solução ---------- */
  if (page === "solution") {
    const msg = interpolate(cfg.whatsappMessage ?? SCALA_WA_MESSAGE, {
      ...vars,
      ...utm,
      diagnostico: r.label,
      nivel: r.label,
      gargalo: d.area,
    }).replace(/\s+\(\)/g, "");
    const wa = `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(msg)}`;
    return (
      <div className="mx-auto max-w-xl px-5 pb-16 pt-8">
        {logo}
        <Tag acc={acc}>A solução para o seu caso</Tag>
        <h1 className="mb-6 text-[28px] font-extrabold leading-tight" style={{ color: t.questionColor }}>
          {nome ? `${nome}, dá` : "Dá"} para <span style={{ color: acc }}>{d.desejo}</span>.
        </h1>

        {cfg.videoUrl && (
          <div className="mb-8">
            <h2 className="mb-3 text-lg font-extrabold" style={{ color: t.questionColor }}>
              Veja como o Reinaldo fez isso 👇
            </h2>
            <div className="relative mx-auto w-full max-w-[300px]">
              <video
                ref={(el) => {
                  videoEl.current = el;
                  if (el && !el.dataset.auto) {
                    el.dataset.auto = "1";
                    el.muted = true;
                    void el.play().catch(() => {});
                  }
                }}
                controls
                autoPlay
                muted
                loop={!sound}
                preload="auto"
                playsInline
                poster={cfg.videoPoster || undefined}
                onVolumeChange={(e) => {
                  if (!e.currentTarget.muted && !sound) {
                    setSound(true);
                    onVideoPlay();
                  }
                }}
                onTimeUpdate={(e) => onVideoTime(e.currentTarget)}
                className="block aspect-[9/16] w-full rounded-2xl bg-black object-cover"
              >
                <source src={cfg.videoUrl} type="video/mp4" />
              </video>
              {!sound && (
                <button
                  type="button"
                  aria-label="Ativar o som e ver o vídeo do início"
                  onClick={() => videoEl.current && startSound(videoEl.current)}
                  className="absolute inset-x-0 top-0 bottom-14 grid place-items-center rounded-2xl"
                >
                  <span
                    className="flex flex-col items-center gap-1.5 rounded-xl px-5 py-3 text-center shadow-xl"
                    style={{ background: acc, color: onColor(acc) }}
                  >
                    <span className="text-xs font-bold">Seu vídeo já começou · 1 min</span>
                    <svg
                      width="30"
                      height="30"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
                      <path d="m16 9 6 6M22 9l-6 6" />
                    </svg>
                    <span className="text-xs font-bold">Toque para ouvir</span>
                  </span>
                </button>
              )}
            </div>
            <p className="mt-3 text-center text-[15px]" style={{ color: text }}>
              Hoje: 20 alunos presenciais + 35 online.
              <br />
              <b style={{ color: acc }}>Quase R$ 25 mil por mês.</b>
            </p>
          </div>
        )}

        <div
          className="p-6 text-center"
          style={{ border: `2px solid ${acc}`, background: alpha(acc, 0.08), borderRadius: 20 }}
        >
          <h2 className="mb-2 text-2xl font-extrabold" style={{ color: t.questionColor }}>
            Seu próximo passo
          </h2>
          <p className="mb-5 text-[16px] leading-relaxed" style={{ color: text }}>
            Converse <b>agora</b> com o nosso especialista em carreira.
          </p>
          <a
            href={cfg.whatsapp ? wa : undefined}
            target="_blank"
            rel="noopener"
            onClick={() => {
              event("clicou_whatsapp");
              if (!preview) trackEvent(doc.settings, "Contact");
            }}
            className="block px-5 py-4 text-lg font-bold shadow-lg"
            style={{ background: "#25D366", color: "#fff", borderRadius: 14, opacity: cfg.whatsapp ? 1 : 0.5 }}
          >
            Falar com o especialista agora
          </a>
          {!cfg.whatsapp && (
            <p className="mt-2 text-xs opacity-60">Configure o WhatsApp do especialista na tela final do editor.</p>
          )}
        </div>

        <p className="mt-8 text-center text-sm" style={{ color: muted }}>
          Treino muda o corpo. Método muda a carreira.
        </p>
        <button onClick={() => go("problem")} className="mx-auto mt-4 block text-sm underline" style={{ color: muted }}>
          Voltar ao meu diagnóstico
        </button>
      </div>
    );
  }

  /* ---------- tela 1: o problema ---------- */
  const rendaLabel = optionLabelFor(doc, "renda", vars.renda);
  const horasLabel = optionLabelFor(doc, "horas", vars.horas);
  const pares = diagnosticoPorResposta(vars, r);
  return (
    <div className="mx-auto max-w-xl px-5 pb-16 pt-8">
      {logo}
      <Tag acc={acc}>Diagnóstico de {nome}</Tag>

      <ScoreMeter score={r.score} muted={muted} track={alpha(t.answerColor, 0.12)} text={text} />

      <div className="mb-7 p-5" style={card}>
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: muted }}>
            Seus números
          </h2>
          <span className="text-right text-[13px] font-semibold" style={{ color: GOAL_GREEN }}>
            Aonde você quer chegar
          </span>
        </div>
        <ClimbChart current={r.renda} goal={r.meta} acc={acc} />
        <div className="mt-2 grid grid-cols-1 gap-2.5">
          <Num label="Hoje você fatura" value={rendaLabel ?? `${brl(r.renda)}/mês`} muted={t.answerColor} />
          <Num label="Você atende hoje" value={horasLabel ?? `${r.horas}h/semana`} muted={t.answerColor} />
        </div>
      </div>

      <div className="mb-7">
        <h2 className="mb-3 text-lg font-extrabold" style={{ color: t.questionColor }}>
          O que está travando você
        </h2>
        <ul className="space-y-2.5">
          {pares.map((p) => (
            <Item key={p.falta} color={CRITICAL_RED} icon="!" text={text}>
              {rich(p.falta, CRITICAL_RED)}
            </Item>
          ))}
        </ul>
      </div>

      <div className="mb-7">
        <h2 className="mb-3 text-lg font-extrabold" style={{ color: t.questionColor }}>
          O que você precisa fazer
        </h2>
        <ul className="space-y-2.5">
          {pares.map((p) => (
            <Item key={p.fazer} color={GOAL_GREEN} icon="✓" text={text}>
              <b>{p.fazer}</b>
            </Item>
          ))}
        </ul>
      </div>

      <button
        onClick={() => {
          event("validou_sim");
          if (!preview) trackEvent(doc.settings, "DiagnosticoConfirmado", true);
          const thankYou = (cfg.thankYouUrl || "/obrigado").trim();
          if (preview || thankYou === "inline") go("solution");
          // pequena espera para o evento da Meta e o registro do clique saírem antes da troca de página
          else setTimeout(() => irParaObrigado(thankYou, vars, utm, { responseId, formId }), NAV_DELAY_MS);
        }}
        className="w-full px-5 py-4 text-lg font-bold shadow-lg"
        style={btn}
      >
        Ver a solução
      </button>
      <button
        onClick={() => {
          event("validou_nao");
          go("fix");
        }}
        className="mx-auto mt-5 block text-sm underline"
        style={{ color: muted }}
      >
        Algum dado está errado? Corrigir
      </button>

      {page === "fix" && (
        <FixScreen
          doc={doc}
          vars={vars}
          acc={acc}
          onDone={(v) => {
            setVars(v);
            event("corrigiu");
            go("problem");
          }}
        />
      )}
    </div>
  );
}
