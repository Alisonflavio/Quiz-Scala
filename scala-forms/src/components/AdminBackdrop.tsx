const MASK = "radial-gradient(ellipse 65% 55% at 70% 25%, black, transparent 75%)";

/* Fundo da ferramenta: brilho azul-acinzentado + grade de pontinhos, devagar de um lado pro outro.
 * Fica atrás de tudo (-z-10), então o pai precisa ser "isolate" — senão o z-index negativo escapa
 * pra trás do fundo da página e some. */
export default function AdminBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="auth-glow absolute"
        style={{ inset: "-25%", background: "radial-gradient(ellipse 55% 48% at 70% 25%, rgba(120,150,205,.34) 0%, rgba(100,128,180,.22) 28%, rgba(90,115,165,.09) 52%, transparent 75%)" }}
      />
      <div
        className="auth-dots absolute inset-0"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.22) 1.2px, transparent 1.2px)", backgroundSize: "22px 22px", maskImage: MASK, WebkitMaskImage: MASK }}
      />
    </div>
  );
}
