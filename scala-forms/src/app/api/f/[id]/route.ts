import { NextResponse } from "next/server";
import { getForm } from "@/lib/forms";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isDuplicate, saveResponse } from "@/lib/responses";
import { UTM_KEYS } from "@/lib/engine";
import type { AnswerValue } from "@/lib/types";

type Body = {
  responseId?: string;
  answers?: Record<string, AnswerValue>;
  endingId?: string | null;
  complete?: boolean;
  utm?: Record<string, string>;
};

/* Recebe as respostas do formulário público. É chamado a cada pergunta respondida, para guardar também quem abandona. */
export async function POST(req: Request, ctx: RouteContext<"/api/f/[id]">) {
  const { id } = await ctx.params;
  const ip = clientIp(req.headers);
  if (!(await rateLimit("form-ip", `${id}:${ip}`, { max: 300, windowSeconds: 600 })))
    return NextResponse.json({ error: "Muitas requisições. Tente de novo em instantes." }, { status: 429 });
  const form = await getForm(id);
  const doc = form?.published;
  if (!form || !doc) return NextResponse.json({ error: "Formulário não encontrado." }, { status: 404 });
  if (doc.settings.blocked)
    return NextResponse.json({ error: "Este formulário não está aceitando respostas." }, { status: 403 });

  let body: Body;
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("corpo inválido");
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  // só guarda respostas de campos que existem no formulário
  const valid = new Set(doc.fields.map((f) => f.id));
  const answers: Record<string, AnswerValue> = {};
  for (const [k, v] of Object.entries(body.answers ?? {})) {
    if (!valid.has(k)) continue;
    if (typeof v === "string") answers[k] = v.slice(0, 5000);
    else if (v && Array.isArray(v.options))
      answers[k] = {
        options: v.options.map(String).slice(0, 50),
        other: typeof v.other === "string" ? v.other.slice(0, 1000) : undefined,
      };
  }
  const utm: Record<string, string> = {};
  if (doc.settings.saveUtm) for (const k of UTM_KEYS) if (body.utm?.[k]) utm[k] = String(body.utm[k]).slice(0, 300);

  const dupField = doc.settings.limitDuplicateFieldId;
  const dupValue = dupField ? answers[dupField] : undefined;
  if (body.complete && dupField && typeof dupValue === "string" && dupValue.trim()) {
    if (await isDuplicate(id, dupField, dupValue, body.responseId)) {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
  }

  // criar respostas novas é o que enche o banco: teto por IP e formulário
  if (!body.responseId && !(await rateLimit("form-new", `${id}:${ip}`, { max: 40, windowSeconds: 3600 })))
    return NextResponse.json({ error: "Muitas respostas deste endereço. Tente mais tarde." }, { status: 429 });

  const row = await saveResponse(id, form.title, doc, {
    responseId: body.responseId,
    answers,
    endingId: body.endingId ?? null,
    complete: !!body.complete,
    utm,
    meta: {
      userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? "",
      referer: req.headers.get("referer")?.slice(0, 300) ?? "",
    },
  });
  return NextResponse.json({ responseId: row.id, score: row.score, temperature: row.temperature });
}
