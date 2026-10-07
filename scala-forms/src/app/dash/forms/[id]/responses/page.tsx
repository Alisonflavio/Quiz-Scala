import Link from "next/link";
import { notFound } from "next/navigation";
import FormHeader from "@/components/FormHeader";
import {
  CopyLink,
  DeleteResponse,
  PrintButton,
  TempBadge,
  TemperaturePicker,
} from "@/components/responses/ResponseTools";
import { requireUser } from "@/lib/auth";
import { answerText } from "@/lib/engine";
import { getForm } from "@/lib/forms";
import { flatten, listResponses } from "@/lib/responses";
import type { ResponseRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const fmt = (d: string | Date | null) =>
  d
    ? new Date(d).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : "";

export default async function ResponsesPage(props: PageProps<"/dash/forms/[id]/responses">) {
  await requireUser();
  const { id } = await props.params;
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const form = await getForm(id);
  if (!form) notFound();
  const doc = form.published ?? form.draft;
  const filters = { status: sp.status ?? "", temp: sp.temp ?? "", q: sp.q ?? "" };
  const rows = await listResponses(id, filters);
  const table = sp.table === "1";
  const nameField = doc.fields.find((f) => f.type === "name") ?? doc.fields.find((f) => f.type === "email");
  const displayName = (r: ResponseRow) =>
    (nameField ? answerText(nameField, r.answers[nameField.id]) : "") || "Anônimo";
  const qs = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, table: table ? "1" : "", sel: sp.sel, ...p })) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `?${s}` : "";
  };
  const idx = Math.max(
    0,
    rows.findIndex((r) => r.id === sp.sel),
  );
  const sel = rows[idx];
  const exportQs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();

  const toolbar = (
    <>
      <label className="flex items-center gap-2 text-gray-500">
        Tabela
        <Link
          href={qs({ table: table ? "" : "1" })}
          className={`relative h-7 w-14 rounded-full ${table ? "bg-brand" : "bg-gray-300"}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${table ? "left-8" : "left-1"}`} />
        </Link>
      </label>
      <details className="sm:relative">
        <summary className="btn-outline cursor-pointer list-none">
          Filtros{(filters.status || filters.temp || filters.q) && " •"}
        </summary>
        <form className="absolute inset-x-4 z-30 mt-2 space-y-3 sm:inset-x-auto sm:right-0 sm:w-72 rounded-md bg-surface p-4 shadow-lg ring-1 ring-gray-200">
          {table && <input type="hidden" name="table" value="1" />}
          <label className="block text-sm text-gray-600">
            Buscar
            <input name="q" defaultValue={filters.q} className="input mt-1" placeholder="Nome, e-mail, telefone..." />
          </label>
          <label className="block text-sm text-gray-600">
            Situação
            <select name="status" defaultValue={filters.status} className="input mt-1">
              <option value="">Todas</option>
              <option value="complete">Completas</option>
              <option value="partial">Parciais (abandonaram)</option>
            </select>
          </label>
          <label className="block text-sm text-gray-600">
            Temperatura
            <select name="temp" defaultValue={filters.temp} className="input mt-1">
              <option value="">Todas</option>
              <option value="quente">🔥 Quente</option>
              <option value="morno">🌤 Morno</option>
              <option value="frio">🧊 Frio</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button className="btn-primary flex-1">Aplicar</button>
            <Link href={table ? "?table=1" : "?"} className="btn-outline">
              Limpar
            </Link>
          </div>
        </form>
      </details>
      <a href={`/api/forms/${id}/export${exportQs ? `?${exportQs}` : ""}`} className="btn-outline">
        ☁ Exportar
      </a>
      <a href={`/f/${id}`} target="_blank" className="btn-outline">
        👁 Ver
      </a>
    </>
  );

  if (table) {
    const flat = rows.map((r) => flatten(doc, r, form.title));
    const cols: string[] = [];
    for (const r of flat)
      for (const k of Object.keys(r)) if (!cols.includes(k) && k !== "formulario" && k !== "resposta_id") cols.push(k);
    return (
      <>
        <FormHeader id={id} title={form.title} active="responses" right={toolbar} />
        <div className="overflow-auto p-6">
          <div className="mb-4 text-2xl text-gray-800">{rows.length} respostas.</div>
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th
                    key={c}
                    className="whitespace-nowrap border-b-2 border-gray-200 px-3 py-2 text-left font-semibold text-gray-600"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flat.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {cols.map((c) => (
                    <td key={c} className="max-w-72 truncate border-b border-gray-100 px-3 py-2 text-gray-800">
                      {String(r[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <>
      <FormHeader id={id} title={form.title} active="responses" right={toolbar} />
      <div className="flex flex-col lg:h-[calc(100vh-5rem)] lg:flex-row">
        <aside className="max-h-80 w-full shrink-0 overflow-y-auto border-b border-gray-200 lg:max-h-none lg:w-[360px] lg:border-b-0 lg:border-r xl:w-[500px]">
          <div className="border-b-4 border-gray-100 px-6 py-5 text-3xl text-gray-800">{rows.length} respostas.</div>
          {rows.length === 0 && (
            <p className="p-6 text-gray-500">
              Nenhuma resposta {filters.status || filters.temp || filters.q ? "com esses filtros" : "ainda"}.
            </p>
          )}
          {rows.map((r) => (
            <Link
              key={r.id}
              href={qs({ sel: r.id })}
              className={`flex items-center gap-3 border-b border-gray-200 px-6 py-5 text-lg ${r.id === sel?.id ? "text-brand" : "text-gray-800 hover:bg-gray-50"}`}
            >
              <span className={r.id === sel?.id ? "font-semibold" : ""}>{r.number}.</span>
              <span className={`min-w-0 flex-1 truncate ${r.id === sel?.id ? "font-semibold" : ""}`}>
                {displayName(r)}
              </span>
              {r.status === "partial" && (
                <span className="rounded bg-gray-100 px-1.5 text-xs text-gray-500">parcial</span>
              )}
              <TempBadge t={r.temperature_manual ?? r.temperature} />
            </Link>
          ))}
        </aside>

        <section className="min-w-0 flex-1 bg-slate-100 px-3 py-6 sm:px-6 sm:py-10 lg:overflow-y-auto print:bg-white">
          {sel ? (
            <div className="mx-auto max-w-5xl overflow-hidden rounded-lg bg-surface shadow-sm">
              <div className="h-1.5 bg-brand" />
              <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
                <div className="text-sm text-gray-500">
                  <div>Data de início: {fmt(sel.created_at)}</div>
                  {sel.completed_at && <div>Finalizado em: {fmt(sel.completed_at)}</div>}
                  <div>Identificador: {sel.id}</div>
                  <div className="mt-1">
                    {sel.status === "complete"
                      ? "✅ Resposta completa"
                      : "⏳ Parcial: a pessoa não terminou o formulário"}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 print:hidden">
                  <span className="rounded-md bg-indigo-50 px-3 py-1.5 text-brand">
                    <b className="text-2xl font-normal">{sel.score}</b> Pontos
                  </span>
                  <TemperaturePicker
                    formId={id}
                    responseId={sel.id}
                    auto={sel.temperature}
                    manual={sel.temperature_manual}
                  />
                  <CopyLink />
                  <PrintButton />
                  <Link
                    href={qs({ sel: rows[idx - 1]?.id })}
                    className={`text-2xl ${idx > 0 ? "text-gray-700 hover:text-brand" : "pointer-events-none text-gray-300"}`}
                  >
                    ←
                  </Link>
                  <Link
                    href={qs({ sel: rows[idx + 1]?.id })}
                    className={`text-2xl ${idx < rows.length - 1 ? "text-gray-700 hover:text-brand" : "pointer-events-none text-gray-300"}`}
                  >
                    →
                  </Link>
                </div>
              </div>

              {doc.fields
                .filter((f) => f.type !== "welcome" && f.type !== "thankyou")
                .map((f) => {
                  const txt = answerText(f, sel.answers[f.id]);
                  const phone = f.type === "phone" ? txt.replace(/\D/g, "") : "";
                  return (
                    <div key={f.id} className="border-t border-gray-200 px-7 py-6">
                      <div className="text-brand">{f.title}</div>
                      <div className="mt-2 flex items-center gap-3 text-xl text-gray-800">
                        {txt ? (
                          f.type === "multiple_choice" ? (
                            `- ${txt}`
                          ) : (
                            txt
                          )
                        ) : (
                          <span className="text-base italic text-gray-400">sem resposta</span>
                        )}
                        {phone && (
                          <a
                            target="_blank"
                            href={`https://wa.me/${phone.length <= 11 ? "55" + phone : phone}`}
                            title="Abrir no WhatsApp"
                            className="text-base text-emerald-400"
                          >
                            🟢 WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}

              {(() => {
                const flat = flatten(doc, sel, form.title);
                const extra = [
                  "diagnostico",
                  "gargalo",
                  "renda_meta",
                  "prisao_pct",
                  "meta_pct",
                  "confirmou_diagnostico",
                  "video_assistido",
                  "clicou_whatsapp",
                ].filter((k) => flat[k] !== undefined && flat[k] !== "");
                return extra.length ? (
                  <div className="border-t border-gray-200 bg-orange-50/40 px-7 py-6">
                    <div className="mb-3 font-semibold text-gray-700">Resultado do diagnóstico</div>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      {extra.map((k) => (
                        <div key={k}>
                          <dt className="inline text-gray-500">{k}: </dt>
                          <dd className="inline text-gray-800">{String(flat[k])}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null;
              })()}

              <div className="border-t border-gray-200 bg-gray-50 px-7 py-6">
                <div className="mb-3 font-semibold text-gray-700">Origem (UTMs)</div>
                <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2 text-sm">
                  {(
                    [
                      ["Source", "utm_source"],
                      ["Medium", "utm_medium"],
                      ["Campaign", "utm_campaign"],
                      ["Term", "utm_term"],
                      ["Content", "utm_content"],
                      ["Gclid", "gclid"],
                      ["FBclid", "fbclid"],
                    ] as const
                  ).map(([label, key]) => (
                    <div key={key} className="contents">
                      <dt className="font-semibold text-gray-500">{label}:</dt>
                      <dd className="break-all text-gray-800">
                        {sel.utm?.[key] || <span className="text-gray-400">Não informado</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {sel.webhook_log?.length > 0 && (
                <div className="border-t border-gray-200 px-7 py-6 text-sm">
                  <div className="mb-2 font-semibold text-gray-700">Envios para integrações</div>
                  {sel.webhook_log.map((l, i) => (
                    <div key={i} className={l.ok ? "text-emerald-300" : "text-rose-400"}>
                      {l.ok ? "✓" : "✕"} {l.target} · {fmt(l.at)} {l.status ? `· HTTP ${l.status}` : ""} {l.error ?? ""}
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-gray-200 px-7 py-4 print:hidden">
                <DeleteResponse formId={id} responseId={sel.id} />
              </div>
            </div>
          ) : (
            <div className="mt-20 text-center text-gray-500">Nenhuma resposta selecionada.</div>
          )}
        </section>
      </div>
    </>
  );
}
