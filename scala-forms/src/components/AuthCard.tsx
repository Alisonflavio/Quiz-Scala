"use client";
import { useActionState } from "react";
import type { AuthState } from "@/app/auth-actions";
import AdminBackdrop from "./AdminBackdrop";

type Props = {
  title: string;
  subtitle: string;
  submit: string;
  action: (s: AuthState, fd: FormData) => Promise<AuthState>;
  withName?: boolean;
};

export default function AuthCard({ title, subtitle, submit, action, withName }: Props) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <main className="admin-root relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#14181e] px-4 py-12">
      <AdminBackdrop />
      <div className="mb-8 flex items-center gap-2.5 text-3xl font-semibold tracking-tight text-white">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-brand text-lg text-white">S</span>
        scala forms
      </div>
      <form action={run} className="w-full max-w-sm rounded-[28px] bg-white/[0.06] p-8 ring-1 ring-white/10 backdrop-blur-xl">
        <h1 className="text-4xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mb-6 mt-1.5 text-white/60">{subtitle}</p>
        <div className="space-y-3">
          {withName && <input name="name" className="auth-input" placeholder="Seu nome" required />}
          <input name="email" type="email" className="auth-input" placeholder="E-mail" required autoComplete="email" />
          <input name="password" type="password" className="auth-input" placeholder="Senha" required autoComplete={withName ? "new-password" : "current-password"} />
        </div>
        {state.error && <p className="mt-3 text-sm text-rose-400">{state.error}</p>}
        <button
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-brand py-3 text-base font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          disabled={pending}
        >
          {pending ? "Aguarde..." : submit}
        </button>
      </form>
      <p className="mt-8 text-sm text-white/40">Personal Trainer Academy</p>
    </main>
  );
}
