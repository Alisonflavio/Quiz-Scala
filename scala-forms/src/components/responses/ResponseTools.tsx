"use client";
import { useTransition } from "react";
import { deleteResponseAction, setTemperatureAction } from "@/app/dash/actions";
import type { Temperature } from "@/lib/types";

const TEMP_STYLE: Record<Temperature, string> = {
  frio: "bg-sky-50 text-sky-300 border-sky-200",
  morno: "bg-amber-50 text-amber-300 border-amber-200",
  quente: "bg-rose-50 text-rose-300 border-rose-200",
};
export const TEMP_LABEL: Record<Temperature, string> = { frio: "🧊 Frio", morno: "🌤 Morno", quente: "🔥 Quente" };

export function TempBadge({ t }: { t: Temperature | null }) {
  if (!t) return null;
  return <span className={`rounded border px-2 py-0.5 text-xs font-medium ${TEMP_STYLE[t]}`}>{TEMP_LABEL[t]}</span>;
}

/* Temperatura automática (pela pontuação) com ajuste manual pelo time */
export function TemperaturePicker({ formId, responseId, auto, manual }: { formId: string; responseId: string; auto: Temperature | null; manual: Temperature | null }) {
  const [pending, start] = useTransition();
  const current = manual ?? auto;
  return (
    <div className="flex items-center gap-2">
      <select
        disabled={pending}
        value={manual ?? ""}
        onChange={(e) => start(() => setTemperatureAction(formId, responseId, e.target.value as Temperature | ""))}
        className={`rounded-md border px-2 py-1.5 text-sm font-medium outline-none ${current ? TEMP_STYLE[current] : "border-gray-300"}`}
        title="Temperatura do lead"
      >
        <option value="">{auto ? `${TEMP_LABEL[auto]} (automática)` : "Sem temperatura"}</option>
        <option value="frio">{TEMP_LABEL.frio} (manual)</option>
        <option value="morno">{TEMP_LABEL.morno} (manual)</option>
        <option value="quente">{TEMP_LABEL.quente} (manual)</option>
      </select>
    </div>
  );
}

export function DeleteResponse({ formId, responseId }: { formId: string; responseId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => { if (confirm("Excluir esta resposta?")) start(() => deleteResponseAction(formId, responseId)); }}
      className="text-sm text-rose-400 hover:underline"
    >
      Excluir resposta
    </button>
  );
}

export function CopyLink() {
  return (
    <button title="Copiar link desta resposta" onClick={() => navigator.clipboard.writeText(location.href)} className="text-xl text-gray-600 hover:text-brand">🔗</button>
  );
}

export function PrintButton() {
  return <button title="Imprimir" onClick={() => window.print()} className="text-xl text-gray-600 hover:text-brand">🖨</button>;
}
