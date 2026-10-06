import { redirect } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import { getUser, userCount } from "@/lib/auth";
import { loginAction } from "../auth-actions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if ((await userCount()) === 0) redirect("/setup");
  if (await getUser()) redirect("/dash");
  return <AuthCard title="Entrar" subtitle="Entre com seus dados de acesso." submit="Entrar →" action={loginAction} />;
}
