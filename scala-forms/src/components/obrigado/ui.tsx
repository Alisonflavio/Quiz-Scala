/* Peças visuais da página de obrigado (estilos em src/app/obrigado/obrigado.css, classes "obg-*"). */
import type { ReactNode } from "react";

export const LARANJA = "#ff6432";
export const VERDE = "#22c55e";

/** Selo em pílula: verde ("Diagnóstico recebido") ou laranja ("Enquanto isso"). */
export function Badge({ color, children }: { color: "verde" | "laranja"; children: ReactNode }) {
  return <span className={color === "verde" ? "obg-badge-verde" : "obg-badge-laranja"}>{children}</span>;
}

/** Cartão escuro com título pequeno em maiúsculas. `destaque`: borda laranja. */
export function Card({
  label,
  destaque,
  className = "",
  children,
}: {
  label: string;
  destaque?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`obg-card ${destaque ? "obg-card-laranja" : ""} ${className}`}>
      <div className="obg-label mb-4">{label}</div>
      {children}
    </div>
  );
}

/** Bolinha verde com ✓. */
export function Check({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`obg-check ${className}`}
      style={size !== 18 ? { width: size, height: size, fontSize: size / 2 } : undefined}
      aria-hidden="true"
    >
      ✓
    </span>
  );
}

/** Bolinha numerada de etapa: laranja (ativa) ou cinza (pendente). */
export function Step({ n, pendente, style }: { n: number; pendente?: boolean; style?: React.CSSProperties }) {
  return (
    <span className={`obg-step ${pendente ? "pendente" : "ativo"}`} style={style} aria-hidden="true">
      {n}
    </span>
  );
}

/** Botão laranja largo com título e subtítulo. */
export function BigButton({
  title,
  subtitle,
  onClick,
  className = "",
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" className={`obg-btn ${className}`} onClick={onClick}>
      {title}
      <span>{subtitle}</span>
    </button>
  );
}

/** Aviso verde com ícone à esquerda. */
export function Notice({
  icon,
  children,
  className = "",
}: {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-[14px] border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.08)] px-4 py-3 ${className}`}
    >
      {icon}
      <p className="m-0 text-[13px] leading-[1.45] text-[#d4d4d4]">{children}</p>
    </div>
  );
}

/** Frase do rodapé de cada tela. */
export function Footer({ className = "" }: { className?: string }) {
  return <p className={`obg-rodape ${className}`}>Treino muda o corpo. Método muda a carreira.</p>;
}

/** Título grande das telas. */
export function Title({ children }: { children: ReactNode }) {
  return <h1 className="m-0 mb-3 text-left text-[28px] leading-[1.2] font-extrabold tracking-[-0.02em]">{children}</h1>;
}
