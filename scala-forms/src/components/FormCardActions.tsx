"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteFormAction, duplicateFormAction } from "@/app/dash/actions";

export default function FormCardActions({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, start] = useTransition();
  const link = () => `${location.origin}/f/${id}`;
  return (
    <div className="relative flex items-center gap-4 px-1 text-gray-500 transition sm:opacity-0 sm:group-hover:opacity-100">
      <Link href={`/dash/forms/${id}/editor`} title="Editar" className="hover:text-brand">✎</Link>
      <a href={`/f/${id}`} target="_blank" title="Ver" className="hover:text-brand">👁</a>
      <button
        title="Copiar link"
        className="hover:text-brand"
        onClick={() => { navigator.clipboard.writeText(link()); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      >
        {copied ? "✓" : "🔗"}
      </button>
      <button onClick={() => setOpen(!open)} className="hover:text-brand">▾</button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-44 rounded-2xl bg-surface py-1 text-gray-700 shadow-lg ring-1 ring-gray-200">
          <button className="block w-full px-4 py-2 text-left hover:bg-gray-50" onClick={() => { setOpen(false); start(() => duplicateFormAction(id)); }}>
            Duplicar
          </button>
          <button
            className="block w-full px-4 py-2 text-left text-rose-400 hover:bg-rose-50"
            onClick={() => { if (confirm(`Excluir "${title}" e todas as respostas? Isso não pode ser desfeito.`)) start(() => deleteFormAction(id)); }}
          >
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}
