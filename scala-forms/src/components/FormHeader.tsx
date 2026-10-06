import Link from "next/link";
import type { ReactNode } from "react";

const TABS = [
  { key: "editor", label: "Editor" },
  { key: "options", label: "Opções" },
  { key: "share", label: "Compartilhar" },
  { key: "responses", label: "Respostas" },
] as const;

export type FormTab = (typeof TABS)[number]["key"];

export default function FormHeader({ id, title, active, right }: { id: string; title: string; active: FormTab | "integrations"; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 grid h-20 grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 bg-[#14181e]/80 px-6 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-4 pr-6">
        <Link href="/dash" className="text-2xl text-gray-700 hover:text-brand" title="Voltar">←</Link>
        <span className="truncate text-lg text-gray-800">{title}</span>
        <span className="hidden italic text-gray-500 xl:inline">Performance</span>
      </div>
      <nav className="flex gap-7">
        {TABS.map((t) => {
          const on = active === t.key || (active === "integrations" && t.key === "options");
          return (
            <Link key={t.key} href={`/dash/forms/${id}/${t.key}`} className={`border-b-2 pb-1 text-[17px] ${on ? "border-gray-900 text-gray-900" : "border-transparent text-gray-700 hover:text-brand"}`}>
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-end gap-3">{right}</div>
    </header>
  );
}
