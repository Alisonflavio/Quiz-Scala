import { redirect } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import { userCount } from "@/lib/auth";
import { setupAction } from "../auth-actions";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if ((await userCount()) > 0) redirect("/login");
  return (
    <AuthCard
      title="Primeiro acesso"
      subtitle="Crie a conta de administrador. Depois você convida o resto do time."
      submit="Criar conta"
      action={setupAction}
      withName
      newPassword
    />
  );
}
