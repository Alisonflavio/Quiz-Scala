import { notFound } from "next/navigation";
import FormHeader from "@/components/FormHeader";
import SharePanel from "@/components/SharePanel";
import { requireUser } from "@/lib/auth";
import { getForm } from "@/lib/forms";

export const dynamic = "force-dynamic";

export default async function SharePage(props: PageProps<"/dash/forms/[id]/share">) {
  await requireUser();
  const { id } = await props.params;
  const f = await getForm(id);
  if (!f) notFound();
  return (
    <>
      <FormHeader id={id} title={f.title} active="share" right={<a href={`/f/${id}`} target="_blank" className="btn-outline">👁 Ver</a>} />
      {!f.published && <div className="bg-amber-50 px-6 py-3 text-center text-amber-200">Este formulário ainda não foi publicado. Publique no Editor para o link funcionar.</div>}
      <SharePanel id={id} />
    </>
  );
}
