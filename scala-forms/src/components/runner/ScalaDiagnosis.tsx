"use client";
import { useEffect, useRef, useState } from "react";
import { interpolate, optionLabelFor } from "@/lib/engine";
import { ENTREGAVEIS, brl, computeScala, scoreLevel } from "@/lib/scala";
import { SCALA_WA_MESSAGE } from "@/lib/templates";
import { alpha, onColor } from "@/lib/theme";
import type { Field, FormDoc } from "@/lib/types";
import { trackEvent } from "./trackers";

function Tag({ acc, children }: { acc: string; children: React.ReactNode }) {
  return (
    <span className="mb-5 inline-block rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider" style={{ background: alpha(acc, 0.15), color: acc, border: `1px solid ${alpha(acc, 0.4)}` }}>
      {children}
    </span>
  );
}

function Num({ label, value, sub, color, muted }: { label: string; value: string; sub?: string; color?: string; muted: string }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: alpha(muted, 0.08) }}>
      <span className="block text-xs" style={{ color: alpha(muted, 0.6) }}>{label}</span>
      <b className="block text-[17px] leading-tight" style={{ color }}>{value}</b>
      {sub && <span className="block text-xs" style={{ color: alpha(muted, 0.6) }}>{sub}</span>}
    </div>
  );
}

const GOAL_GREEN = "#2FBF71";

/* Pontos de uma linha de "gráfico de crescimento" (sobe no geral, com pequenas ondulações,
 * como uma trilha de montanha). Fixos — só a posição do bonequinho e o quanto da linha já
 * foi "andada" mudam. Y vai de 16 (topo) a 172 (base); o viewBox tem espaço extra acima
 * (y negativo) pra caber a altura do bonequinho sem cortar a cabeça dele. */
const PATH_POINTS: [number, number][] = [
  [12, 172], [55, 150], [85, 160], [120, 118], [150, 128], [185, 90], [215, 100], [250, 55], [280, 68], [328, 16],
];
const PATH_D = PATH_POINTS.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
const VIEW_TOP = -78; // espaço reservado acima do ponto mais alto da linha (y=16): bonequinho + o número acima dele
const VIEW_H = 190 - VIEW_TOP;
const VIEW_W = 392; // mais largo que os 340 da linha: sobra espaço à direita pro número não cortar

function pointAt(frac: number): { x: number; y: number } {
  const n = PATH_POINTS.length - 1;
  const raw = Math.max(0, Math.min(1, frac)) * n;
  const i0 = Math.min(n - 1, Math.floor(raw));
  const i1 = i0 + 1;
  const f = raw - i0;
  const [x0, y0] = PATH_POINTS[i0], [x1, y1] = PATH_POINTS[i1];
  return { x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f };
}

/* Bonequinho = recorte real do vídeo de referência que o usuário mandou (silhueta em pé,
 * olhando pro próprio pé), não mais um desenho feito do zero. A imagem original (walker.png) foi
 * dividida em: walker-top.png (tronco+cabeça+braços, fica parado) e as pernas, que por sua vez
 * foram divididas em DUAS metades independentes (walker-leg-left/right.png, com sobreposição no
 * meio pra não aparecer costura) — cada perna balança em fase oposta da outra (uma pro lado
 * enquanto a outra volta), em vez de balançar junto como um bloco só (o que parecia nadar, não
 * caminhar). Cada parte vira uma "máscara" pintada da cor certa por cima, pra trocar entre
 * laranja e verde sem precisar de imagens duplicadas por cor. */
const WALKER_W = 15, WALKER_H = WALKER_W * (240 / 74); // proporção real do recorte original (74x240px)
const TOP_H = WALKER_W * (170 / 74);
const LEGS_H = WALKER_W * (100 / 74);
const LEGS_Y = WALKER_H - LEGS_H;
const LEG_PIECE_W = WALKER_W * (44 / 74); // cada metade da perna (recorte com sobreposição)
function Walker({ color, uid, walking }: { color: string; uid: string; walking: boolean }) {
  const maskTop = `walkerTop-${uid}`;
  const maskLegL = `walkerLegL-${uid}`;
  const maskLegR = `walkerLegR-${uid}`;
  const originY = LEGS_Y + 5;
  // Parado (chegou no topo): volta pra postura reta, sem o balanço — não congela no meio do passo.
  const legStyle = (origin: number): React.CSSProperties => ({
    transformOrigin: `${origin}px ${originY}px`,
    transform: walking ? undefined : "skewX(0deg)",
    transition: walking ? undefined : "transform .4s ease",
  });
  return (
    <g style={{ transform: `translate(${-WALKER_W / 2}px, ${-WALKER_H}px)` }}>
      {walking && (
        <style>{`
          @keyframes sfWalkL-${uid} { 0%,100% { transform: skewX(-13deg); } 50% { transform: skewX(13deg); } }
          @keyframes sfWalkR-${uid} { 0%,100% { transform: skewX(13deg); } 50% { transform: skewX(-13deg); } }
          .sf-legL-${uid} { animation: sfWalkL-${uid} .6s ease-in-out infinite; }
          .sf-legR-${uid} { animation: sfWalkR-${uid} .6s ease-in-out infinite; }
        `}</style>
      )}
      <mask id={maskTop}>
        <image href="/scala/walker-top.png" width={WALKER_W} height={TOP_H} preserveAspectRatio="none" />
      </mask>
      <rect width={WALKER_W} height={TOP_H} fill={color} mask={`url(#${maskTop})`} style={{ transition: "fill .6s ease" }} />
      <g className={walking ? `sf-legL-${uid}` : undefined} style={legStyle(0)}>
        <mask id={maskLegL}>
          <image href="/scala/walker-leg-left.png" x={0} y={LEGS_Y} width={LEG_PIECE_W} height={LEGS_H} preserveAspectRatio="none" />
        </mask>
        <rect x={0} y={LEGS_Y} width={LEG_PIECE_W} height={LEGS_H} fill={color} mask={`url(#${maskLegL})`} style={{ transition: "fill .6s ease" }} />
      </g>
      <g className={walking ? `sf-legR-${uid}` : undefined} style={legStyle(WALKER_W)}>
        <mask id={maskLegR}>
          <image href="/scala/walker-leg-right.png" x={WALKER_W - LEG_PIECE_W} y={LEGS_Y} width={LEG_PIECE_W} height={LEGS_H} preserveAspectRatio="none" />
        </mask>
        <rect x={WALKER_W - LEG_PIECE_W} y={LEGS_Y} width={LEG_PIECE_W} height={LEGS_H} fill={color} mask={`url(#${maskLegR})`} style={{ transition: "fill .6s ease" }} />
      </g>
    </g>
  );
}

/* Score de carreira: número grande contando até o valor + barra enchendo. Os dois são garantidos
 * por setTimeout (rAF/intervalos podem ser pausados com a aba em segundo plano), então o valor
 * final sempre aparece. */
function ScoreMeter({ score, muted, track, text }: { score: number; muted: string; track: string; text: string }) {
  const [val, setVal] = useState(0);
  const [on, setOn] = useState(false);
  const { label, color } = scoreLevel(score);
  useEffect(() => {
    const kick = setTimeout(() => setOn(true), 30);
    const t0 = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 1300);
      setVal(Math.round(score * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) clearInterval(id);
    }, 40);
    const safety = setTimeout(() => setVal(score), 1500);
    return () => { clearTimeout(kick); clearInterval(id); clearTimeout(safety); };
  }, [score]);
  return (
    <div className="mb-7 p-5" style={{ border: `2px solid ${color}`, background: alpha(color, 0.08), borderRadius: 18 }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold uppercase tracking-wider" style={{ color: muted }}>Seu score</span>
        <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider" style={{ background: alpha(color, 0.18), color }}>{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <b className="text-[56px] font-extrabold leading-none" style={{ color }}>{val}</b>
        <span className="text-xl font-bold" style={{ color: text }}>/100</span>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full" style={{ background: track }}>
        <div className="h-full rounded-full" style={{ width: on ? `${score}%` : "0%", background: color, transition: "width 1.3s cubic-bezier(.2,.7,.2,1)" }} />
      </div>
    </div>
  );
}

/* Linha única de crescimento com o bonequinho andando até o fim. Ao aparecer na tela, sempre
 * completa o percurso inteiro (do começo ao fim), bem devagar — nunca para no meio. O número
 * sobe de "hoje" até a "meta" junto com o bonequinho; os dois viram verde ao chegar no topo.
 * Pensado pra nunca travar: a posição final (e, no pior caso, o valor final) são garantidos
 * por um temporizador, não só por requestAnimationFrame (que o navegador pausa se a aba for
 * pra segundo plano). */
function ClimbChart({ current, goal, acc }: { current: number; goal: number; acc: string }) {
  const [on, setOn] = useState(false);
  const [val, setVal] = useState(current);
  const DUR = 7000; // bem devagar, como pedido

  useEffect(() => {
    // Liga a animação (figura + linha) num setTimeout, não num requestAnimationFrame: o rAF
    // simplesmente NUNCA dispara se a aba estiver em segundo plano/oculta nesse momento (testei
    // e confirmei isso), e como é ele quem muda "on" de false pra true, a animação inteira
    // ficaria parada pra sempre nesse caso. setTimeout roda de qualquer jeito.
    const kick = setTimeout(() => setOn(true), 20);
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / DUR);
      const eased = 1 - Math.pow(1 - p, 2);
      setVal(Math.round(current + (goal - current) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // garante o valor final mesmo se a aba ficar em 2º plano e o rAF acima nunca rodar
    const safety = setTimeout(() => setVal(goal), DUR + 300);
    return () => { clearTimeout(kick); cancelAnimationFrame(raf); clearTimeout(safety); };
  }, [current, goal]);

  const done = val >= goal;
  const color = done ? GOAL_GREEN : acc;
  const pos = pointAt(on ? 1 : 0);

  return (
    <svg viewBox={`0 ${VIEW_TOP} ${VIEW_W} ${VIEW_H}`} className="mx-auto block w-full" style={{ maxWidth: VIEW_W }}>
      <defs>
        <linearGradient id="climbGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={acc} />
          <stop offset="70%" stopColor={acc} />
          <stop offset="100%" stopColor={GOAL_GREEN} />
        </linearGradient>
        {/* "revela" a linha com um retângulo de recorte que cresce da esquerda pra direita —
         * mais simples e previsível do que animar stroke-dasharray/dashoffset (que, numa primeira
         * tentativa, não se comportou bem junto com as outras atualizações de estado). */}
        <clipPath id="climbClip" clipPathUnits="userSpaceOnUse">
          <rect x="0" y={VIEW_TOP} width={on ? 340 : 0} height={VIEW_H} style={{ transition: `width ${DUR}ms linear` }} />
        </clipPath>
      </defs>
      <path d={PATH_D} fill="none" stroke="url(#climbGrad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
        clipPath="url(#climbClip)"
        style={{ filter: `drop-shadow(0 0 5px ${alpha(acc, 0.65)})` }}
      />
      <g style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, transition: `transform ${DUR}ms linear` }}>
        <text x="0" y={-WALKER_H - 10} textAnchor="middle" fontSize="15" fontWeight="800" fill={color} style={{ transition: "fill .6s ease" }}>{brl(val)}</text>
        <Walker color={color} uid="climb" walking={!done} />
      </g>
    </svg>
  );
}

type Props = { doc: FormDoc; field: Field; vars: Record<string, string>; utm: Record<string, string>; responseId?: string; formId: string; preview: boolean };

/*
 * Resultado do Diagnóstico Scala, em duas telas:
 * 1. O problema: veredito concreto + a dor com os números da pessoa + "isso tem solução"
 * 2. A solução: entregáveis, prova social (vídeo) e conversa com o especialista
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
  const go = (p: typeof page) => { setPage(p); if (p === "solution") setSound(false); scrollTo({ top: 0 }); };

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
        <h1 className="text-2xl font-bold" style={{ color: t.questionColor }}>Obrigado, {vars.nome}!</h1>
        <p className="mt-3 opacity-70">
          Para mostrar o diagnóstico, o formulário precisa das variáveis <code>renda</code>, <code>aumento</code> e <code>horas</code> com valores numéricos nas opções.
        </p>
      </div>
    );
  }

  const d = r.diagnosis;
  const nome = vars.nome || "";
  const text = alpha(t.answerColor, 0.88);
  const muted = alpha(t.answerColor, 0.6);
  const card: React.CSSProperties = { background: alpha(t.answerColor, 0.05), border: `1px solid ${alpha(t.answerColor, 0.12)}`, borderRadius: 18 };
  const btn: React.CSSProperties = { background: acc, color: onColor(acc), borderRadius: 14 };
  const logo = t.logo && <img src={t.logo} alt="" className="mx-auto mb-10 h-8 max-w-[200px] object-contain" />;

  /* ---------- tela 2: a solução ---------- */
  if (page === "solution") {
    const msg = interpolate(cfg.whatsappMessage ?? SCALA_WA_MESSAGE, {
      ...vars, ...utm, diagnostico: r.label, nivel: r.label, gargalo: d.area,
    }).replace(/\s+\(\)/g, "");
    const wa = `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(msg)}`;
    const order = [d.entregavel, ...ENTREGAVEIS.map((_, i) => i).filter((i) => i !== d.entregavel)];
    return (
      <div className="mx-auto max-w-xl px-5 pb-16 pt-8">
        {logo}
        <Tag acc={acc}>A solução para o seu caso</Tag>
        <h1 className="mb-6 text-[28px] font-extrabold leading-tight" style={{ color: t.questionColor }}>
          {nome ? `${nome}, dá` : "Dá"} para <span style={{ color: acc }}>{d.desejo}</span>.
        </h1>

        {cfg.videoUrl && (
          <div className="mb-8">
            <h2 className="mb-3 text-lg font-extrabold" style={{ color: t.questionColor }}>Veja como o Reinaldo fez isso 👇</h2>
            <div className="relative mx-auto w-full max-w-[300px]">
              <video
                ref={(el) => {
                  videoEl.current = el;
                  if (el && !el.dataset.auto) { el.dataset.auto = "1"; el.muted = true; void el.play().catch(() => {}); }
                }}
                controls
                autoPlay
                muted
                loop={!sound}
                preload="auto"
                playsInline
                poster={cfg.videoPoster || undefined}
                onVolumeChange={(e) => { if (!e.currentTarget.muted && !sound) { setSound(true); onVideoPlay(); } }}
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
                  <span className="flex flex-col items-center gap-1.5 rounded-xl px-5 py-3 text-center shadow-xl" style={{ background: acc, color: onColor(acc) }}>
                    <span className="text-xs font-bold">Seu vídeo já começou · 1 min</span>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
                      <path d="m16 9 6 6M22 9l-6 6" />
                    </svg>
                    <span className="text-xs font-bold">Toque para ouvir</span>
                  </span>
                </button>
              )}
            </div>
            <p className="mt-3 text-center text-[15px]" style={{ color: text }}>
              Hoje: 20 alunos presenciais + 35 online.<br /><b style={{ color: acc }}>Quase R$ 25 mil por mês.</b>
            </p>
          </div>
        )}

        <div className="mb-8 p-5" style={card}>
          <h2 className="mb-4 text-lg font-extrabold" style={{ color: t.questionColor }}>Na conversa gratuita:</h2>
          <ul className="space-y-3">
            {order.map((i, n) => (
              <li key={i} className="flex gap-3 text-[15.5px] leading-snug" style={{ color: text }}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-bold" style={{ background: acc, color: onColor(acc) }}>✓</span>
                <span>{ENTREGAVEIS[i]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 text-center" style={{ border: `2px solid ${acc}`, background: alpha(acc, 0.08), borderRadius: 20 }}>
          <h2 className="mb-2 text-2xl font-extrabold" style={{ color: t.questionColor }}>Seu próximo passo</h2>
          <p className="mb-5 text-[16px] leading-relaxed" style={{ color: text }}>
            Conversa <b>gratuita</b> de 20 min com um gestor da Scala.
          </p>
          <a
            href={cfg.whatsapp ? wa : undefined}
            target="_blank"
            rel="noopener"
            onClick={() => { event("clicou_whatsapp"); if (!preview) trackEvent(doc.settings, "Contact"); }}
            className="block px-5 py-4 text-lg font-bold shadow-lg"
            style={{ background: "#25D366", color: "#fff", borderRadius: 14, opacity: cfg.whatsapp ? 1 : 0.5 }}
          >
            Quero minha conversa gratuita
          </a>
          {!cfg.whatsapp && <p className="mt-2 text-xs opacity-60">Configure o WhatsApp do especialista na tela final do editor.</p>}
        </div>

        <p className="mt-8 text-center text-sm" style={{ color: muted }}>Treino muda o corpo. Método muda a carreira.</p>
        <button onClick={() => go("problem")} className="mx-auto mt-4 block text-sm underline" style={{ color: muted }}>Voltar ao meu diagnóstico</button>
      </div>
    );
  }

  /* ---------- tela 1: o problema ---------- */
  const rendaLabel = optionLabelFor(doc, "renda", vars.renda);
  const horasLabel = optionLabelFor(doc, "horas", vars.horas);
  return (
    <div className="mx-auto max-w-xl px-5 pb-16 pt-8">
      {logo}
      <Tag acc={acc}>Diagnóstico de {nome}</Tag>

      <ScoreMeter score={r.score} muted={muted} track={alpha(t.answerColor, 0.12)} text={text} />

      <div className="mb-7 p-5" style={{ border: `2px solid ${acc}`, background: alpha(acc, 0.08), borderRadius: 18 }}>
        <p className="mb-1.5 text-[15px]" style={{ color: text }}>Você precisa de um passo a passo para</p>
        <h1 className="text-[28px] font-extrabold leading-tight" style={{ color: acc }}>{d.desejo}.</h1>
      </div>

      <div className="mb-7 p-5" style={card}>
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider" style={{ color: muted }}>Seus números</h2>
        <ClimbChart current={r.renda} goal={r.meta} acc={acc} />
        <div className="mt-2 grid grid-cols-1 gap-2.5">
          <Num label="Hoje você fatura" value={rendaLabel ?? `${brl(r.renda)}/mês`} muted={t.answerColor} />
          <Num label="Você atende hoje" value={horasLabel ?? `${r.horas}h/semana`} muted={t.answerColor} />
        </div>
        <p className="mt-4 text-[15.5px] leading-relaxed" style={{ color: text }}>
          {r.fits
            ? <>Vendendo hora, sua meta pede <b>{Math.round(r.hoursNeeded)}h por semana</b> (+{Math.round(r.hoursNeeded - r.horas)}h).</>
            : <>Vendendo hora, sua meta pede <b>{Math.round(r.hoursNeeded)}h por semana</b>. Não cabe.</>}
        </p>
      </div>

      <div className="mb-7 p-5" style={{ border: `1px solid ${alpha(acc, 0.5)}`, background: alpha(acc, 0.06), borderRadius: 18 }}>
        <Tag acc={acc}>Seu principal gargalo</Tag>
        <p className="text-[17px] font-bold leading-snug" style={{ color: t.questionColor }}>{d.gargalo}</p>
      </div>

      <div className="mb-7 p-5" style={card}>
        <h2 className="mb-4 text-lg font-extrabold" style={{ color: t.questionColor }}>O que fazer agora</h2>
        <ul className="space-y-3">
          {d.acoes.map((acao, i) => (
            <li key={i} className="flex gap-3 text-[15.5px] leading-snug" style={{ color: text }}>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold" style={{ borderColor: alpha(acc, 0.5), color: acc }}>{i + 1}</span>
              <span>{acao}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-6 text-center" style={{ border: `2px solid ${acc}`, background: alpha(acc, 0.08), borderRadius: 20 }}>
        <h2 className="mb-4 text-2xl font-extrabold" style={{ color: t.questionColor }}>Isso tem solução.</h2>
        <button
          onClick={() => { event("validou_sim"); if (!preview) trackEvent(doc.settings, "DiagnosticoConfirmado", true); go("solution"); }}
          className="w-full px-5 py-4 text-lg font-bold shadow-lg"
          style={btn}
        >
          Ver a solução
        </button>
      </div>
      <button onClick={() => { event("validou_nao"); go("fix"); }} className="mx-auto mt-5 block text-sm underline" style={{ color: muted }}>
        Algum dado está errado? Corrigir
      </button>

      {page === "fix" && (
        <Fix doc={doc} vars={vars} acc={acc} onDone={(v) => { setVars(v); event("corrigiu"); go("problem"); }} />
      )}
    </div>
  );
}

/* A pessoa corrige renda, aumento e horas e o diagnóstico é recalculado */
function Fix({ doc, vars, acc, onDone }: { doc: FormDoc; vars: Record<string, string>; acc: string; onDone: (v: Record<string, string>) => void }) {
  const keys = [
    ["renda", "Quanto você fatura por mês hoje"],
    ["aumento", "Quanto a mais você quer faturar por mês"],
    ["horas", "Horas por semana atendendo"],
  ] as const;
  const [v, setV] = useState(vars);
  return (
    <div className="mt-6 rounded-[20px] p-6 text-left" style={{ border: `2px solid ${alpha(acc, 0.6)}` }}>
      <h2 className="mb-4 text-xl font-extrabold">Corrija o que estiver diferente</h2>
      {keys.map(([k, label]) => {
        const f = doc.fields.find((x) => x.key === k);
        if (!f) return null;
        if (f.options) {
          // formulários antigos, antes da troca pra número exato: mantém o <select> por faixa
          return (
            <label key={k} className="mb-3 block text-sm opacity-80">
              {label}
              <select value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} className="mt-1.5 block w-full rounded-xl border border-white/20 bg-black/40 p-3.5 text-base">
                {f.options.map((o) => <option key={o.id} value={o.value || o.label}>{o.label}</option>)}
              </select>
            </label>
          );
        }
        return (
          <label key={k} className="mb-3 block text-sm opacity-80">
            {label}
            <input type="text" inputMode="numeric" value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} placeholder={f.placeholder} className="mt-1.5 block w-full rounded-xl border border-white/20 bg-black/40 p-3.5 text-base" />
          </label>
        );
      })}
      <button onClick={() => onDone(v)} className="mt-2 w-full rounded-2xl p-4 text-lg font-bold" style={{ background: acc, color: onColor(acc) }}>Refazer meu diagnóstico</button>
    </div>
  );
}
