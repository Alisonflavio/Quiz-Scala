"use client";
import { useState } from "react";
import { alpha, onColor } from "@/lib/theme";
import type { FormDoc } from "@/lib/types";

/* A pessoa corrige renda, aumento e horas e o diagnóstico é recalculado */
export default function FixScreen({
  doc,
  vars,
  acc,
  onDone,
}: {
  doc: FormDoc;
  vars: Record<string, string>;
  acc: string;
  onDone: (v: Record<string, string>) => void;
}) {
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
              <select
                value={v[k]}
                onChange={(e) => setV({ ...v, [k]: e.target.value })}
                className="mt-1.5 block w-full rounded-xl border border-white/20 bg-black/40 p-3.5 text-base"
              >
                {f.options.map((o) => (
                  <option key={o.id} value={o.value || o.label}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        return (
          <label key={k} className="mb-3 block text-sm opacity-80">
            {label}
            <input
              type="text"
              inputMode="numeric"
              value={v[k] ?? ""}
              onChange={(e) => setV({ ...v, [k]: e.target.value })}
              placeholder={f.placeholder}
              className="mt-1.5 block w-full rounded-xl border border-white/20 bg-black/40 p-3.5 text-base"
            />
          </label>
        );
      })}
      <button
        onClick={() => onDone(v)}
        className="mt-2 w-full rounded-2xl p-4 text-lg font-bold"
        style={{ background: acc, color: onColor(acc) }}
      >
        Refazer meu diagnóstico
      </button>
    </div>
  );
}
