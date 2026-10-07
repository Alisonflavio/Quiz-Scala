import Link from "next/link";
import type { ReactNode } from "react";

const TABS = [
  { key: "editor", label: "Editor" },
  { key: "options", label: "Opções" },
  { key: "share", label: "Compartilhar" },
  { key: "responses", label: "Respostas" },
] as const;

export type FormTab = (typeof TABS)[number]["key"];

export default function FormHeader({
  id,
  title,
  active,
  right,
}: {
  id: string;
  title: string;
  active: FormTab | "integrations";
  right?: ReactNode;
}) {
  return (
    <header className="relative z-30 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 bg-[#14181e]/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:sticky lg:top-0 lg:grid lg:h-20 lg:grid-cols-[1fr_auto_1fr] lg:py-0">
      <div className="flex min-w-0 basis-full items-center gap-4 lg:basis-auto lg:pr-6">
        <Link href="/dash" className="text-2xl text-gray-700 hover:text-brand" title="Voltar">
          ←
        </Link>
        <span className="truncate text-lg text-gray-800">{title}</span>
        <span className="hidden italic text-gray-500 xl:inline">Performance</span>
      </div>
      <nav className="order-last -mx-4 flex basis-full gap-6 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:order-none lg:mx-0 lg:basis-auto lg:gap-7 lg:overflow-visible lg:px-0">
        {TABS.map((t) => {
          const on = active === t.key || (active === "integrations" && t.key === "options");
          return (
            <Link
              key={t.key}
              href={`/dash/forms/${id}/${t.key}`}
              className={`shrink-0 border-b-2 pb-1 text-base lg:text-[17px] ${on ? "border-gray-900 text-gray-900" : "border-transparent text-gray-700 hover:text-brand"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex min-w-0 basis-full flex-wrap items-center justify-end gap-3 lg:basis-auto">{right}</div>
    </header>
  );
}
