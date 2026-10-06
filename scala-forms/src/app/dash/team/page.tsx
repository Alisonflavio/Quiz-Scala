import TopBar from "@/components/TopBar";
import { AddMember, MemberRow } from "@/components/TeamForms";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const me = await requireAdmin();
  const users = await query<{ id: string; name: string; email: string; role: "admin" | "member" }>("SELECT id, name, email, role FROM users ORDER BY created_at");
  return (
    <>
      <TopBar user={me} />
      <main className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="text-3xl font-semibold text-gray-800">Seu time: Performance</h1>
        <p className="mb-8 mt-1 text-gray-600">Todos do time veem e editam os mesmos formulários e respostas.</p>
        <div className="mb-10">{users.map((u) => <MemberRow key={u.id} {...u} isMe={u.id === me.id} />)}</div>
        <AddMember />
      </main>
    </>
  );
}
