"use client";
import { FIELD_TYPES, type Field } from "@/lib/types";

type Props = {
  fields: Field[];
  selId?: string;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAdd: () => void;
};

export default function FieldList({ fields, selId, onSelect, onDuplicate, onAdd }: Props) {
  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-r border-gray-200 xl:w-[420px]">
      <div className="flex-1 overflow-y-auto">
        {fields.map((f, i) => {
          const t = FIELD_TYPES.find((x) => x.type === f.type);
          const on = f.id === selId;
          return (
            <div
              key={f.id}
              onClick={() => onSelect(f.id)}
              className={`group flex cursor-pointer items-center gap-4 border-b border-gray-200 py-4 pl-4 pr-3 ${on ? "border-l-4 border-l-gray-400 bg-surface" : "border-l-4 border-l-transparent hover:bg-gray-50"}`}
            >
              <span className="w-6 text-center text-xl text-gray-500">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className={`truncate ${on ? "text-gray-900" : "text-gray-600"}`}>{f.title || "Sem título"}</div>
                <span className={`mt-1 inline-block rounded px-2 py-0.5 text-sm ${t?.color}`}>{t?.label}</span>
                {f.logicEnabled && !!f.logic?.length && <span className="ml-2 text-xs text-brand">lógica</span>}
              </div>
              <button
                title="Duplicar"
                onClick={(e) => { e.stopPropagation(); onDuplicate(f.id); }}
                className="text-gray-400 opacity-0 hover:text-brand group-hover:opacity-100"
              >
                ⧉
              </button>
            </div>
          );
        })}
      </div>
      <div className="border-t border-gray-200 p-4">
        <button onClick={onAdd} className="btn-outline-brand w-full">Adicionar campo</button>
      </div>
    </aside>
  );
}
