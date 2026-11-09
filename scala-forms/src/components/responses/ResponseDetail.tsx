import Link from "next/link";
import { answerText } from "@/lib/engine";
import { flatten } from "@/lib/responses";
import type { FormDoc, ResponseRow } from "@/lib/types";
import { fmtDate as fmt } from "./format";
import { CopyLink, DeleteResponse, PrintButton, ResendIntegrations, TemperaturePicker } from "./ResponseTools";

/** Campos do diagnóstico mostrados no quadro "Resultado do diagnóstico" (vêm de `flatten`). */
const DIAGNOSIS_KEYS = [
  "diagnostico",
  "area",
  "gargalo",
  "renda_meta",
  "prisao_pct",
  "meta_pct",
  "confirmou_diagnostico",
  "video_assistido",
  "clicou_whatsapp",
  "aula_assistida",
  "chegou_fim",
  "telefone_corrigido",
];

const UTM_LABELS = [
  ["Source", "utm_source"],
  ["Medium", "utm_medium"],
  ["Campaign", "utm_campaign"],
  ["Term", "utm_term"],
  ["Content", "utm_content"],
  ["Gclid", "gclid"],
  ["FBclid", "fbclid"],
] as const;

/** Cabeçalho: datas, situação, pontos, temperatura e navegação entre respostas. */
function Header({
  formId,
  sel,
  prevHref,
  nextHref,
}: {
  formId: string;
  sel: ResponseRow;
  prevHref?: string;
  nextHref?: string;
}) {
  const id = formId;
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
      <div className="text-sm text-gray-500">
        <div>Data de início: {fmt(sel.created_at)}</div>
        {sel.completed_at && <div>Finalizado em: {fmt(sel.completed_at)}</div>}
        <div>Identificador: {sel.id}</div>
        <div className="mt-1">
          {sel.status === "complete" ? "✅ Resposta completa" : "⏳ Parcial: a pessoa não terminou o formulário"}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <span className="rounded-md bg-indigo-50 px-3 py-1.5 text-brand">
          <b className="text-2xl font-normal">{sel.score}</b> Pontos
        </span>
        <TemperaturePicker formId={id} responseId={sel.id} auto={sel.temperature} manual={sel.temperature_manual} />
        <CopyLink />
        <PrintButton />
        <Link
          href={prevHref ?? "#"}
          className={`text-2xl ${prevHref ? "text-gray-700 hover:text-brand" : "pointer-events-none text-gray-300"}`}
        >
          ←
        </Link>
        <Link
          href={nextHref ?? "#"}
          className={`text-2xl ${nextHref ? "text-gray-700 hover:text-brand" : "pointer-events-none text-gray-300"}`}
        >
          →
        </Link>
      </div>
    </div>
  );
}

/** Pergunta e resposta, uma por bloco; telefone ganha atalho para o WhatsApp. */
function Answers({ doc, sel }: { doc: FormDoc; sel: ResponseRow }) {
  return (
    <>
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
    </>
  );
}

/** Quadro "Resultado do diagnóstico" (só formulários com o final Diagnóstico Scala). */
function Diagnosis({ flat }: { flat: Record<string, string | number> }) {
  const extra = DIAGNOSIS_KEYS.filter((k) => flat[k] !== undefined && flat[k] !== "");
  if (!extra.length) return null;
  return (
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
  );
}

/** Origem do lead (UTMs, gclid, fbclid). */
function Origin({ sel }: { sel: ResponseRow }) {
  return (
    <div className="border-t border-gray-200 bg-gray-50 px-7 py-6">
      <div className="mb-3 font-semibold text-gray-700">Origem (UTMs)</div>
      <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2 text-sm">
        {UTM_LABELS.map(([label, key]) => (
          <div key={key} className="contents">
            <dt className="font-semibold text-gray-500">{label}:</dt>
            <dd className="break-all text-gray-800">
              {sel.utm?.[key] || <span className="text-gray-400">Não informado</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Histórico de envios ao webhook/planilha, com botão de reenviar. */
function IntegrationLog({ formId, sel }: { formId: string; sel: ResponseRow }) {
  const id = formId;
  if (!(sel.webhook_log?.length > 0 || sel.status === "complete")) return null;
  return (
    <div className="border-t border-gray-200 px-7 py-6 text-sm print:hidden">
      <div className="mb-2 font-semibold text-gray-700">Envios para integrações</div>
      {sel.webhook_log?.length ? (
        sel.webhook_log.map((l, i) => (
          <div key={i} className={l.ok ? "text-emerald-300" : "text-rose-400"}>
            {l.ok ? "✓" : "✕"} {l.target} · {fmt(l.at)} {l.status ? `· HTTP ${l.status}` : ""} {l.error ?? ""}
          </div>
        ))
      ) : (
        <div className="text-gray-500">Nenhum envio registrado.</div>
      )}
      {sel.status === "complete" && <ResendIntegrations formId={id} responseId={sel.id} />}
    </div>
  );
}

/** Resposta selecionada: cabeçalho, respostas, diagnóstico, origem, envios e excluir. */
export default function ResponseDetail({
  formId,
  formTitle,
  doc,
  sel,
  prevHref,
  nextHref,
}: {
  formId: string;
  formTitle: string;
  doc: FormDoc;
  sel: ResponseRow;
  prevHref?: string;
  nextHref?: string;
}) {
  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-lg bg-surface shadow-sm">
      <div className="h-1.5 bg-brand" />
      <Header formId={formId} sel={sel} prevHref={prevHref} nextHref={nextHref} />
      <Answers doc={doc} sel={sel} />
      <Diagnosis flat={flatten(doc, sel, formTitle)} />
      <Origin sel={sel} />
      <IntegrationLog formId={formId} sel={sel} />
      <div className="border-t border-gray-200 px-7 py-4 print:hidden">
        <DeleteResponse formId={formId} responseId={sel.id} />
      </div>
    </div>
  );
}
