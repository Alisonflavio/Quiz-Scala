"use client";
import { useState, useTransition } from "react";
import { createFormAction } from "@/app/dash/actions";

export default function NewFormButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const pick = (t: "blank" | "scala") => start(() => createFormAction(t));
  return (
    <>
      <button className="btn-primary px-5 py-2.5" onClick={() => setOpen(true)}>
        + Criar novo
      </button>
      {open && (
        <div
          className="fixed inset-0 z-40 grid grid-cols-[minmax(0,1fr)] place-items-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-2xl rounded-3xl bg-surface p-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-2xl font-semibold text-gray-800">Criar novo formulário</h2>
            <p className="mb-6 text-gray-500">Comece do zero ou a partir de um modelo pronto.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                disabled={pending}
                onClick={() => pick("blank")}
                className="rounded-2xl border border-gray-300 p-6 text-left hover:border-brand"
              >
                <div className="mb-2 text-3xl">📄</div>
                <div className="font-semibold text-gray-800">Em branco</div>
                <div className="text-sm text-gray-500">Boas-vindas, uma pergunta e agradecimento.</div>
              </button>
              <button
                disabled={pending}
                onClick={() => pick("scala")}
                className="rounded-2xl border border-gray-300 p-6 text-left hover:border-brand"
              >
                <div className="mb-2 text-3xl">🎯</div>
                <div className="font-semibold text-gray-800">Diagnóstico Scala Fitness</div>
                <div className="text-sm text-gray-500">
                  Quiz de carreira com pontuação, temperatura e resultado personalizado.
                </div>
              </button>
            </div>
            {pending && <p className="mt-4 text-sm text-gray-500">Criando...</p>}
          </div>
        </div>
      )}
    </>
  );
}
