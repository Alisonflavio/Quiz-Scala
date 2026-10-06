import { notFound } from "next/navigation";
import EditorApp from "@/components/editor/EditorApp";
import { requireUser } from "@/lib/auth";
import { getForm } from "@/lib/forms";
import { stable } from "@/lib/stable";

export const dynamic = "force-dynamic";

export default async function EditorPage(props: PageProps<"/dash/forms/[id]/editor">) {
  await requireUser();
  const { id } = await props.params;
  const form = await getForm(id);
  if (!form) notFound();
  return (
    <EditorApp
      id={form.id}
      initialTitle={form.title}
      initialDoc={form.draft}
      publishedJson={form.published ? stable(form.published) : null}
    />
  );
}
