import { redirect } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import AuthShell from "@/components/AuthShell";
import { getUser } from "@/lib/auth";
import { peekSignup } from "@/lib/signup";
import { confirmAction } from "../auth-actions";

export const dynamic = "force-dynamic";

/** Destino do link do e-mail: mostra o formulário de senha, ou explica que o link não vale mais. */
export default async function ConfirmPage(props: PageProps<"/confirmar">) {
  const { token = "" } = (await props.searchParams) as { token?: string };
  if (await getUser()) redirect("/dash");
  const pending = await peekSignup(token);
  if (!pending) {
    return (
      <AuthShell>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Link vencido</h1>
        <p className="mt-3 text-white/70">Este link já foi usado ou passou de 1 hora. Peça um novo para continuar.</p>
        <a
          href="/cadastro"
          className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand py-3 text-base font-semibold text-white transition hover:bg-brand-dark"
        >
          Criar conta
        </a>
      </AuthShell>
    );
  }
  return (
    <AuthCard
      title={`Quase lá, ${pending.name.split(" ")[0]}!`}
      subtitle={`E-mail confirmado: ${pending.email}. Agora crie sua senha.`}
      submit="Criar senha e entrar"
      pendingLabel="Criando conta..."
      action={confirmAction}
      token={token}
      withEmail={false}
      newPassword
    />
  );
}
