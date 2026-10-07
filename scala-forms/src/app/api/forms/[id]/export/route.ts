import { getUser } from "@/lib/auth";
import { getForm } from "@/lib/forms";
import { flatten, listResponses } from "@/lib/responses";

/* Exporta as respostas em CSV (abre no Excel e no Google Planilhas) */
export async function GET(req: Request, ctx: RouteContext<"/api/forms/[id]/export">) {
  if (!(await getUser())) return new Response("Não autorizado", { status: 401 });
  const { id } = await ctx.params;
  const form = await getForm(id);
  if (!form) return new Response("Não encontrado", { status: 404 });
  const sp = new URL(req.url).searchParams;
  const doc = form.published ?? form.draft;
  const rows = (
    await listResponses(id, { status: sp.get("status") ?? "", temp: sp.get("temp") ?? "", q: sp.get("q") ?? "" })
  ).map((r) => flatten(doc, r, form.title));
  const cols: string[] = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k);
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // ponto e vírgula + BOM: o Excel em português abre com acentos e colunas certas
  const csv = "﻿" + [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\r\n");
  const name =
    form.title
      .normalize("NFD")
      .replace(/[^\w]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "respostas";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-respostas.csv"`,
    },
  });
}
