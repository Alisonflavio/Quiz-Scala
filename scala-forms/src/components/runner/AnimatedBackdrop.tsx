import { alpha } from "@/lib/theme";

/* Fundo com degradê laranja sutil + grade de pontinhos, baseado na referência que o usuário
 * mandou (um brilho suave vindo de um canto, com pontinhos aparecendo mais perto do brilho),
 * só que laranja em vez de azul, e se deslocando devagar de um lado pro outro. */
export default function AnimatedBackdrop({ acc }: { acc: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="sf-glow absolute"
        style={{
          inset: "-25%",
          background: `radial-gradient(ellipse 55% 48% at 78% 22%, rgba(255,190,140,0.45) 0%, ${alpha(acc, 0.32)} 25%, ${alpha(acc, 0.14)} 50%, transparent 75%)`,
        }}
      />
      <div
        className="sf-dots absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,.35) 1.2px, transparent 1.2px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse 65% 55% at 78% 22%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 65% 55% at 78% 22%, black, transparent 75%)",
        }}
      />
      <style>{`
        @keyframes sfDrift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-4%, 2.5%); } }
        .sf-glow, .sf-dots { animation: sfDrift 11s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
