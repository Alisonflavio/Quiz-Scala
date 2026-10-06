"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Toggle from "@/components/ui/Toggle";
import type { FormDoc } from "@/lib/types";

/* Pontuação por resposta + faixas de temperatura do lead (frio / morno / quente) */
export default function ScoringModal({ doc, count, onChange, onClose }: {
  doc: FormDoc; count: number; onChange: (fn: (d: FormDoc) => FormDoc) => void; onClose: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const questions = doc.fields.filter((f) => f.type === "multiple_choice");
  const temp = doc.settings.temperature;
  const range = (id: string) => {
    const pts = (questions.find((q) => q.id === id)?.options ?? []).map((o) => Number(o.points) || 0);
    return pts.length ? `${Math.min(...pts)} → ${Math.max(...pts)} PONTOS` : "SEM OPÇÕES";
  };
  const max = questions.reduce((s, q) => s + Math.max(0, ...(q.options ?? []).map((o) => Number(o.points) || 0)), 0);

  const setPoints = (fid: string, oid: string, points: number) =>
    onChange((d) => ({
      ...d,
      fields: d.fields.map((f) => (f.id !== fid ? f : { ...f, options: f.options?.map((o) => (o.id === oid ? { ...o, points } : o)) })),
    }));
  const setValue = (fid: string, oid: string, value: string) =>
    onChange((d) => ({
      ...d,
      fields: d.fields.map((f) => (f.id !== fid ? f : { ...f, options: f.options?.map((o) => (o.id === oid ? { ...o, value } : o)) })),
    }));
  const setTemp = (p: Partial<typeof temp>) =>
    onChange((d) => ({ ...d, settings: { ...d.settings, temperature: { ...d.settings.temperature, ...p } } }));

  return (
    <Modal title="Pontuação" onClose={onClose} wide>
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <div className="text-xl text-gray-800">Temperatura do lead</div>
          <div className="text-brand/80">Classifica cada resposta em frio, morno ou quente pela pontuação total.</div>
        </div>
        <Toggle on={temp.enabled} onChange={(v) => setTemp({ enabled: v })} />
      </div>
      {temp.enabled && (
        <div className="mb-6 grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-4 text-sm">
          <label className="block">
            <span className="font-semibold text-sky-300">🧊 Frio</span>: de 0 até
            <input type="number" className="input mt-1" value={temp.coldMax} onChange={(e) => setTemp({ coldMax: Number(e.target.value) })} />
          </label>
          <label className="block">
            <span className="font-semibold text-amber-400">🌤 Morno</span>: até
            <input type="number" className="input mt-1" value={temp.warmMax} onChange={(e) => setTemp({ warmMax: Number(e.target.value) })} />
          </label>
          <div>
            <span className="font-semibold text-rose-400">🔥 Quente</span>: acima de {temp.warmMax}
            <div className="mt-3 text-gray-500">Máximo possível: <b>{max}</b> pontos</div>
          </div>
        </div>
      )}

      <p className="mb-2 text-sm text-gray-500">
        Atribua pontos a cada resposta. {count === 0 && "Adicione perguntas de múltipla escolha para pontuar."}
      </p>
      <div className="divide-y divide-gray-200">
        {questions.map((q) => (
          <div key={q.id} className="py-3">
            <button className="flex w-full items-center justify-between gap-4 text-left" onClick={() => setOpen(open === q.id ? null : q.id)}>
              <span className="text-gray-800">{q.title}</span>
              <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{range(q.id)}</span>
            </button>
            {open === q.id && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-[1fr_90px_130px] gap-2 text-xs text-gray-400">
                  <span>Resposta</span><span>Pontos</span><span>Valor da variável</span>
                </div>
                {q.options?.map((o) => (
                  <div key={o.id} className="grid grid-cols-[1fr_90px_130px] items-center gap-2">
                    <span className="text-gray-700">{o.label}</span>
                    <input type="number" className="input py-1.5" value={o.points} onChange={(e) => setPoints(q.id, o.id, Number(e.target.value))} />
                    <input className="input py-1.5 font-mono text-sm" value={o.value ?? ""} placeholder="(texto)" onChange={(e) => setValue(q.id, o.id, e.target.value)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="btn-primary mt-6" onClick={onClose}>Salvar</button>
    </Modal>
  );
}
