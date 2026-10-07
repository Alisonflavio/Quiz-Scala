"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Toggle from "@/components/ui/Toggle";
import type { Field, Settings } from "@/lib/types";
import { Line, Section, useSettings } from "./SettingsShell";

const SHEETS_SCRIPT = `// Cole no Google Planilhas: Extensões > Apps Script. Depois: Implantar > Nova implantação > App da Web
// (Executar como: Eu | Quem pode acessar: Qualquer pessoa). Copie a URL e cole no Scala Forms.
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  var headers = sheet.getLastRow() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
  Object.keys(data).forEach(function (k) { if (headers.indexOf(k) < 0) { headers.push(k); sheet.getRange(1, headers.length).setValue(k); } });
  // atualiza a linha da mesma resposta (parcial → completa) ou cria uma nova
  var ids = sheet.getLastRow() > 1 ? sheet.getRange(2, headers.indexOf('resposta_id') + 1, sheet.getLastRow() - 1).getValues().map(String) : [];
  var row = ids.indexOf(String(data.resposta_id));
  var values = headers.map(function (h) { return data[h] !== undefined ? data[h] : ''; });
  if (row >= 0) sheet.getRange(row + 2, 1, 1, values.length).setValues([values]);
  else sheet.appendRow(values);
  return ContentService.createTextOutput('ok');
}`;

type TagKey = "facebookPixel" | "gtm" | "ga" | "tiktok";

function UrlField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const bad = value && !/^https?:\/\/\S+$/.test(value);
  return (
    <>
      <input
        className={`input py-3 text-lg ${bad ? "border-rose-400" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder={placeholder}
      />
      {bad && <p className="mt-1 text-sm text-rose-400">A URL precisa começar com https:// (ou http://)</p>}
    </>
  );
}

export default function IntegrationsForm({ id, fields }: { id: string; fields: Field[] }) {
  const { settings, setSettings } = useSettings();
  const [sheetsHelp, setSheetsHelp] = useState(false);
  const [testMsg, setTestMsg] = useState<Record<string, string>>({});

  const tag = (k: TagKey, p: Partial<Settings[TagKey]>) =>
    setSettings({ [k]: { ...settings[k], ...p } } as Partial<Settings>);

  const test = async (target: "webhook" | "sheets") => {
    setTestMsg((m) => ({ ...m, [target]: "Enviando teste..." }));
    const res = await fetch(`/api/forms/${id}/test-integration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: settings[target].url, target, format: settings.webhook.format }),
    });
    const d = await res.json().catch(() => ({}));
    setTestMsg((m) => ({
      ...m,
      [target]: d.ok
        ? `✓ Recebido (HTTP ${d.status}). Lembre de clicar em Salvar.`
        : `✕ Falhou: ${d.error ?? `HTTP ${d.status}`}`,
    }));
  };

  const TAGS: { k: TagKey; title: string; desc: string; ph: string; badge?: string }[] = [
    {
      k: "gtm",
      title: "Google Tag Manager",
      desc: "Adicione o ID do seu container do GTM",
      ph: "GTM-XXXXXXX",
      badge: "EMPRESA",
    },
    { k: "ga", title: "Google Analytics", desc: "Adicione o ID de Métrica do Google Analytics", ph: "G-XXXXXXXXXX" },
    { k: "facebookPixel", title: "Facebook", desc: "Adicione o ID do seu pixel no Facebook", ph: "123456789012345" },
    { k: "tiktok", title: "Tiktok", desc: "Adicione seu TikTok Events Manager ID", ph: "CXXXXXXXXXXXXXXXXXX" },
  ];

  return (
    <>
      <h1 className="text-4xl font-bold text-gray-800 sm:text-6xl">Integrações</h1>
      <p className="mt-2 text-2xl text-gray-500">Integre seu formulário com milhares de outros serviços online.</p>

      <div className="mt-12">
        <label className="text-xl text-gray-800">Quando deseja ativar as integrações?</label>
        <select
          className="input mt-3 py-3 text-lg"
          value={settings.integrationsTrigger}
          onChange={(e) => setSettings({ integrationsTrigger: e.target.value as Settings["integrationsTrigger"] })}
        >
          <option value="complete">Ativar somente em respostas completas</option>
          <option value="all">Ativar em respostas completas e parciais</option>
        </select>
      </div>

      <div className="mt-10 space-y-10">
        <Line
          title="Webhooks"
          desc="Notifique uma URL com as novas respostas (Make, Zapier, Pluga, n8n, CRM...)"
          right={
            <Toggle
              on={settings.webhook.enabled}
              onChange={(v) => setSettings({ webhook: { ...settings.webhook, enabled: v } })}
            />
          }
        >
          {settings.webhook.enabled && (
            <div className="space-y-2">
              <UrlField
                value={settings.webhook.url}
                onChange={(v) => setSettings({ webhook: { ...settings.webhook, url: v } })}
                placeholder="https://hook.us1.make.com/..."
              />
              <div className="flex items-center gap-3">
                <label htmlFor="webhook-format" className="text-sm text-gray-600">
                  Formato do envio
                </label>
                <select
                  id="webhook-format"
                  className="input w-auto py-2 text-sm"
                  value={settings.webhook.format ?? "padrao"}
                  onChange={(e) =>
                    setSettings({ webhook: { ...settings.webhook, format: e.target.value as "padrao" | "respondi" } })
                  }
                >
                  <option value="padrao">Padrão do Scala Forms</option>
                  <option value="respondi">Igual ao Respondi (um envio por lead)</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="btn-outline text-sm"
                  disabled={!settings.webhook.url}
                  onClick={() => test("webhook")}
                >
                  Enviar teste
                </button>
                <span className="text-sm text-gray-600">{testMsg.webhook}</span>
              </div>
            </div>
          )}
        </Line>

        <Line
          title="Google Planilha"
          desc="Envie automaticamente novas respostas recebidas diretamente para uma planilha do Google"
          right={
            <Toggle
              on={settings.sheets.enabled}
              onChange={(v) => setSettings({ sheets: { ...settings.sheets, enabled: v } })}
            />
          }
        >
          {settings.sheets.enabled && (
            <div className="space-y-2">
              <UrlField
                value={settings.sheets.url}
                onChange={(v) => setSettings({ sheets: { ...settings.sheets, url: v } })}
                placeholder="https://script.google.com/macros/s/.../exec"
              />
              <div className="flex items-center gap-3">
                <button className="btn-outline text-sm" onClick={() => setSheetsHelp(true)}>
                  Como conectar
                </button>
                <button className="btn-outline text-sm" disabled={!settings.sheets.url} onClick={() => test("sheets")}>
                  Enviar teste
                </button>
                <span className="text-sm text-gray-600">{testMsg.sheets}</span>
              </div>
            </div>
          )}
        </Line>

        <div className="rounded-md bg-emerald-50 p-6 text-emerald-300">
          <div className="font-semibold">Quer mandar para um CRM (RD Station, Kommo, Active Campaign...)?</div>
          <p className="mt-1">
            Use o Webhook acima com o Make, Zapier ou Pluga: eles recebem cada resposta e conectam com milhares de
            serviços, incluindo os CRMs.
          </p>
        </div>
      </div>

      <Section
        title="Métricas e conversões"
        subtitle="Os pixels carregam em todas as visitas do formulário, completas ou incompletas."
      >
        {TAGS.map((t) => (
          <Line
            key={t.k}
            title={t.title}
            badge={t.badge}
            desc={t.desc}
            right={<Toggle on={settings[t.k].enabled} onChange={(v) => tag(t.k, { enabled: v })} />}
          >
            {settings[t.k].enabled && (
              <input
                className="input py-3 text-lg"
                value={settings[t.k].id}
                onChange={(e) => tag(t.k, { id: e.target.value })}
                placeholder={t.ph}
              />
            )}
          </Line>
        ))}
      </Section>

      <section className="py-4">
        <h2 className="text-2xl font-semibold text-gray-800">Configurar conversão</h2>
        <p className="mt-1 text-gray-700">
          Você pode determinar a partir de qual momento um preenchimento será considerado uma conversão, e os eventos de
          conversão (Lead no Facebook) serão enviados para as plataformas.
        </p>
        <div className="mt-6 space-y-3">
          <button
            onClick={() => setSettings({ conversion: { mode: "complete", fieldId: "" } })}
            className={`flex w-full items-center gap-3 rounded-md border-2 px-5 py-3 text-left text-xl ${settings.conversion.mode === "complete" ? "border-brand text-brand" : "border-gray-300 text-gray-700"}`}
          >
            ⤮ Ao finalizar o formulário por qualquer caminho
          </button>
          <div
            className={`rounded-md border-2 px-5 py-3 ${settings.conversion.mode === "field" ? "border-brand" : "border-gray-300"}`}
          >
            <button
              onClick={() =>
                setSettings({
                  conversion: { mode: "field", fieldId: settings.conversion.fieldId || fields[1]?.id || "" },
                })
              }
              className={`w-full text-left text-xl ${settings.conversion.mode === "field" ? "text-brand" : "text-gray-700"}`}
            >
              ⚑ Ao chegar em um campo específico
            </button>
            {settings.conversion.mode === "field" && (
              <select
                className="input mt-3"
                value={settings.conversion.fieldId}
                onChange={(e) => setSettings({ conversion: { mode: "field", fieldId: e.target.value } })}
              >
                {fields.slice(1).map((f, i) => (
                  <option key={f.id} value={f.id}>
                    {i + 2}. {f.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </section>

      {sheetsHelp && (
        <Modal title="Conectar com o Google Planilhas" onClose={() => setSheetsHelp(false)} wide>
          <ol className="mb-4 list-decimal space-y-1 pl-5 text-gray-700">
            <li>Crie uma planilha no Google Planilhas.</li>
            <li>
              Vá em <b>Extensões → Apps Script</b>, apague o que estiver lá e cole o código abaixo.
            </li>
            <li>
              Clique em <b>Implantar → Nova implantação → App da Web</b>. Em “Quem pode acessar”, escolha{" "}
              <b>Qualquer pessoa</b>.
            </li>
            <li>
              Autorize, copie a <b>URL do app da Web</b> e cole aqui no campo da Google Planilha.
            </li>
          </ol>
          <p className="mb-2 text-sm text-gray-500">
            A primeira linha vira o cabeçalho automaticamente. Se a pessoa abandonar e depois completar, a mesma linha é
            atualizada.
          </p>
          <pre className="max-h-72 overflow-auto rounded-md bg-gray-900 p-4 text-xs text-emerald-200">
            {SHEETS_SCRIPT}
          </pre>
          <button className="btn-primary mt-4" onClick={() => navigator.clipboard.writeText(SHEETS_SCRIPT)}>
            Copiar código
          </button>
        </Modal>
      )}
    </>
  );
}
