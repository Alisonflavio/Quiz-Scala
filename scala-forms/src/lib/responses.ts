/* Respostas dos formulários: gravação (parcial/completa), consulta com filtros e disparo de webhook/planilha. */
import "server-only";
import { nanoid } from "nanoid";
import { json, query, queryOne } from "./db";
import { answerText, answerValue, computeScore, temperatureFor, variables } from "./engine";
import { respondiPayload } from "./respondi";
import { safePostJson } from "./safe-fetch";
import { computeScala } from "./scala";
import type { AnswerValue, FormDoc, ResponseRow, Temperature } from "./types";

/** Lista respostas do formulário, mais recentes primeiro. `q` busca texto em qualquer resposta; `temp` usa a temperatura manual quando existe. */
export async function listResponses(formId: string, f: { status?: string; temp?: string; q?: string } = {}) {
  const rows = await query<ResponseRow>(
    `SELECT * FROM responses WHERE form_id = $1
       AND ($2 = '' OR status = $2)
       AND ($3 = '' OR coalesce(temperature_manual, temperature) = $3)
     ORDER BY number DESC`,
    [formId, f.status ?? "", f.temp ?? ""],
  );
  const q = (f.q ?? "").trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => JSON.stringify(r.answers).toLowerCase().includes(q));
}

export async function getResponse(id: string) {
  return queryOne<ResponseRow>("SELECT * FROM responses WHERE id = $1", [id]);
}

export async function setManualTemperature(id: string, t: Temperature | null) {
  await query("UPDATE responses SET temperature_manual = $2, updated_at = now() WHERE id = $1", [id, t]);
}

export async function deleteResponse(id: string) {
  await query("DELETE FROM responses WHERE id = $1", [id]);
}

/** Linha "plana" (sem objetos aninhados) para webhook, planilha e exportação */
export function flatten(doc: FormDoc, r: ResponseRow, formTitle: string) {
  const out: Record<string, string | number> = {
    resposta_id: r.id,
    numero: r.number,
    formulario: formTitle,
    status: r.status === "complete" ? "completa" : "parcial",
    pontuacao: r.score,
    temperatura: r.temperature_manual ?? r.temperature ?? "",
    iniciado_em: new Date(r.created_at).toISOString(),
    finalizado_em: r.completed_at ? new Date(r.completed_at).toISOString() : "",
  };
  for (const f of doc.fields) {
    if (f.type === "welcome" || f.type === "thankyou") continue;
    const k = f.key || f.id;
    out[k] = answerText(f, r.answers[f.id]);
    const val = answerValue(f, r.answers[f.id]);
    if (f.type === "multiple_choice" && val !== out[k]) out[`${k}_valor`] = val;
  }
  // formulários com o final "Diagnóstico Scala" também mandam o resultado calculado
  if (doc.fields.some((f) => f.ending === "scala_diagnosis")) {
    const corr = (r.meta?.correcao ?? {}) as Record<string, string>;
    const sc = computeScala({ ...variables(doc, r.answers), ...corr });
    if (sc) {
      out.diagnostico = sc.label;
      out.gargalo = sc.diagnosis.area;
      out.renda_meta = sc.meta;
      out.prisao_pct = sc.pct;
      out.meta_pct = sc.pctMeta;
    }
    const evs = ((r.meta?.events ?? []) as { event: string }[]).map((e) => e.event);
    out.confirmou_diagnostico = evs.includes("validou_sim") ? "sim" : evs.includes("validou_nao") ? "não" : "";
    out.clicou_whatsapp = r.status === "complete" ? (evs.includes("clicou_whatsapp") ? "sim" : "não") : "";
    const visto = ["video_100", "video_75", "video_50", "video_25"].find((e) => evs.includes(e));
    out.video_assistido = visto ? `${visto.replace("video_", "")}%` : evs.includes("video_play") ? "iniciou" : "";
  }
  for (const [k, v] of Object.entries(r.utm ?? {})) out[k] = v;
  return out;
}

type SaveInput = {
  responseId?: string;
  answers: Record<string, AnswerValue>;
  endingId?: string | null;
  complete: boolean;
  utm?: Record<string, string>;
  meta?: Record<string, unknown>;
};

/** Cria ou atualiza a resposta (salva também quem abandonou no meio) e dispara as integrações */
export async function saveResponse(formId: string, formTitle: string, doc: FormDoc, input: SaveInput) {
  const score = computeScore(doc, input.answers);
  const temperature = temperatureFor(score, doc.settings.temperature);
  let row: ResponseRow | null = input.responseId ? await getResponse(input.responseId) : null;
  if (row && row.form_id !== formId) row = null;
  const wasComplete = row?.status === "complete";

  if (!row) {
    const id = nanoid(16);
    // número sequencial por formulário (como "179. Luana" no Respondi)
    row = await queryOne<ResponseRow>(
      `INSERT INTO responses (id, form_id, number, status, answers, score, temperature, ending_id, utm, meta, completed_at)
       VALUES ($1, $2, (SELECT coalesce(max(number),0)+1 FROM responses WHERE form_id = $2),
               $3, $4::jsonb, $5, $6, $7, $8::jsonb, $9::jsonb, CASE WHEN $3 = 'complete' THEN now() END)
       RETURNING *`,
      [
        id,
        formId,
        input.complete ? "complete" : "partial",
        json(input.answers),
        score,
        temperature,
        input.endingId ?? null,
        json(input.utm ?? {}),
        json(input.meta ?? {}),
      ],
    );
  } else {
    row = await queryOne<ResponseRow>(
      `UPDATE responses SET answers = $2::jsonb, score = $3, temperature = $4,
         status = CASE WHEN status = 'complete' OR $5 THEN 'complete' ELSE 'partial' END,
         ending_id = coalesce($6, ending_id),
         completed_at = CASE WHEN completed_at IS NULL AND $5 THEN now() ELSE completed_at END,
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [row.id, json(input.answers), score, temperature, input.complete, input.endingId ?? null],
    );
  }
  if (!row) throw new Error("Falha ao salvar resposta");

  const justCompleted = input.complete && !wasComplete;
  const trigger = doc.settings.integrationsTrigger;
  if (justCompleted || (trigger === "all" && !input.complete)) {
    await dispatchIntegrations(doc, row, formTitle, justCompleted ? "completa" : "parcial");
  }
  return row;
}

async function post(url: string, body: unknown) {
  try {
    const res = await safePostJson(url, body, 8000);
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Envia a resposta ao webhook e à planilha ativos e registra o resultado em `webhook_log`.
 * No formato "respondi" só envia na conclusão (`evento === "completa"`).
 */
export async function dispatchIntegrations(doc: FormDoc, r: ResponseRow, formTitle: string, evento: string) {
  const s = doc.settings;
  const flat = { evento, ...flatten(doc, r, formTitle) };
  const log: ResponseRow["webhook_log"] = [];
  const jobs: Promise<void>[] = [];
  // no formato do Respondi o webhook recebe um único envio por lead, na conclusão (o cenário do Make não filtra por evento)
  const asRespondi = s.webhook.format === "respondi";
  if (s.webhook.enabled && s.webhook.url && (!asRespondi || evento === "completa")) {
    const body = asRespondi ? respondiPayload(doc, r, formTitle, flat) : flat;
    jobs.push(
      post(s.webhook.url, body).then((x) => void log.push({ at: new Date().toISOString(), target: "webhook", ...x })),
    );
  }
  if (s.sheets.enabled && s.sheets.url) {
    jobs.push(
      post(s.sheets.url, flat).then((x) => void log.push({ at: new Date().toISOString(), target: "planilha", ...x })),
    );
  }
  if (!jobs.length) return;
  await Promise.all(jobs);
  await query("UPDATE responses SET webhook_log = webhook_log || $2::jsonb WHERE id = $1", [r.id, json(log)]);
}

/** `true` se já existe resposta *completa* com o mesmo valor no campo (sem diferenciar maiúsculas), ignorando `exceptId`. */
export async function isDuplicate(formId: string, fieldId: string, value: string, exceptId?: string) {
  const r = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM responses
     WHERE form_id = $1 AND status = 'complete' AND lower(answers->>$2) = lower($3) AND id <> $4`,
    [formId, fieldId, value.trim(), exceptId ?? ""],
  );
  return (r?.n ?? 0) > 0;
}
