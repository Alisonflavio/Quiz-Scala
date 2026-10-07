"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import type { AuthState } from "@/app/auth-actions";
import AuthShell from "./AuthShell";

type Props = {
  title: string;
  subtitle: string;
  submit: string;
  action: (s: AuthState, fd: FormData) => Promise<AuthState>;
  /** Mostra o campo de nome (cadastro e primeiro acesso). */
  withName?: boolean;
  /** Campo de e-mail (padrão: sim). Some na tela de definir senha, onde o e-mail já vem do link. */
  withEmail?: boolean;
  /** Campo de senha (padrão: sim). Some no pedido de cadastro, que só manda o link por e-mail. */
  withPassword?: boolean;
  /** A senha é nova (cadastro): exige 8+ caracteres e deixa o navegador sugerir uma senha forte. */
  newPassword?: boolean;
  /** Texto do botão enquanto envia (padrão: "Entrando..."). */
  pendingLabel?: string;
  /** Token do link de confirmação, reenviado como campo oculto. */
  token?: string;
  /** Destino depois de entrar, já validado no servidor. */
  next?: string;
  /** Destino do botão "Criar conta" na tela de login. Sem ele o botão não aparece. */
  signupHref?: string;
  /** Na tela de cadastro: link "Já tem conta? Entrar". */
  loginHref?: string;
  /** Domínio que cria conta sozinho; mostrado como dica abaixo do botão "Criar conta". */
  signupDomain?: string;
};

const LAST_EMAIL_KEY = "sf_last_email";

/** Lê/grava o último e-mail usado. localStorage pode estar bloqueado (aba anônima), então nunca quebra a tela. */
const lastEmail = {
  get: () => {
    try {
      return localStorage.getItem(LAST_EMAIL_KEY) ?? "";
    } catch {
      return "";
    }
  },
  set: (email: string) => {
    try {
      localStorage.setItem(LAST_EMAIL_KEY, email);
    } catch {}
  },
};

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path strokeLinecap="round" d="M4 4l16 16" />}
    </svg>
  );
}

/**
 * Tela de entrada (login, cadastro, primeiro acesso e definição de senha).
 * Experiência: e-mail lembrado do último acesso, mostrar/ocultar senha,
 * erros inline anunciados a leitores de tela e botões que mostram quando estão trabalhando.
 */
export default function AuthCard({
  title,
  subtitle,
  submit,
  action,
  withName,
  withEmail = true,
  withPassword = true,
  newPassword = false,
  pendingLabel = "Entrando...",
  token,
  next,
  signupHref,
  loginHref,
  signupDomain,
}: Props) {
  const [state, run, pending] = useActionState(action, {});
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const error = state.error;
  const isLogin = withEmail && withPassword && !newPassword;

  // No login, preenche o último e-mail e já deixa o cursor na senha; sem e-mail guardado, começa nele.
  useEffect(() => {
    const saved = isLogin ? lastEmail.get() : "";
    if (saved && emailRef.current) emailRef.current.value = saved;
    (saved ? passwordRef : emailRef).current?.focus();
  }, [isLogin]);

  // Pedido de cadastro enviado: troca o formulário por instruções, sem deixar a pessoa na dúvida.
  if (state.sent) {
    return (
      <AuthShell>
        <div
          aria-hidden
          className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-brand/15 text-2xl text-brand"
        >
          ✉
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Confira seu e-mail</h1>
        <p className="mt-3 text-white/70">
          Enviamos um link para <strong className="text-white">{state.sent}</strong>. Clique nele para confirmar o
          e-mail e criar sua senha.
        </p>
        <p className="mt-3 text-sm text-white/45">
          O link vale por 1 hora. Não chegou? Veja o spam ou{" "}
          <a href="/cadastro" className="font-semibold text-white underline-offset-4 hover:underline">
            tente de novo
          </a>
          .
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      footer={
        withName && loginHref ? (
          <p className="mt-6 text-sm text-white/55">
            Já tem conta?{" "}
            <a href={loginHref} className="font-semibold text-white underline-offset-4 hover:underline">
              Entrar
            </a>
          </p>
        ) : null
      }
    >
      <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
      <p className="mb-6 mt-1.5 text-white/60">{subtitle}</p>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-400/30"
        >
          {error}
        </p>
      )}

      <form
        action={run}
        onSubmit={(e) => {
          if (isLogin) lastEmail.set(String(new FormData(e.currentTarget).get("email") ?? ""));
        }}
      >
        {next && <input type="hidden" name="next" value={next} />}
        {token && <input type="hidden" name="token" value={token} />}
        <div className="space-y-3">
          {withName && (
            <input
              name="name"
              defaultValue={state.name}
              className="auth-input"
              placeholder="Seu nome"
              aria-label="Seu nome"
              required
              autoComplete="name"
            />
          )}
          {withEmail && (
            <input
              ref={emailRef}
              name="email"
              defaultValue={state.email}
              type="email"
              className="auth-input"
              placeholder="E-mail"
              aria-label="E-mail"
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
            />
          )}
          {withPassword && (
            <div className="relative">
              <input
                ref={passwordRef}
                name="password"
                type={showPassword ? "text" : "password"}
                className="auth-input pr-12"
                placeholder={newPassword ? "Crie uma senha" : "Senha"}
                aria-label="Senha"
                required
                minLength={newPassword ? 8 : undefined}
                autoComplete={newPassword ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
                className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-white/50 transition hover:text-white focus-visible:outline-2 focus-visible:outline-brand"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          )}
          {withPassword && newPassword && <p className="px-1 text-xs text-white/45">Mínimo de 8 caracteres.</p>}
        </div>
        <button
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-base font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          disabled={pending}
        >
          {pending && (
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {pending ? pendingLabel : submit}
        </button>
      </form>
      {isLogin && signupHref && (
        <div className="mt-6 border-t border-white/10 pt-5 text-center">
          <p className="mb-3 text-sm text-white/55">Ainda não tem conta?</p>
          <a
            href={signupHref}
            className="flex w-full items-center justify-center rounded-xl border border-white/20 py-3 text-[15px] font-semibold text-white transition hover:border-white/40 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Criar conta
          </a>
          {signupDomain && <p className="mt-3 text-xs text-white/40">Disponível para e-mails @{signupDomain}.</p>}
        </div>
      )}
    </AuthShell>
  );
}
