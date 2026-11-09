/* Peças visuais pequenas do Diagnóstico Scala: etiqueta, número animado, item de lista e destaque em **negrito**. */
"use client";
import { alpha } from "@/lib/theme";

export function Tag({ acc, children }: { acc: string; children: React.ReactNode }) {
  return (
    <span
      className="mb-5 inline-block rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
      style={{ background: alpha(acc, 0.15), color: acc, border: `1px solid ${alpha(acc, 0.4)}` }}
    >
      {children}
    </span>
  );
}

export function Num({
  label,
  value,
  sub,
  color,
  muted,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  muted: string;
}) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: alpha(muted, 0.08) }}>
      <span className="block text-xs" style={{ color: alpha(muted, 0.6) }}>
        {label}
      </span>
      <b className="block text-[17px] leading-tight" style={{ color }}>
        {value}
      </b>
      {sub && (
        <span className="block text-xs" style={{ color: alpha(muted, 0.6) }}>
          {sub}
        </span>
      )}
    </div>
  );
}

export const GOAL_GREEN = "#2FBF71";
export const CRITICAL_RED = "#FF5A5A";

/* Troca o trecho entre ** ** por negrito na cor dada */
export function rich(text: string, color: string) {
  return text.split("**").map((part, i) =>
    i % 2 ? (
      <b key={i} style={{ color }}>
        {part}
      </b>
    ) : (
      part
    ),
  );
}

/* Uma linha de lista com ícone redondo: vermelha para o problema, verde para a necessidade */
export function Item({
  color,
  icon,
  children,
  text,
}: {
  color: string;
  icon: string;
  children: React.ReactNode;
  text: string;
}) {
  return (
    <li
      className="flex items-center gap-3 p-3.5 text-[15.5px] leading-snug"
      style={{
        background: alpha(color, 0.1),
        border: `1px solid ${alpha(color, 0.35)}`,
        borderRadius: 16,
        color: text,
      }}
    >
      <span
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-extrabold"
        style={{ background: color, color: "#0B0E12" }}
      >
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}
