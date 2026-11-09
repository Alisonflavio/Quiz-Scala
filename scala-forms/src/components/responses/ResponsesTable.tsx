/** Modo tabela: uma linha por resposta, uma coluna por variável (mesmos campos da exportação). */
export default function ResponsesTable({ rows }: { rows: Record<string, string | number>[] }) {
  const cols: string[] = [];
  for (const r of rows)
    for (const k of Object.keys(r)) if (!cols.includes(k) && k !== "formulario" && k !== "resposta_id") cols.push(k);
  const flat = rows;
  return (
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
  );
}
