"use client";
import { useState, useSyncExternalStore } from "react";

export default function SharePanel({ id }: { id: string }) {
  const origin = useSyncExternalStore(
    () => () => {},
    () => location.origin,
    () => "",
  );
  const [copied, setCopied] = useState("");
  const [mode, setMode] = useState<"normal" | "full">("normal");
  const [w, setW] = useState("100");
  const [wu, setWu] = useState("%");
  const [h, setH] = useState("600");
  const [hu, setHu] = useState("px");
  const [code, setCode] = useState("");
  const link = `${origin}/f/${id}`;
  const copy = (txt: string, k: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(k);
    setTimeout(() => setCopied(""), 1500);
  };
  const gen = () =>
    setCode(
      mode === "full"
        ? `<iframe src="${link}" style="position:fixed;inset:0;width:100%;height:100%;border:0;z-index:9999" allow="autoplay; fullscreen"></iframe>`
        : `<iframe src="${link}" style="width:${w}${wu};height:${h}${hu};border:0" allow="autoplay; fullscreen"></iframe>`,
    );
  const enc = encodeURIComponent(link);
  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col lg:flex-row">
      <aside className="w-full shrink-0 border-b border-gray-200 px-4 py-8 sm:px-11 sm:py-12 lg:w-[480px] lg:border-b-0 lg:border-r">
        <div className="text-lg font-semibold text-gray-800">Link</div>
        <p className="text-gray-700">Envie esse link por e-mail, ou compartilhe nas suas redes sociais.</p>
        <div className="mt-3 flex gap-3">
          <input readOnly value={link} className="input py-3 text-lg" onFocus={(e) => e.target.select()} />
          <button
            className="btn bg-emerald-500 px-6 text-lg text-white hover:bg-emerald-600"
            onClick={() => copy(link, "link")}
          >
            {copied === "link" ? "Copiado" : "Copiar"}
          </button>
        </div>
        <div className="mt-4 flex gap-5 text-gray-500">
          <span>➦</span>
          <a target="_blank" href={`https://www.facebook.com/sharer/sharer.php?u=${enc}`} className="hover:text-brand">
            Facebook
          </a>
          <a target="_blank" href={`https://wa.me/?text=${enc}`} className="hover:text-brand">
            WhatsApp
          </a>
          <a
            target="_blank"
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc}`}
            className="hover:text-brand"
          >
            Linkedin
          </a>
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Dica: adicione UTMs no link dos anúncios, ex.: <code>?utm_source=meta&utm_campaign=scala</code>
        </p>
        <div className="my-10 border-t border-gray-200" />
        <div className="text-lg font-semibold text-gray-800">Código de incorporação</div>
        <p className="text-gray-700">Adicionar o formulário no seu site</p>
        <select
          className="input mt-4 py-3 text-lg"
          value={mode}
          onChange={(e) => setMode(e.target.value as "normal" | "full")}
        >
          <option value="normal">Normal</option>
          <option value="full">Tela cheia</option>
        </select>
        {mode === "normal" && (
          <div className="mt-4 space-y-4">
            {[
              ["Largura", w, setW, wu, setWu],
              ["Altura", h, setH, hu, setHu],
            ].map(([label, val, set, unit, setUnit]) => (
              <div key={label as string} className="flex items-center gap-3">
                <span className="w-20 text-lg text-gray-700">{label as string}</span>
                <input
                  className="input py-3 text-lg"
                  value={val as string}
                  onChange={(e) => (set as (v: string) => void)(e.target.value)}
                />
                <select
                  className="input w-28 py-3"
                  value={unit as string}
                  onChange={(e) => (setUnit as (v: string) => void)(e.target.value)}
                >
                  <option>%</option>
                  <option>px</option>
                  <option>vh</option>
                </select>
              </div>
            ))}
          </div>
        )}
        <button className="btn-primary mt-8 px-7 py-3 text-lg" onClick={gen}>
          Gerar código
        </button>
        {code && (
          <div className="mt-4">
            <textarea
              readOnly
              value={code}
              rows={4}
              className="input font-mono text-xs"
              onFocus={(e) => e.target.select()}
            />
            <button className="btn-outline mt-2" onClick={() => copy(code, "code")}>
              {copied === "code" ? "Copiado" : "Copiar código"}
            </button>
          </div>
        )}
      </aside>
      <div className="grid min-w-0 flex-1 place-items-center bg-slate-100 p-4 sm:p-10">
        <div className="w-full max-w-xl">
          <p className="mb-5 text-center text-xl text-gray-500">Exemplo de como ficará no seu site</p>
          <div className="space-y-3 rounded bg-surface p-6 shadow-sm sm:p-12">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-2 rounded bg-gray-200" />
            ))}
            <div className="grid h-64 place-items-center rounded bg-brand text-lg text-white">Seu formulário aqui</div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-2 rounded bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
