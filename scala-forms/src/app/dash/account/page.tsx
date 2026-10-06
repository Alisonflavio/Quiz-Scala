import TopBar from "@/components/TopBar";
import { AccountForm } from "@/components/TeamForms";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const me = await requireUser();
  return (
    <>
      <TopBar user={me} />
      <main className="mx-auto max-w-xl px-5 py-14">
        <h1 className="mb-8 text-3xl font-semibold text-gray-800">Dados pessoais</h1>
        <AccountForm name={me.name} email={me.email} />
      </main>
    </>
  );
}
