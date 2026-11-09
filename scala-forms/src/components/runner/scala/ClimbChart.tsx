"use client";
import { useEffect, useState } from "react";
import { brl } from "@/lib/scala";
import { alpha } from "@/lib/theme";
import { GOAL_GREEN } from "./ui";

/* Pontos de uma linha de "gráfico de crescimento" (sobe no geral, com pequenas ondulações,
 * como uma trilha de montanha). Fixos — só a posição do bonequinho e o quanto da linha já
 * foi "andada" mudam. Y vai de 16 (topo) a 172 (base); o viewBox tem espaço extra acima
 * (y negativo) pra caber a altura do bonequinho sem cortar a cabeça dele. */
const PATH_POINTS: [number, number][] = [
  [12, 172],
  [55, 150],
  [85, 160],
  [120, 118],
  [150, 128],
  [185, 90],
  [215, 100],
  [250, 55],
  [280, 68],
  [328, 16],
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
  const [x0, y0] = PATH_POINTS[i0],
    [x1, y1] = PATH_POINTS[i1];
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
const WALKER_W = 15,
  WALKER_H = WALKER_W * (240 / 74); // proporção real do recorte original (74x240px)
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
      <rect
        width={WALKER_W}
        height={TOP_H}
        fill={color}
        mask={`url(#${maskTop})`}
        style={{ transition: "fill .6s ease" }}
      />
      <g className={walking ? `sf-legL-${uid}` : undefined} style={legStyle(0)}>
        <mask id={maskLegL}>
          <image
            href="/scala/walker-leg-left.png"
            x={0}
            y={LEGS_Y}
            width={LEG_PIECE_W}
            height={LEGS_H}
            preserveAspectRatio="none"
          />
        </mask>
        <rect
          x={0}
          y={LEGS_Y}
          width={LEG_PIECE_W}
          height={LEGS_H}
          fill={color}
          mask={`url(#${maskLegL})`}
          style={{ transition: "fill .6s ease" }}
        />
      </g>
      <g className={walking ? `sf-legR-${uid}` : undefined} style={legStyle(WALKER_W)}>
        <mask id={maskLegR}>
          <image
            href="/scala/walker-leg-right.png"
            x={WALKER_W - LEG_PIECE_W}
            y={LEGS_Y}
            width={LEG_PIECE_W}
            height={LEGS_H}
            preserveAspectRatio="none"
          />
        </mask>
        <rect
          x={WALKER_W - LEG_PIECE_W}
          y={LEGS_Y}
          width={LEG_PIECE_W}
          height={LEGS_H}
          fill={color}
          mask={`url(#${maskLegR})`}
          style={{ transition: "fill .6s ease" }}
        />
      </g>
    </g>
  );
}

/* Linha única de crescimento com o bonequinho andando até o fim. Ao aparecer na tela, sempre
 * completa o percurso inteiro (do começo ao fim), bem devagar — nunca para no meio. O número
 * sobe de "hoje" até a "meta" junto com o bonequinho; os dois viram verde ao chegar no topo.
 * Pensado pra nunca travar: a posição final (e, no pior caso, o valor final) são garantidos
 * por um temporizador, não só por requestAnimationFrame (que o navegador pausa se a aba for
 * pra segundo plano). */
export default function ClimbChart({ current, goal, acc }: { current: number; goal: number; acc: string }) {
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
    return () => {
      clearTimeout(kick);
      cancelAnimationFrame(raf);
      clearTimeout(safety);
    };
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
          <rect
            x="0"
            y={VIEW_TOP}
            width={on ? 340 : 0}
            height={VIEW_H}
            style={{ transition: `width ${DUR}ms linear` }}
          />
        </clipPath>
      </defs>
      <path
        d={PATH_D}
        fill="none"
        stroke="url(#climbGrad)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        clipPath="url(#climbClip)"
        style={{ filter: `drop-shadow(0 0 5px ${alpha(acc, 0.65)})` }}
      />
      <g style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, transition: `transform ${DUR}ms linear` }}>
        <text
          x="0"
          y={-WALKER_H - 10}
          textAnchor="middle"
          fontSize="15"
          fontWeight="800"
          fill={color}
          style={{ transition: "fill .6s ease" }}
        >
          {brl(val)}
        </text>
        <Walker color={color} uid="climb" walking={!done} />
      </g>
    </svg>
  );
}
