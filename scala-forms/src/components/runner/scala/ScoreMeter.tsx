"use client";
import { useEffect, useState } from "react";
import { scoreLevel } from "@/lib/scala";
import { alpha } from "@/lib/theme";

/* Score de carreira: número grande contando até o valor + barra enchendo. Os dois são garantidos
 * por setTimeout (rAF/intervalos podem ser pausados com a aba em segundo plano), então o valor
 * final sempre aparece. */
export default function ScoreMeter({
  score,
  muted,
  track,
  text,
}: {
  score: number;
  muted: string;
  track: string;
  text: string;
}) {
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
    return () => {
      clearTimeout(kick);
      clearInterval(id);
      clearTimeout(safety);
    };
  }, [score]);
  return (
    <div
      className="mb-7 p-5"
      style={{ border: `2px solid ${color}`, background: alpha(color, 0.08), borderRadius: 18 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold uppercase tracking-wider" style={{ color: muted }}>
          Seu score
        </span>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
          style={{ background: alpha(color, 0.18), color }}
        >
          {label}
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <b className="text-[56px] font-extrabold leading-none" style={{ color }}>
          {val}
        </b>
        <span className="text-xl font-bold" style={{ color: text }}>
          /100
        </span>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full" style={{ background: track }}>
        <div
          className="h-full rounded-full"
          style={{
            width: on ? `${score}%` : "0%",
            background: color,
            transition: "width 1.3s cubic-bezier(.2,.7,.2,1)",
          }}
        />
      </div>
    </div>
  );
}
