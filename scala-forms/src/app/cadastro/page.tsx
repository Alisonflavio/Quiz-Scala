import { redirect } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import { getUser, userCount } from "@/lib/auth";
import { sanitizeNext } from "@/lib/redirect";
import { signupDomain } from "@/lib/signup-policy";
import { signupAction } from "../auth-actions";

export const dynamic = "force-dynamic";

export default async function SignupPage(props: PageProps<"/cadastro">) {
  const sp = (await props.searchParams) as { next?: string };
  const next = sanitizeNext(sp.next);
  if ((await userCount()) === 0) redirect("/setup");
  if (await getUser()) redirect(next);
  return (
    <AuthCard
      title="Criar conta"
      subtitle={`Use seu e-mail @${signupDomain()}. Vamos enviar um link para confirmar.`}
      submit="Enviar link de confirmação"
      pendingLabel="Enviando..."
      action={signupAction}
      next={next}
      withName
      withPassword={false}
      loginHref={`/login?next=${encodeURIComponent(next)}`}
    />
  );
}
