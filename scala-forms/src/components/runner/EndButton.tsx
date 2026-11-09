import { afterOf, endButtonLabel, type Field } from "@/lib/types";

/** Botão da tela final: link, WhatsApp (verde, com ícone) ou arquivo. Não aparece sem destino configurado. */
export default function EndButton({ f, btn, onClick }: { f: Field; btn: React.CSSProperties; onClick: () => void }) {
  const kind = afterOf(f);
  const ready =
    (kind === "button_link" && f.buttonUrl) ||
    (kind === "button_whatsapp" && f.whatsappNumber) ||
    (kind === "button_file" && f.fileUrl);
  if (!ready) return null;
  const wa = kind === "button_whatsapp";
  return (
    <div className="mt-10">
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2.5 px-9 py-4 text-lg font-semibold shadow-lg transition hover:brightness-110"
        style={wa ? { ...btn, background: "#25D366", color: "#fff" } : btn}
      >
        {wa && (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z" />
          </svg>
        )}
        {kind === "button_file" && "⤓ "}
        {endButtonLabel(f)}
      </button>
    </div>
  );
}
