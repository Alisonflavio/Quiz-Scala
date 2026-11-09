"use client";
import { useTransition } from "react";
import { restoreVersionAction } from "@/app/dash/actions";
import type { FormVersion } from "@/lib/forms";

const fmt = (d: string | Date) =>
  new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

/** Histórico de versões publicadas, com botão para voltar a uma delas (a primeira da lista é a que está no ar). */
export default function VersionHistory({ formId, versions }: { formId: string; versions: FormVersion[] }) {
  const [pending, start] = useTransition();
  return (
    <section className="mt-14">
      <div className="text-xl font-semibold text-gray-800">Versões publicadas</div>
      <p className="mb-4 text-gray-600">
        Cada &quot;Publicar&quot; fica guardado aqui. Se uma publicação quebrar o formulário, volte para uma versão
        anterior.
      </p>
      {versions.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma versão publicada ainda.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-surface">
          {versions.map((v, i) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium text-gray-800">
                  {fmt(v.published_at)} {i === 0 && <span className="ml-1 text-emerald-500">· no ar</span>}
                </div>
                <div className="truncate text-gray-500">
                  {v.published_by_name ?? "—"}
                  {v.note ? ` · ${v.note}` : ""}
                </div>
              </div>
              {i > 0 && (
                <button
                  className="btn-outline"
                  disabled={pending}
                  onClick={() => {
                    if (
                      confirm(`Voltar o formulário para a versão de ${fmt(v.published_at)}? Ela entra no ar na hora.`)
                    )
                      start(() => restoreVersionAction(formId, v.id));
                  }}
                >
                  Restaurar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
