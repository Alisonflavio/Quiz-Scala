import Link from "next/link";
import FormCardActions from "@/components/FormCardActions";
import FormThumb from "@/components/FormThumb";
import NewFormButton from "@/components/NewFormButton";
import TopBar from "@/components/TopBar";
import { requireUser } from "@/lib/auth";
import { listForms, normalizeDoc } from "@/lib/forms";

export const dynamic = "force-dynamic";

export default async function Dashboard(props: PageProps<"/dash">) {
  const user = await requireUser();
  const { q = "" } = (await props.searchParams) as { q?: string };
  const forms = await listForms(q);
  return (
    <>
      <TopBar user={user} />
      <main className="mx-auto max-w-5xl px-5 py-12">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">Scala Forms</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight text-gray-900">Formulários</h1>
          </div>
          <NewFormButton />
        </div>
        <form className="mb-8 flex items-center gap-3 rounded-2xl bg-white/[0.05] px-5 py-3.5 ring-1 ring-white/10 backdrop-blur focus-within:ring-2 focus-within:ring-brand/50">
          <span className="text-xl text-gray-400">⌕</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Pesquisar formulário"
            className="w-full bg-transparent text-lg text-gray-800 outline-none placeholder:text-gray-400"
          />
        </form>
        {forms.length === 0 && (
          <div className="rounded-3xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
            {q
              ? "Nenhum formulário encontrado."
              : "Você ainda não tem formulários. Clique em “Criar novo” para começar."}
          </div>
        )}
        <div className="space-y-5">
          {forms.map((f) => (
            <div
              key={f.id}
              className="group flex flex-col gap-5 rounded-[28px] bg-white/[0.045] p-4 ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-white/[0.07] sm:flex-row sm:items-center sm:gap-6 sm:pr-7"
            >
              <Link href={`/dash/forms/${f.id}/editor`}>
                <FormThumb doc={normalizeDoc(f.published ?? f.draft)} />
              </Link>
              <Link href={`/dash/forms/${f.id}/responses`} className="min-w-0 flex-1 px-1 sm:px-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                  {f.published ? "Publicado" : "Rascunho"}
                </div>
                <div className="mt-1 truncate text-2xl font-semibold tracking-tight text-gray-900">{f.title}</div>
                <div className="mt-1 text-[15px] text-gray-600">
                  {f.responses === 0
                    ? "Nenhuma resposta"
                    : `${f.complete} ${f.complete === 1 ? "resposta" : "respostas"}`}
                  {f.responses > f.complete && (
                    <span className="text-gray-400">
                      {" "}
                      · {f.responses - f.complete} {f.responses - f.complete === 1 ? "parcial" : "parciais"}
                    </span>
                  )}
                </div>
              </Link>
              <FormCardActions id={f.id} title={f.title} />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
