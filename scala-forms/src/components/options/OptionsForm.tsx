"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteAllResponsesAction, deleteFormAction } from "@/app/dash/actions";
import Modal from "@/components/ui/Modal";
import Toggle from "@/components/ui/Toggle";
import Upload from "@/components/ui/Upload";
import { fontHref } from "@/lib/theme";
import { FONTS, type Field, type Theme } from "@/lib/types";
import { Line, Section, useSettings } from "./SettingsShell";

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="min-w-0 text-xl text-gray-800">{label}</span>
      <div className="flex shrink-0 items-center gap-3">
        <label
          className="relative h-11 w-11 cursor-pointer overflow-hidden rounded-full border border-gray-200"
          style={{ background: value }}
        >
          <input
            type="color"
            value={value.length === 7 ? value : "#000000"}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <input
          className="input w-36 text-xl sm:w-52"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
        />
      </div>
    </div>
  );
}

export default function OptionsForm({ id, fields }: { id: string; fields: Field[] }) {
  const { title, setTitle, theme, setTheme, settings, setSettings } = useSettings();
  const [shareOpen, setShareOpen] = useState(false);
  const [pending, start] = useTransition();
  const inputs = fields.filter((f) => f.type !== "welcome" && f.type !== "thankyou" && f.type !== "multiple_choice");

  return (
    <>
      <h1 className="mb-12 text-4xl font-bold text-gray-800 sm:text-5xl">Configurações</h1>
      <div className="border-b border-gray-200 pb-14">
        <label className="text-xl text-gray-800">Título do formulário:</label>
        <input
          className="input mt-2 py-3 text-xl"
          value={title}
          maxLength={60}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="mt-1 text-right text-sm text-brand/60">{title.length}/60</div>
      </div>

      <Section title="Personalizar estilo" subtitle="Adicione o seu logotipo e cores personalizadas.">
        <Color label="Cor do botão:" value={theme.buttonColor} onChange={(v) => setTheme({ buttonColor: v })} />
        <Color label="Cor da pergunta:" value={theme.questionColor} onChange={(v) => setTheme({ questionColor: v })} />
        <Color label="Cor da resposta:" value={theme.answerColor} onChange={(v) => setTheme({ answerColor: v })} />
        <Color label="Cor de fundo:" value={theme.bgColor} onChange={(v) => setTheme({ bgColor: v })} />
        <Line
          title="Imagem de fundo:"
          desc="Essa imagem irá aparecer no fundo do seu formulário. Cuidado com o contraste."
        >
          <Upload value={theme.bgImage} onChange={(u) => setTheme({ bgImage: u })} />
        </Line>
        <Line title="Logotipo" desc="Se desejar, adicione um logotipo. Ele aparece no topo do formulário.">
          <Upload value={theme.logo} onChange={(u) => setTheme({ logo: u })} />
        </Line>
        <Line title="Posição do logotipo" desc="A posição na página onde seu logotipo será exibido.">
          <select
            className="input py-3 text-lg"
            value={theme.logoPosition}
            onChange={(e) => setTheme({ logoPosition: e.target.value as Theme["logoPosition"] })}
          >
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </select>
        </Line>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <div className="text-xl text-gray-800">Fonte</div>
            <div className="mb-2 text-gray-600">{FONTS.length} fontes para escolher</div>
            <label className="block rounded-md border border-gray-300 px-5 py-4">
              <span className="text-gray-600">Fonte</span>
              <link rel="stylesheet" href={fontHref(theme.font)} />
              <select
                className="block w-full bg-transparent text-2xl font-bold text-gray-800 outline-none"
                style={{ fontFamily: `"${theme.font}"` }}
                value={theme.font}
                onChange={(e) => setTheme({ font: e.target.value })}
              >
                {FONTS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <div className="text-xl text-gray-800">Bordas</div>
            <div className="mb-2 text-gray-600">Bordas mais redondas ou quadradas?</div>
            <div className="rounded-md border border-gray-300 px-8 py-4 text-center">
              <input
                type="range"
                min={0}
                max={30}
                value={theme.radius}
                onChange={(e) => setTheme({ radius: Number(e.target.value) })}
                className="w-full accent-brand"
              />
              <div
                className="mt-3 inline-block bg-slate-600 px-7 py-2.5 text-lg text-white"
                style={{ borderRadius: theme.radius }}
              >
                Botão de exemplo
              </div>
            </div>
          </div>
        </div>
        <Line title="Idioma do formulário">
          <select className="input py-3" disabled>
            <option>Português</option>
          </select>
        </Line>
        <Line
          title="Compartilhamento"
          desc="Defina o título, a descrição e a imagem exibidos ao compartilhar seu formulário."
          right={
            <button className="btn-outline" onClick={() => setShareOpen(true)}>
              Configurar
            </button>
          }
        />
      </Section>

      <Section title="Integrações" subtitle="Conecte o seu formulário a planilhas, Make, CRMs e pixels.">
        <Link href={`/dash/forms/${id}/integrations`} className="btn-outline w-fit">
          Configurar integrações
        </Link>
      </Section>

      <Section title="Pontuação e temperatura do lead">
        <Line
          title="Classificar leads em frio, morno e quente"
          desc={
            <>
              Frio até {settings.temperature.coldMax} pontos · morno até {settings.temperature.warmMax} · quente acima
              disso. Os pontos de cada resposta são definidos no Editor, em “Pontuação”.
            </>
          }
          right={
            <Toggle
              on={settings.temperature.enabled}
              onChange={(v) => setSettings({ temperature: { ...settings.temperature, enabled: v } })}
            />
          }
        >
          {settings.temperature.enabled && (
            <div className="flex flex-wrap items-center gap-3 text-gray-700">
              Frio até{" "}
              <input
                type="number"
                className="input w-24"
                value={settings.temperature.coldMax}
                onChange={(e) =>
                  setSettings({ temperature: { ...settings.temperature, coldMax: Number(e.target.value) } })
                }
              />
              Morno até{" "}
              <input
                type="number"
                className="input w-24"
                value={settings.temperature.warmMax}
                onChange={(e) =>
                  setSettings({ temperature: { ...settings.temperature, warmMax: Number(e.target.value) } })
                }
              />
              <span>Quente acima de {settings.temperature.warmMax}</span>
            </div>
          )}
        </Line>
      </Section>

      <Section title="Rastreio e variáveis personalizadas">
        <Line
          title="Salvar parâmetros UTM, GCLID e FBCLID"
          desc={
            <>
              Você pode adicionar qualquer um dos parâmetros{" "}
              <i>utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid</i> e <i>fbclid</i> no seu link.
            </>
          }
          right={<Toggle on={settings.saveUtm} onChange={(v) => setSettings({ saveUtm: v })} />}
        />
        <Line
          title="Adicionar UTMs em links"
          desc="Se você estiver usando um final com redirecionamento para um site externo, iremos adicionar os parâmetros UTMs nesse link."
          right={<Toggle on={settings.utmOnLinks} onChange={(v) => setSettings({ utmOnLinks: v })} />}
        />
      </Section>

      <Section title="Limites de envio e Acesso">
        <Line
          title="Limitar envio duplicado"
          desc="Selecione um campo que só pode ser preenchido uma vez por cada pessoa"
          right={
            <Toggle
              on={!!settings.limitDuplicateFieldId}
              onChange={(v) => setSettings({ limitDuplicateFieldId: v ? (inputs[0]?.id ?? "") : "" })}
            />
          }
        >
          {!!settings.limitDuplicateFieldId && (
            <select
              className="input"
              value={settings.limitDuplicateFieldId}
              onChange={(e) => setSettings({ limitDuplicateFieldId: e.target.value })}
            >
              {inputs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          )}
        </Line>
        <Line
          title="Bloquear novos envios"
          desc="Fecha seu formulário e evita que novas pessoas enviem dados"
          right={<Toggle on={settings.blocked} onChange={(v) => setSettings({ blocked: v })} />}
        />
      </Section>

      <div className="mt-14 rounded-md border-2 border-rose-500 bg-rose-50 p-10">
        <div className="text-xl font-semibold text-rose-400">Zona perigosa</div>
        <div className="text-lg text-rose-400">Atenção, as ações abaixo não podem ser revertidas. Tenha cuidado.</div>
        <div className="mt-10 text-xl font-semibold text-gray-800">Excluir todas as respostas</div>
        <p className="text-gray-700">
          Eventualmente é necessário recomeçar do zero. Essa opção exclui todas as respostas deste formulário. Faça um
          backup primeiro ;)
        </p>
        <button
          className="btn-danger mt-3"
          disabled={pending}
          onClick={() => {
            if (confirm("Excluir TODAS as respostas deste formulário?")) start(() => deleteAllResponsesAction(id));
          }}
        >
          Excluir respostas
        </button>
        <div className="my-8 border-t border-rose-200" />
        <div className="text-xl font-semibold text-gray-800">Excluir formulário</div>
        <p className="text-gray-700">Excluir formulário e respostas</p>
        <button
          className="btn-danger mt-3"
          disabled={pending}
          onClick={() => {
            if (confirm("Excluir este formulário e todas as respostas?")) start(() => deleteFormAction(id));
          }}
        >
          Excluir formulário
        </button>
      </div>

      {shareOpen && (
        <Modal title="Compartilhamento" onClose={() => setShareOpen(false)}>
          <div className="space-y-4">
            <label className="block">
              <span className="label">Título</span>
              <input
                className="input mt-1"
                value={settings.share.title}
                onChange={(e) => setSettings({ share: { ...settings.share, title: e.target.value } })}
                placeholder={title}
              />
            </label>
            <label className="block">
              <span className="label">Descrição</span>
              <textarea
                className="input mt-1"
                rows={3}
                value={settings.share.description}
                onChange={(e) => setSettings({ share: { ...settings.share, description: e.target.value } })}
              />
            </label>
            <div>
              <span className="label mb-2">Imagem (1200×630)</span>
              <Upload
                value={settings.share.image}
                onChange={(u) => setSettings({ share: { ...settings.share, image: u } })}
              />
            </div>
            <button className="btn-primary" onClick={() => setShareOpen(false)}>
              Ok
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
