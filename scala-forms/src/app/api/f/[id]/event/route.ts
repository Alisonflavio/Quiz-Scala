import { NextResponse } from "next/server";
import { json, query } from "@/lib/db";
import { getForm } from "@/lib/forms";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { dispatchIntegrations, getResponse } from "@/lib/responses";

const MAX_EVENTS_PER_RESPONSE = 100;

const EVENTS = [
  "validou_sim",
  "validou_nao",
  "corrigiu",
  "clicou_whatsapp",
  "clicou_botao",
  "baixou_arquivo",
  "video_play",
  "video_25",
  "video_50",
  "video_75",
  "video_100",
  // página de obrigado (/obrigado)
  "telefone_corrigido",
  "abriu_aula",
  "aula_play",
  "aula_25",
  "aula_50",
  "aula_75",
  "aula_100",
  "chegou_fim",
];

/** Eventos de progresso de vídeo: ficam só na resposta (painel), não vão para webhook/planilha. */
const isProgress = (e: string) => e.startsWith("video_") || e.startsWith("aula_");

/* Eventos do diagnóstico (confirmou, corrigiu, clicou no WhatsApp): ficam na resposta e são enviados às integrações */
export async function POST(req: Request, ctx: RouteContext<"/api/f/[id]/event">) {
  const { id } = await ctx.params;
  if (!(await rateLimit("event-ip", `${id}:${clientIp(req.headers)}`, { max: 200, windowSeconds: 600 })))
    return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });
  const parsed = await req.json().catch(() => null);
  const body = (parsed && typeof parsed === "object" ? parsed : {}) as {
    responseId?: string;
    event?: string;
    vars?: Record<string, string>;
  };
  if (!body.responseId || !body.event || !EVENTS.includes(body.event))
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  const form = await getForm(id);
  const r = await getResponse(body.responseId);
  if (!form?.published || !r || r.form_id !== id)
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const ev = { event: body.event, at: new Date().toISOString() };
  const patch: Record<string, unknown> = {};
  // se a pessoa corrigiu renda/aumento/horas no diagnóstico, guarda os valores corrigidos
  if (body.event === "corrigiu" && body.vars) {
    patch.correcao = { renda: body.vars.renda, aumento: body.vars.aumento, horas: body.vars.horas };
  }
  // telefone corrigido na página de obrigado: só dígitos, 10 a 13 (com ou sem 55)
  if (body.event === "telefone_corrigido") {
    const tel = String(body.vars?.telefone ?? "").replace(/\D/g, "");
    if (tel.length < 10 || tel.length > 13) return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
    patch.telefone_corrigido = tel;
  }
  // teto de eventos por resposta: a lista não cresce sem limite se alguém repetir chamadas
  if (((r.meta?.events as unknown[] | undefined)?.length ?? 0) >= MAX_EVENTS_PER_RESPONSE)
    return NextResponse.json({ ok: true });
  // o evento é anexado direto no banco: eventos quase simultâneos não se sobrescrevem
  await query(
    "UPDATE responses SET meta = jsonb_set(meta || $3::jsonb, '{events}', coalesce(meta->'events', '[]'::jsonb) || $2::jsonb), updated_at = now() WHERE id = $1",
    [r.id, json([ev]), json(patch)],
  );
  const updated = await getResponse(r.id);
  if (updated && !isProgress(body.event))
    await dispatchIntegrations(form.published, updated, form.title, body.event);
  return NextResponse.json({ ok: true });
}
