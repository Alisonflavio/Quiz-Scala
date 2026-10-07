"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Upload from "@/components/ui/Upload";
import type { Media } from "@/lib/types";

export default function MediaModal({
  media,
  onChange,
  onClose,
}: {
  media: Media | null;
  onChange: (m: Media | null) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<Media["kind"]>(media?.kind ?? "image");
  const [url, setUrl] = useState(media?.url ?? "");
  const save = () => {
    onChange(url ? { kind, url } : null);
    onClose();
  };
  return (
    <Modal title="Imagem ou vídeo" onClose={onClose}>
      <div className="mb-5 flex gap-2">
        {(["image", "video"] as const).map((k) => (
          <button
            key={k}
            onClick={() => {
              setKind(k);
              setUrl("");
            }}
            className={`btn ${kind === k ? "bg-brand text-white" : "border border-gray-300"}`}
          >
            {k === "image" ? "Imagem" : "Vídeo"}
          </button>
        ))}
      </div>
      {kind === "image" ? (
        <div className="space-y-3">
          <Upload value={url} onChange={setUrl} />
          <p className="hint">ou cole o endereço de uma imagem:</p>
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </div>
      ) : (
        <div className="space-y-2">
          <input
            className="input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Link do YouTube ou de um arquivo .mp4"
          />
          <p className="hint">Vídeos não são enviados para o app: use um link do YouTube ou de um .mp4 hospedado.</p>
        </div>
      )}
      <div className="mt-6 flex gap-3">
        <button className="btn-primary" onClick={save}>
          Salvar
        </button>
        {media && (
          <button
            className="btn-danger"
            onClick={() => {
              onChange(null);
              onClose();
            }}
          >
            Remover mídia
          </button>
        )}
      </div>
    </Modal>
  );
}
