"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Toggle from "@/components/ui/Toggle";
import Upload from "@/components/ui/Upload";
import { DEFAULT_WA_MESSAGE, afterOf, endButtonLabel, type AfterSubmit, type Field, type FormDoc } from "@/lib/types";

const OPTIONS: { key: AfterSubmit; icon: string; label: string }[] = [
  { key: "message", icon: "☺", label: "Exibir uma mensagem" },
  { key: "redirect", icon: "🔗", label: "Redirecionar para link" },
  { key: "button_link", icon: "👆", label: "Botão para link" },
  { key: "button_whatsapp", icon: "🟢", label: "Botão para WhatsApp" },
  { key: "button_file", icon: "⤓", label: "Botão para arquivo" },
];

/** Variáveis que podem ir nos links e na mensagem do WhatsApp */
export function VarChips({ doc, onPick }: { doc: FormDoc; onPick: (v: string) => void }) {
  const keys = [
    ...doc.fields.filter((f) => f.key && f.type !== "welcome" && f.type !== "thankyou").map((f) => f.key),
    "utm_source",
    "utm_campaign",
    "utm_content",
  ];
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onPick(`{{${k}}}`)}
          className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600 hover:bg-brand/10 hover:text-brand"
        >
          {`{{${k}}}`}
        </button>
      ))}
    </div>
  );
}

/* "Após o envio" da tela de agradecimento */
export default function AfterSubmitSettings({
  doc,
  field: f,
  onChange,
}: {
  doc: FormDoc;
  field: Field;
  onChange: (p: Partial<Field>) => void;
}) {
  const current = afterOf(f);
  const [open, setOpen] = useState<AfterSubmit | null>(null);

  const choose = (k: AfterSubmit) => {
    onChange({ after: k });
    if (k !== "message") setOpen(k);
  };

  return (
    <div className="border-b border-gray-200 py-4">
      <div className="mb-3 text-gray-500">Após o envio:</div>
      <div className="space-y-2.5">
        {OPTIONS.map((o) => {
          const on = current === o.key;
          return (
            <div
              key={o.key}
              className={`flex items-center rounded-md border-2 ${on ? "border-brand text-brand" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
            >
              <button onClick={() => choose(o.key)} className="flex flex-1 items-center gap-3 px-4 py-3 text-left">
                <span className="w-5 text-center">{o.icon}</span>
                {o.label}
              </button>
              {on && o.key !== "message" && (
                <button title="Configurar" onClick={() => setOpen(o.key)} className="px-3 text-lg hover:opacity-70">
                  ⚙
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-400">{summary(f)}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-gray-500">Exibir pontuação final</span>
        <Toggle on={!!f.showScore} onChange={(v) => onChange({ showScore: v })} />
      </div>

      {open && <ConfigModal kind={open} doc={doc} field={f} onChange={onChange} onClose={() => setOpen(null)} />}
    </div>
  );
}

function summary(f: Field) {
  switch (afterOf(f)) {
    case "redirect":
      return f.redirectUrl ? `Redireciona para ${f.redirectUrl}` : "Configure o link de redirecionamento.";
    case "button_link":
      return f.buttonUrl ? `Botão “${endButtonLabel(f)}” → ${f.buttonUrl}` : "Configure o link do botão.";
    case "button_whatsapp":
      return f.whatsappNumber ? `WhatsApp ${f.whatsappNumber}` : "Configure o número do WhatsApp.";
    case "button_file":
      return f.fileUrl ? `Arquivo: ${decodeURIComponent(f.fileUrl.split("/").pop() ?? "")}` : "Envie o arquivo.";
    default:
      return "Mostra só o título e a descrição da tela.";
  }
}

function ConfigModal({
  kind,
  doc,
  field: f,
  onChange,
  onClose,
}: {
  kind: AfterSubmit;
  doc: FormDoc;
  field: Field;
  onChange: (p: Partial<Field>) => void;
  onClose: () => void;
}) {
  // edição local: só grava no "Salvar"
  const [label, setLabel] = useState(
    (kind === "button_whatsapp" ? f.whatsappLabel : kind === "button_file" ? f.fileLabel : f.buttonLabel) ?? "",
  );
  const [url, setUrl] = useState(kind === "redirect" ? (f.redirectUrl ?? "") : (f.buttonUrl ?? ""));
  const [ddi, setDdi] = useState(() => (f.whatsappNumber ?? "55").match(/^(\d{1,3}?)(\d{10,11})$/)?.[1] || "55");
  const [phone, setPhone] = useState(() => (f.whatsappNumber ?? "").match(/^\d{1,3}?(\d{10,11})$/)?.[1] ?? "");
  const [msg, setMsg] = useState(f.whatsappMessage ?? DEFAULT_WA_MESSAGE);
  const [file, setFile] = useState(f.fileUrl ?? "");
  const [err, setErr] = useState("");

  const titles: Record<AfterSubmit, string> = {
    message: "",
    redirect: "Configurar Redirecionamento",
    button_link: "Configurar Botão para link",
    button_whatsapp: "Configurar Botão para WhatsApp",
    button_file: "Configurar Botão para arquivo",
  };

  const save = () => {
    setErr("");
    if (kind === "redirect" || kind === "button_link") {
      if (!/^https?:\/\/\S+$/.test(url.replace(/\{\{[^}]+\}\}/g, "x")))
        return setErr("Digite um link completo, começando com https://");
      onChange(
        kind === "redirect" ? { redirectUrl: url, after: kind } : { buttonUrl: url, buttonLabel: label, after: kind },
      );
    }
    if (kind === "button_whatsapp") {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) return setErr("Digite o número com DDD.");
      onChange({ whatsappNumber: `${ddi}${digits}`, whatsappMessage: msg, whatsappLabel: label, after: kind });
    }
    if (kind === "button_file") {
      if (!file) return setErr("Envie o arquivo ou cole o link dele.");
      onChange({ fileUrl: file, fileLabel: label, after: kind });
    }
    onClose();
  };

  const fmtPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
  };

  return (
    <Modal title={titles[kind]} onClose={onClose}>
      <div className="space-y-4">
        {kind === "redirect" && (
          <p className="text-lg text-gray-800">
            Após concluir o envio, o respondente será levado automaticamente para o link abaixo.
          </p>
        )}
        {kind === "button_whatsapp" && (
          <p className="text-lg text-gray-800">
            Após concluir o envio, o respondente verá um botão que abre o WhatsApp do número abaixo, com a mensagem já
            escrita.
          </p>
        )}

        {kind !== "redirect" && (
          <label className="block">
            <span className="text-gray-600">Texto do botão</span>
            <input
              className="input mt-1"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                kind === "button_whatsapp"
                  ? "Falar no WhatsApp"
                  : kind === "button_file"
                    ? "Baixar arquivo"
                    : "Continuar"
              }
            />
          </label>
        )}

        {(kind === "redirect" || kind === "button_link") && (
          <label className="block">
            <span className="text-gray-600">Link</span>
            <input
              className="input mt-1"
              value={url}
              onChange={(e) => setUrl(e.target.value.trim())}
              placeholder="https://suapagina.com.br/..."
            />
            <span className="mt-1 block text-xs text-gray-400">
              {doc.settings.utmOnLinks ? "As UTMs de quem respondeu são adicionadas ao link automaticamente. " : ""}Você
              também pode usar variáveis:
            </span>
            <VarChips doc={doc} onPick={(v) => setUrl((u) => u + v)} />
          </label>
        )}

        {kind === "button_whatsapp" && (
          <>
            <div className="flex overflow-hidden rounded-md border border-gray-300 focus-within:border-brand">
              <select
                value={ddi}
                onChange={(e) => setDdi(e.target.value)}
                className="border-r border-gray-300 bg-gray-50 px-2 outline-none"
              >
                <option value="55">🇧🇷 +55</option>
                <option value="1">🇺🇸 +1</option>
                <option value="351">🇵🇹 +351</option>
              </select>
              <input
                className="flex-1 px-3 py-2.5 text-lg tracking-wide outline-none"
                value={fmtPhone(phone)}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="(63) 99999-9999"
                inputMode="numeric"
              />
            </div>
            <label className="block">
              <span className="text-gray-600">Mensagem padrão</span>
              <textarea
                className="input mt-1"
                rows={5}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Mensagem padrão (opcional)"
              />
              <span className="mt-1 block text-xs text-gray-400">
                É o que já aparece escrito no WhatsApp da pessoa. Use variáveis para saber quem é e de onde veio (ex.: a
                campanha do anúncio):
              </span>
              <VarChips doc={doc} onPick={(v) => setMsg((m) => `${m}${m.endsWith(" ") || !m ? "" : " "}${v}`)} />
            </label>
          </>
        )}

        {kind === "button_file" && (
          <div>
            <span className="text-gray-600">Arquivo (PDF ou imagem, até 3,5 MB)</span>
            <div className="mt-2">
              <Upload value={file} onChange={setFile} accept="application/pdf,image/*" />
            </div>
            <p className="mt-3 text-sm text-gray-500">ou cole o link de um arquivo (Google Drive, Dropbox...):</p>
            <input
              className="input mt-1"
              value={file}
              onChange={(e) => setFile(e.target.value.trim())}
              placeholder="https://..."
            />
          </div>
        )}

        {err && <p className="text-sm text-rose-400">{err}</p>}
        <div className="flex gap-3 pt-2">
          <button className="btn-primary px-5" onClick={save}>
            Salvar
          </button>
          <button className="btn-outline px-5" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}
