import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getForm } from "@/lib/forms";
import { respondiPayload } from "@/lib/respondi";

/* Envia uma resposta de exemplo para a URL, para conferir se o Make/planilha está recebendo */
export async function POST(req: Request, ctx: RouteContext<"/api/forms/[id]/test-integration">) {
  if (!(await getUser())) return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const form = await getForm(id);
  const { url, target, format } = (await req.json().catch(() => ({}))) as { url?: string; target?: string; format?: string };
  if (!form || !url || !/^https?:\/\//.test(url)) return NextResponse.json({ ok: false, error: "URL inválida" });
  const sample: Record<string, string | number> = {
    evento: "teste", resposta_id: "teste-" + Date.now(), numero: 0, formulario: form.title, status: "completa",
    pontuacao: 0, temperatura: "morno", iniciado_em: new Date().toISOString(), finalizado_em: new Date().toISOString(),
  };
  for (const f of form.draft.fields) if (f.key && f.type !== "welcome" && f.type !== "thankyou") sample[f.key] = `exemplo de ${f.key}`;
  const body = target === "webhook" && format === "respondi"
    ? respondiPayload(form.draft, { id: String(sample.resposta_id), form_id: id, score: 0, utm: {}, completed_at: new Date() }, form.title, sample)
    : sample;
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erro" });
  }
}
