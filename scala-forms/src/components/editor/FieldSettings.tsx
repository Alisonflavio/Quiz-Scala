"use client";
import Toggle from "@/components/ui/Toggle";
import { SCALA_WA_MESSAGE } from "@/lib/templates";
import AfterSubmitSettings, { VarChips } from "./AfterSubmit";
import Upload from "@/components/ui/Upload";
import type { Field, FormDoc, ScalaEndingConfig } from "@/lib/types";

type Props = {
  doc: FormDoc;
  field: Field;
  onChange: (p: Partial<Field>) => void;
  onOpenLogic: () => void;
  onOpenScoring: () => void;
  onOpenMedia: () => void;
  onRemove: () => void;
};

function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="border-b border-gray-200 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-gray-500">{label}</span>
        {children}
      </div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function FieldSettings({ doc, field: f, onChange, onOpenLogic, onOpenScoring, onOpenMedia, onRemove }: Props) {
  const isChoice = f.type === "multiple_choice";
  const isThanks = f.type === "thankyou";
  const isWelcome = f.type === "welcome";
  const keyTaken = !!f.key && doc.fields.some((x) => x.id !== f.id && x.key === f.key);
  const scala: ScalaEndingConfig = f.scala ?? { whatsapp: "", videoUrl: "", videoPoster: "" };
  const setScala = (p: Partial<ScalaEndingConfig>) => onChange({ scala: { ...scala, ...p } });

  return (
    <section className="w-[330px] shrink-0 overflow-y-auto border-r border-gray-200 px-6 py-2 xl:w-[370px]">
      {!isWelcome && !isThanks && (
        <>
          <Row label="Obrigatória"><Toggle on={f.required} onChange={(v) => onChange({ required: v })} /></Row>
          <div className="border-b border-gray-200 py-3.5">
            <label className="text-gray-500">Variável</label>
            <input
              className={`input mt-2 font-mono text-sm ${keyTaken ? "border-rose-400" : ""}`}
              value={f.key}
              onChange={(e) => onChange({ key: e.target.value.replace(/[^\w]/g, "_").toLowerCase() })}
              placeholder="ex.: renda"
            />
            <p className="mt-1 text-xs text-gray-400">
              {keyTaken ? "Outra pergunta já usa essa variável." : <>Nome usado no webhook, na planilha e nos textos: {"{{"}{f.key || "variavel"}{"}}"}</>}
            </p>
          </div>
        </>
      )}

      {isChoice && (
        <>
          <Row label="Múltipla seleção"><Toggle on={!!f.multiple} onChange={(v) => onChange({ multiple: v })} /></Row>
          <Row label="Embaralhar opções"><Toggle on={!!f.shuffle} onChange={(v) => onChange({ shuffle: v })} /></Row>
          <Row label="Mesma linha"><Toggle on={!!f.sameLine} onChange={(v) => onChange({ sameLine: v })} /></Row>
          <Row label='Adicionar opção "outros"'><Toggle on={!!f.allowOther} onChange={(v) => onChange({ allowOther: v })} /></Row>
        </>
      )}

      {!isThanks && (
        <Row label="Lógica" hint={f.logicEnabled ? `${f.logic?.length ?? 0} regra(s)` : undefined}>
          <div className="flex items-center gap-2">
            {f.logicEnabled && <button className="btn-outline px-2 py-1 text-sm" onClick={onOpenLogic}>Editar</button>}
            <Toggle on={!!f.logicEnabled} onChange={(v) => { onChange({ logicEnabled: v }); if (v) onOpenLogic(); }} />
          </div>
        </Row>
      )}

      {isChoice && (
        <Row label="Pontuação"><button className="btn-outline px-3 py-1" onClick={onOpenScoring}>Configurar</button></Row>
      )}

      {isWelcome && (
        <div className="border-b border-gray-200 py-3.5">
          <label className="text-gray-500">Texto do botão</label>
          <input className="input mt-2" value={f.buttonLabel ?? ""} onChange={(e) => onChange({ buttonLabel: e.target.value })} placeholder="Começar" />
        </div>
      )}

      {isThanks && (
        <>
          <div className="border-b border-gray-200 py-3.5">
            <label className="text-gray-500">Tipo de final</label>
            <select className="input mt-2" value={f.ending ?? "simple"} onChange={(e) => onChange({ ending: e.target.value as Field["ending"] })}>
              <option value="simple">Agradecimento simples</option>
              <option value="scala_diagnosis">Diagnóstico Scala Fitness (resultado personalizado)</option>
            </select>
          </div>
          {f.ending !== "scala_diagnosis" && <AfterSubmitSettings doc={doc} field={f} onChange={onChange} />}
          {f.ending === "scala_diagnosis" && (
            <div className="space-y-4 border-b border-gray-200 py-4">
              <p className="text-xs text-gray-500">
                Usa as variáveis <code>nome</code>, <code>insta</code>, <code>renda</code>, <code>aumento</code>, <code>horas</code> e <code>objetivo</code>, com os valores das opções.
              </p>
              <div>
                <label className="text-gray-500">WhatsApp do especialista</label>
                <input className="input mt-2" value={scala.whatsapp} onChange={(e) => setScala({ whatsapp: e.target.value.replace(/\D/g, "") })} placeholder="5511999998888" />
              </div>
              <div>
                <label className="text-gray-500">Mensagem padrão do WhatsApp</label>
                <textarea
                  className="input mt-2 text-sm"
                  rows={5}
                  value={scala.whatsappMessage ?? SCALA_WA_MESSAGE}
                  onChange={(e) => setScala({ whatsappMessage: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-400">Já aparece escrita no WhatsApp do lead. Também aceita {"{{diagnostico}}"} (ex.: “Especialista em Vendas”):</p>
                <VarChips doc={doc} onPick={(v) => setScala({ whatsappMessage: `${scala.whatsappMessage ?? SCALA_WA_MESSAGE} ${v}` })} />
              </div>
              <div>
                <label className="text-gray-500">Vídeo do depoimento (URL .mp4)</label>
                <input className="input mt-2" value={scala.videoUrl} onChange={(e) => setScala({ videoUrl: e.target.value })} />
              </div>
              <div>
                <label className="mb-2 block text-gray-500">Capa do vídeo</label>
                <Upload value={scala.videoPoster} onChange={(u) => setScala({ videoPoster: u })} />
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-between gap-3 border-b border-gray-200 py-3.5">
        <span className="text-gray-500">Adicionar mídia</span>
        <button className="btn-outline" onClick={onOpenMedia}>{f.media?.url ? "✓ Imagem/Vídeo" : "Imagem/Vídeo"}</button>
      </div>
      <div className="flex items-center justify-between gap-3 py-3.5">
        <span className="text-gray-500">Deletar campo</span>
        <button className="btn-danger" onClick={onRemove}>Remover</button>
      </div>
    </section>
  );
}
