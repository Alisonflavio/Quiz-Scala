"use client";
import { useState } from "react";
import Toggle from "@/components/ui/Toggle";
import { uid } from "@/lib/templates";
import type { Field, FormDoc, LogicRule } from "@/lib/types";

/* Lógica do campo, no formato do Respondi: "Por resposta" (se a resposta for X, pule para Y) ou "Por pontos" */
export default function LogicPanel({ doc, field: f, onChange, onClose }: {
  doc: FormDoc; field: Field; onChange: (p: Partial<Field>) => void; onClose: () => void;
}) {
  const rules = f.logic ?? [];
  const hasAnswerRules = rules.some((r) => r.kind === "answer");
  const hasPointRules = rules.some((r) => r.kind === "points");
  const [mode, setMode] = useState<"pick" | "answer" | "points">(
    hasAnswerRules ? "answer" : hasPointRules ? "points" : f.type === "multiple_choice" ? "pick" : "points",
  );
  const idx = doc.fields.findIndex((x) => x.id === f.id);
  const targets = doc.fields.slice(idx + 1);
  const [op, setOp] = useState<"is" | "is_not">("is");
  const [optionId, setOptionId] = useState("");
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(0);
  const [goTo, setGoTo] = useState("");

  const label = (id: string) => {
    const i = doc.fields.findIndex((x) => x.id === id);
    return i < 0 ? "(campo removido)" : `${i + 1}. ${doc.fields[i].title || "Sem título"}`;
  };
  const add = () => {
    if (!goTo) return;
    let r: LogicRule;
    if (mode === "answer") {
      if (!optionId) return;
      r = { id: uid(), kind: "answer", op, optionId, goTo };
    } else {
      r = { id: uid(), kind: "points", min, max, goTo };
    }
    onChange({ logic: [...rules, r], logicEnabled: true });
    setGoTo(""); setOptionId("");
  };
  const remove = (rid: string) => onChange({ logic: rules.filter((r) => r.id !== rid) });

  return (
    <section className="w-[560px] shrink-0 overflow-y-auto border-r border-gray-200 bg-surface xl:w-[640px]">
      <div className="flex items-center justify-between bg-gray-100 px-6 py-4">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800">Fechar →</button>
        <Toggle on={!!f.logicEnabled} onChange={(v) => onChange({ logicEnabled: v })} />
      </div>

      {mode === "pick" ? (
        <div className="p-8 text-center">
          <h3 className="text-2xl text-gray-500">Qual tipo de lógica você precisa?</h3>
          <div className="mt-8 grid grid-cols-2 gap-5">
            <button onClick={() => setMode("answer")} className="rounded-md border border-gray-300 p-6 text-gray-500 hover:border-brand">
              <div className="mb-4">Por resposta</div>
              <div className="mb-4 text-4xl">💬</div>
              <div className="mb-3 text-xl">Se a resposta for X, faça Y</div>
              <div className="text-sm">Ideal para lógicas simples, como pular uma pergunta dependendo da resposta anterior.</div>
            </button>
            <button onClick={() => setMode("points")} className="rounded-md border border-gray-300 p-6 text-gray-500 hover:border-brand">
              <div className="mb-4">Por pontos</div>
              <div className="mb-4 text-4xl">🎯</div>
              <div className="mb-3 text-xl">Se a pontuação for X, faça Y</div>
              <div className="text-sm">Ideal para lead scoring, quiz e testes onde cada resposta tem pesos diferentes.</div>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6">
          <div className="mb-3 grid grid-cols-2 gap-4 font-medium text-brand">
            <div className="flex items-center gap-2">
              {mode === "answer" ? "Se a resposta deste campo:" : "Se a pontuação total atingir:"}
              {f.type === "multiple_choice" && (
                <button className="btn-outline px-2 py-0.5 text-sm font-normal" onClick={() => setMode(mode === "answer" ? "points" : "answer")}>Alterar</button>
              )}
            </div>
            <div className="pl-10">Pular para...</div>
          </div>

          {rules.filter((r) => r.kind === mode).map((r) => (
            <div key={r.id} className="mb-2 flex items-center gap-3 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <span className="flex-1">
                {r.kind === "answer"
                  ? `${r.op === "is" ? "É exatamente" : "Não é"} “${f.options?.find((o) => o.id === r.optionId)?.label ?? "?"}”`
                  : `Entre ${r.min} e ${r.max} pontos`}
              </span>
              <span>→</span>
              <span className="flex-1 truncate">{label(r.goTo)}</span>
              <button onClick={() => remove(r.id)} className="text-gray-400 hover:text-rose-400">✕</button>
            </div>
          ))}

          <div className="mt-4 border-b-2 border-dashed border-gray-300 pb-2 text-gray-500">Adicionar nova regra:</div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {mode === "answer" ? (
              <>
                <select className="input w-40" value={op} onChange={(e) => setOp(e.target.value as "is" | "is_not")}>
                  <option value="is">É exatamente</option>
                  <option value="is_not">Não é</option>
                </select>
                <select className="input w-44" value={optionId} onChange={(e) => setOptionId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {f.options?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </>
            ) : (
              <>
                <span className="input w-24 text-gray-600">Entre</span>
                <input type="number" className="input w-20" value={min} onChange={(e) => setMin(Number(e.target.value))} />
                <span className="text-gray-600">e</span>
                <input type="number" className="input w-20" value={max} onChange={(e) => setMax(Number(e.target.value))} />
              </>
            )}
            <span className="text-2xl">☞</span>
            <select className="input w-48" value={goTo} onChange={(e) => setGoTo(e.target.value)}>
              <option value="">Selecione</option>
              {targets.map((t) => <option key={t.id} value={t.id}>{label(t.id)}</option>)}
            </select>
            <button className="btn-outline-brand" onClick={add}>Adicionar</button>
          </div>
          {mode === "points" && (
            <p className="mt-4 text-sm text-gray-500">A pontuação total considera as respostas dadas até este campo.</p>
          )}
          <div className="mt-8 rounded-md bg-gray-100 p-5 text-gray-500">
            As regras são testadas de cima para baixo; a primeira que bater decide o próximo campo. Se nenhuma bater, o formulário segue a ordem normal.
          </div>
        </div>
      )}
    </section>
  );
}
