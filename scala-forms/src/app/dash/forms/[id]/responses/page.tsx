import Link from "next/link";
import { notFound } from "next/navigation";
import FormHeader from "@/components/FormHeader";
import Pager from "@/components/responses/Pager";
import ResponseDetail from "@/components/responses/ResponseDetail";
import { TempBadge } from "@/components/responses/ResponseTools";
import ResponsesTable from "@/components/responses/ResponsesTable";
import ResponsesToolbar from "@/components/responses/ResponsesToolbar";
import { requireUser } from "@/lib/auth";
import { answerText } from "@/lib/engine";
import { getForm } from "@/lib/forms";
import { countResponses, flatten, listResponses } from "@/lib/responses";
import type { ResponseRow } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Respostas por página na lista e na tabela. */
const PAGE_SIZE = 50;

/**
 * Respostas do formulário: lista (esquerda) + resposta selecionada (direita), ou modo tabela.
 * Filtros, busca e página ficam na URL (?status=&temp=&q=&page=&sel=&table=1).
 */
export default async function ResponsesPage(props: PageProps<"/dash/forms/[id]/responses">) {
  await requireUser();
  const { id } = await props.params;
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const form = await getForm(id);
  if (!form) notFound();
  const doc = form.published ?? form.draft;
  const filters = { status: sp.status ?? "", temp: sp.temp ?? "", q: sp.q ?? "" };
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const [rows, total] = await Promise.all([
    listResponses(id, filters, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countResponses(id, filters),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const table = sp.table === "1";
  const nameField = doc.fields.find((f) => f.type === "name") ?? doc.fields.find((f) => f.type === "email");
  const displayName = (r: ResponseRow) =>
    (nameField ? answerText(nameField, r.answers[nameField.id]) : "") || "Anônimo";
  const qs = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({
      ...filters,
      table: table ? "1" : "",
      page: page > 1 ? String(page) : "",
      sel: sp.sel,
      ...p,
    }))
      if (v) u.set(k, v);
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
    <ResponsesToolbar
      formId={id}
      table={table}
      filters={filters}
      toggleTableHref={qs({ table: table ? "" : "1" })}
      exportQs={exportQs}
    />
  );
  const pager = (
    <Pager
      page={page}
      pages={pages}
      prevHref={qs({ page: String(page - 1), sel: "" })}
      nextHref={qs({ page: String(page + 1), sel: "" })}
    />
  );

  if (table) {
    return (
      <>
        <FormHeader id={id} title={form.title} active="responses" right={toolbar} />
        <div className="overflow-auto p-6">
          <div className="mb-4 text-2xl text-gray-800">{total} respostas.</div>
          <ResponsesTable rows={rows.map((r) => flatten(doc, r, form.title))} />
          {pager}
        </div>
      </>
    );
  }

  return (
    <>
      <FormHeader id={id} title={form.title} active="responses" right={toolbar} />
      <div className="flex flex-col lg:h-[calc(100vh-5rem)] lg:flex-row">
        <aside className="max-h-80 w-full shrink-0 overflow-y-auto border-b border-gray-200 lg:max-h-none lg:w-[360px] lg:border-b-0 lg:border-r xl:w-[500px]">
          <div className="border-b-4 border-gray-100 px-6 py-5 text-3xl text-gray-800">{total} respostas.</div>
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
          {pager}
        </aside>

        <section className="min-w-0 flex-1 bg-slate-100 px-3 py-6 sm:px-6 sm:py-10 lg:overflow-y-auto print:bg-white">
          {sel ? (
            <ResponseDetail
              formId={id}
              formTitle={form.title}
              doc={doc}
              sel={sel}
              prevHref={idx > 0 ? qs({ sel: rows[idx - 1].id }) : undefined}
              nextHref={idx < rows.length - 1 ? qs({ sel: rows[idx + 1].id }) : undefined}
            />
          ) : (
            <div className="mt-20 text-center text-gray-500">Nenhuma resposta selecionada.</div>
          )}
        </section>
      </div>
    </>
  );
}
