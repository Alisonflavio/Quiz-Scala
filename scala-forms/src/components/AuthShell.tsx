import type { ReactNode } from "react";
import AdminBackdrop from "./AdminBackdrop";

/** Moldura das telas de entrada: fundo, logo e cartão central. `footer` fica logo abaixo do cartão. */
export default function AuthShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="admin-root relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#14181e] px-4 py-12">
      <AdminBackdrop />
      <div className="mb-8 flex items-center gap-2.5 text-3xl font-semibold tracking-tight text-white">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-brand text-lg text-white">S</span>
        scala forms
      </div>
      <div className="w-full max-w-sm rounded-[28px] bg-white/[0.06] p-8 ring-1 ring-white/10 backdrop-blur-xl">
        {children}
      </div>
      {footer}
      <p className="mt-8 text-sm text-white/40">Personal Trainer Academy</p>
    </main>
  );
}
