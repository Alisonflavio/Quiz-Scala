import { NextResponse } from "next/server";
import { json, query } from "@/lib/db";
import { getForm } from "@/lib/forms";
import { dispatchIntegrations, getResponse } from "@/lib/responses";

const EVENTS = ["validou_sim", "validou_nao", "corrigiu", "clicou_whatsapp", "clicou_botao", "baixou_arquivo", "video_play", "video_25", "video_50", "video_75", "video_100"];

/* Eventos do diagnóstico (confirmou, corrigiu, clicou no WhatsApp): ficam na resposta e são enviados às integrações */
export async function POST(req: Request, ctx: RouteContext<"/api/f/[id]/event">) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { responseId?: string; event?: string; vars?: Record<string, string> };
  if (!body.responseId || !body.event || !EVENTS.includes(body.event)) return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  const form = await getForm(id);
  const r = await getResponse(body.responseId);
  if (!form?.published || !r || r.form_id !== id) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const ev = { event: body.event, at: new Date().toISOString() };
  const patch: Record<string, unknown> = {};
  // se a pessoa corrigiu renda/aumento/horas no diagnóstico, guarda os valores corrigidos
  if (body.event === "corrigiu" && body.vars) {
    patch.correcao = { renda: body.vars.renda, aumento: body.vars.aumento, horas: body.vars.horas };
  }
  // o evento é anexado direto no banco: eventos quase simultâneos não se sobrescrevem
  await query(
    "UPDATE responses SET meta = jsonb_set(meta || $3::jsonb, '{events}', coalesce(meta->'events', '[]'::jsonb) || $2::jsonb), updated_at = now() WHERE id = $1",
    [r.id, json([ev]), json(patch)],
  );
  const updated = await getResponse(r.id);
  // o progresso do vídeo só fica guardado na resposta (painel); não vai para webhook/planilha
  if (updated && !body.event.startsWith("video_")) await dispatchIntegrations(form.published, updated, form.title, body.event);
  return NextResponse.json({ ok: true });
}
