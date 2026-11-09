import Link from "next/link";
import type { ResponseFilters } from "@/lib/responses";

/** Barra do topo das respostas: alternar tabela, filtros/busca, exportar CSV e ver o formulário. */
export default function ResponsesToolbar({
  formId,
  table,
  filters,
  toggleTableHref,
  exportQs,
}: {
  formId: string;
  table: boolean;
  filters: Required<ResponseFilters>;
  toggleTableHref: string;
  exportQs: string;
}) {
  const id = formId;
  return (
    <>
      <label className="flex items-center gap-2 text-gray-500">
        Tabela
        <Link href={toggleTableHref} className={`relative h-7 w-14 rounded-full ${table ? "bg-brand" : "bg-gray-300"}`}>
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
}
