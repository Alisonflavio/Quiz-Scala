"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { publishAction, saveDraftAction } from "@/app/dash/actions";
import FormHeader from "@/components/FormHeader";
import { stable } from "@/lib/stable";
import { newField, uid } from "@/lib/templates";
import { FIELD_TYPES, type Field, type FieldType, type FormDoc, typeLabel } from "@/lib/types";
import FieldList from "./FieldList";
import FieldPreview from "./FieldPreview";
import FieldSettings from "./FieldSettings";
import LogicPanel from "./LogicPanel";
import MediaModal from "./MediaModal";
import ScoringModal from "./ScoringModal";

type Props = { id: string; initialTitle: string; initialDoc: FormDoc; publishedJson: string | null };

export default function EditorApp({ id, initialTitle, initialDoc, publishedJson }: Props) {
  const [title] = useState(initialTitle);
  const [doc, setDoc] = useState<FormDoc>(initialDoc);
  const [selId, setSelId] = useState(initialDoc.fields[0]?.id ?? "");
  const [published, setPublished] = useState(publishedJson);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [panel, setPanel] = useState<"none" | "logic">("none");
  const [modal, setModal] = useState<"none" | "scoring" | "media" | "add">("none");
  const [pending, start] = useTransition();
  const first = useRef(true);

  const sel = doc.fields.find((f) => f.id === selId) ?? doc.fields[0];
  const isPublished = published !== null && published === stable(doc);

  /* salvamento automático do rascunho */
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSaveState("saving");
    const t = setTimeout(() => {
      saveDraftAction(id, title, doc).then(() => setSaveState("saved")).catch(() => setSaveState("error"));
    }, 700);
    return () => clearTimeout(t);
  }, [doc, id, title]);

  const updateField = useCallback((fid: string, patch: Partial<Field>) => {
    setDoc((d) => ({ ...d, fields: d.fields.map((f) => (f.id === fid ? { ...f, ...patch } : f)) }));
  }, []);

  const moveField = (fid: string, dir: -1 | 1) => {
    setDoc((d) => {
      const i = d.fields.findIndex((f) => f.id === fid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.fields.length) return d;
      const fields = [...d.fields];
      [fields[i], fields[j]] = [fields[j], fields[i]];
      return { ...d, fields };
    });
  };

  const addField = (type: FieldType) => {
    const f = newField(type, doc.fields.length);
    // evita variável repetida
    if (f.key && doc.fields.some((x) => x.key === f.key)) f.key = `${f.key}_${doc.fields.length + 1}`;
    setDoc((d) => {
      const i = d.fields.findIndex((x) => x.id === selId);
      const fields = [...d.fields];
      // agradecimentos ficam no fim: novas perguntas entram antes do primeiro agradecimento
      const firstThanks = fields.findIndex((x) => x.type === "thankyou");
      let at = i >= 0 ? i + 1 : fields.length;
      if (type !== "thankyou" && firstThanks >= 0 && at > firstThanks) at = firstThanks;
      if (type === "thankyou") at = fields.length;
      fields.splice(at, 0, f);
      return { ...d, fields };
    });
    setSelId(f.id);
    setModal("none");
  };

  const duplicateField = (fid: string) => {
    const src = doc.fields.find((f) => f.id === fid);
    if (!src) return;
    const copy: Field = {
      ...structuredClone(src),
      id: uid(),
      key: src.key ? `${src.key}_copia` : "",
      options: src.options?.map((o) => ({ ...o, id: uid() })),
      logic: [],
    };
    setDoc((d) => {
      const i = d.fields.findIndex((f) => f.id === fid);
      const fields = [...d.fields];
      fields.splice(i + 1, 0, copy);
      return { ...d, fields };
    });
    setSelId(copy.id);
  };

  const removeField = (fid: string) => {
    if (!confirm("Remover este campo? As respostas já recebidas continuam salvas.")) return;
    setDoc((d) => {
      const fields = d.fields
        .filter((f) => f.id !== fid)
        // limpa regras de lógica que apontavam para o campo removido
        .map((f) => ({ ...f, logic: f.logic?.filter((r) => r.goTo !== fid) }));
      return { ...d, fields };
    });
    const i = doc.fields.findIndex((f) => f.id === fid);
    setSelId(doc.fields[i + 1]?.id ?? doc.fields[i - 1]?.id ?? "");
  };

  const changeType = (fid: string, type: FieldType) => {
    const f = doc.fields.find((x) => x.id === fid);
    if (!f) return;
    const base = newField(type, doc.fields.indexOf(f));
    updateField(fid, {
      type,
      options: type === "multiple_choice" ? f.options ?? base.options : f.options,
      key: f.key || base.key,
      required: type === "welcome" || type === "thankyou" ? false : f.required,
      buttonLabel: f.buttonLabel ?? base.buttonLabel,
      ending: type === "thankyou" ? f.ending ?? "simple" : f.ending,
      logic: type === "multiple_choice" ? f.logic : f.logic?.filter((r) => r.kind === "points"),
    });
  };

  const publish = () =>
    start(async () => {
      await publishAction(id, title, doc);
      setPublished(stable(doc));
      setSaveState("saved");
    });

  const scoredCount = useMemo(() => doc.fields.filter((f) => f.type === "multiple_choice").length, [doc.fields]);

  return (
    <div className="flex h-screen flex-col">
      <FormHeader
        id={id}
        title={title}
        active="editor"
        right={
          <>
            <span className="mr-1 hidden text-sm text-gray-400 2xl:inline">
              {saveState === "saving" ? "Salvando..." : saveState === "error" ? "Erro ao salvar" : "Rascunho salvo"}
            </span>
            <a href={`/f/${id}?preview=1`} target="_blank" className="btn-outline">👁 Ver</a>
            <button
              className="btn-outline"
              title="Copiar link"
              onClick={() => navigator.clipboard.writeText(`${location.origin}/f/${id}`)}
            >
              ⤴
            </button>
            {isPublished ? (
              <button className="btn bg-gray-400 text-white" disabled>✓ Publicado</button>
            ) : (
              <button className="btn-primary" onClick={publish} disabled={pending || saveState === "saving"}>
                {pending ? "Publicando..." : "Publicar"}
              </button>
            )}
          </>
        }
      />

      <div className="flex min-h-0 flex-1">
        <FieldList
          fields={doc.fields}
          selId={sel?.id}
          onSelect={(fid) => { setSelId(fid); setPanel("none"); }}
          onDuplicate={duplicateField}
          onAdd={() => setModal("add")}
        />

        {sel && panel === "logic" ? (
          <LogicPanel doc={doc} field={sel} onChange={(p) => updateField(sel.id, p)} onClose={() => setPanel("none")} />
        ) : (
          sel && (
            <FieldSettings
              doc={doc}
              field={sel}
              onChange={(p) => updateField(sel.id, p)}
              onOpenLogic={() => setPanel("logic")}
              onOpenScoring={() => setModal("scoring")}
              onOpenMedia={() => setModal("media")}
              onRemove={() => removeField(sel.id)}
            />
          )
        )}

        <div className="flex min-w-0 flex-1 items-stretch gap-4 overflow-y-auto bg-gray-100 p-6">
          {sel ? (
            <FieldPreview
              doc={doc}
              field={sel}
              index={doc.fields.indexOf(sel)}
              onChange={(p) => updateField(sel.id, p)}
              onChangeType={(t) => changeType(sel.id, t)}
              onOpenMedia={() => setModal("media")}
            />
          ) : (
            <div className="m-auto text-gray-500">Adicione um campo para começar.</div>
          )}
          {sel && (
            <div className="flex flex-col justify-center gap-10 text-3xl">
              <button title="Mover para cima" onClick={() => moveField(sel.id, -1)} className="text-gray-800 hover:text-brand">↑</button>
              <button title="Adicionar campo" onClick={() => setModal("add")} className="text-brand">＋</button>
              <button title="Mover para baixo" onClick={() => moveField(sel.id, 1)} className="text-gray-800 hover:text-brand">↓</button>
            </div>
          )}
        </div>
      </div>

      {modal === "add" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setModal("none")}>
          <div className="w-full max-w-lg rounded-lg bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Adicionar campo</h2>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_TYPES.map((t) => (
                <button key={t.type} onClick={() => addField(t.type)} className={`rounded-md px-4 py-3 text-left font-medium ${t.color} hover:ring-2 hover:ring-brand/30`}>
                  {typeLabel(t.type)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {modal === "scoring" && (
        <ScoringModal doc={doc} count={scoredCount} onChange={setDoc} onClose={() => setModal("none")} />
      )}
      {modal === "media" && sel && (
        <MediaModal media={sel.media ?? null} onChange={(m) => updateField(sel.id, { media: m })} onClose={() => setModal("none")} />
      )}
    </div>
  );
}
