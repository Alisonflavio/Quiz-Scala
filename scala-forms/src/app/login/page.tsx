import { redirect } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import { getUser, userCount } from "@/lib/auth";
import { sanitizeNext } from "@/lib/redirect";
import { signupDomain } from "@/lib/signup-policy";
import { loginAction } from "../auth-actions";

export const dynamic = "force-dynamic";

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = (await props.searchParams) as { next?: string };
  const next = sanitizeNext(sp.next);
  if ((await userCount()) === 0) redirect("/setup");
  if (await getUser()) redirect(next);
  return (
    <AuthCard
      title="Bem-vindo de volta"
      subtitle="Entre para acessar seus formulários."
      submit="Entrar"
      action={loginAction}
      next={next}
      signupHref={`/cadastro?next=${encodeURIComponent(next)}`}
      signupDomain={signupDomain()}
    />
  );
}
