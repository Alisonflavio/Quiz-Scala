"use client";
import { useRef, useState } from "react";

/* Envia uma imagem para o app e devolve a URL dela */
export default function Upload({
  value,
  onChange,
  accept = "image/*",
}: {
  value: string;
  onChange: (url: string) => void;
  accept?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const send = async (file: File) => {
    setErr("");
    if (file.size > 3.5 * 1024 * 1024) return setErr("Arquivo maior que 3,5 MB.");
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) return setErr("Não foi possível enviar o arquivo.");
    onChange((await res.json()).url);
  };
  const name = value ? decodeURIComponent(value.split("/").pop() || "arquivo") : "";
  return (
    <div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className={`btn min-w-56 border ${value ? "border-emerald-500 text-emerald-400" : "border-gray-300 text-gray-600"} bg-surface`}
        >
          {busy ? "Enviando..." : value ? `✓ ${name.length > 24 ? name.slice(0, 24) + "…" : name}` : "Enviar arquivo"}
        </button>
        {value && (
          <button
            type="button"
            title="Remover"
            onClick={() => onChange("")}
            className="text-xl text-gray-600 hover:text-rose-400"
          >
            🗑
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => e.target.files?.[0] && send(e.target.files[0])}
      />
      {err && <p className="mt-1 text-sm text-rose-400">{err}</p>}
    </div>
  );
}
