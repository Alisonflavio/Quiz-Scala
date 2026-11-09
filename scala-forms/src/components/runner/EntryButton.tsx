"use client";
import { useEffect, useRef, useState } from "react";

/* Botão de entrada do diagnóstico (só a 1ª tela, sem histórico de navegação ainda). Uma luz
 * percorre a borda em loop, desenhada com SVG (não CSS conic-gradient): assim ela anda pelo
 * contorno de verdade, em velocidade constante, sem distorcer nos cantos ou no lado mais comprido
 * de um botão retangular. Mede o próprio tamanho via ResizeObserver pra desenhar o retângulo certo.
 * No hover (só desktop): pulsa pra frente e troca de laranja pra preto (texto vira laranja). */
export default function EntryButton({
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
