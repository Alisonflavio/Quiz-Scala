"use client";
import { createContext, useContext, useEffect, useState, useTransition, type ReactNode } from "react";
import { saveSettingsAction } from "@/app/dash/actions";
import FormHeader from "@/components/FormHeader";
import type { Settings, Theme } from "@/lib/types";

type Ctx = {
  title: string;
  setTitle: (v: string) => void;
  theme: Theme;
  setTheme: (p: Partial<Theme>) => void;
  settings: Settings;
  setSettings: (p: Partial<Settings>) => void;
};

const SettingsCtx = createContext<Ctx | null>(null);
export const useSettings = () => useContext(SettingsCtx)!;

/* Estado e botão "Salvar" compartilhados pelas páginas Opções e Integrações */
export default function SettingsShell({ id, initialTitle, initialTheme, initialSettings, active, children }: {
  id: string; initialTitle: string; initialTheme: Theme; initialSettings: Settings; active: "options" | "integrations"; children: ReactNode;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [theme, setThemeState] = useState(initialTheme);
  const [settings, setSettingsState] = useState(initialSettings);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  // avisa antes de sair da página com alterações não salvas
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = () =>
    start(async () => {
      await saveSettingsAction(id, title, theme, settings);
      setDirty(false);
      setMsg("Salvo ✓");
      setTimeout(() => setMsg(""), 2000);
    });

  const ctx: Ctx = {
    title,
    setTitle: (v) => { setTitle(v); setDirty(true); },
    theme,
    setTheme: (p) => { setThemeState((t) => ({ ...t, ...p })); setDirty(true); },
    settings,
    setSettings: (p) => { setSettingsState((s) => ({ ...s, ...p })); setDirty(true); },
  };

  return (
    <SettingsCtx.Provider value={ctx}>
      <FormHeader
        id={id}
        title={title}
        active={active}
        right={
          <>
            {msg && <span className="text-sm text-emerald-400">{msg}</span>}
            {dirty && !msg && <span className="text-sm text-amber-400">Alterações não salvas</span>}
            <button className="btn-primary" onClick={save} disabled={pending || !dirty}>{pending ? "Salvando..." : "Salvar"}</button>
          </>
        }
      />
      <main className="mx-auto max-w-[790px] px-5 pb-40 pt-14">{children}</main>
    </SettingsCtx.Provider>
  );
}

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="border-b border-gray-200 py-14 first:pt-0">
      <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
      {subtitle && <p className="mt-1 text-gray-700">{subtitle}</p>}
      <div className="mt-8 space-y-8">{children}</div>
    </section>
  );
}

export function Line({ title, desc, right, badge, children }: { title: string; desc?: ReactNode; right?: ReactNode; badge?: string; children?: ReactNode }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-xl text-gray-800">
            {title}
            {badge && <span className="ml-2 rounded bg-violet-50 px-1.5 py-0.5 align-middle text-xs text-violet-300">{badge}</span>}
          </div>
          {desc && <div className="mt-1 text-gray-600">{desc}</div>}
        </div>
        {right}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
