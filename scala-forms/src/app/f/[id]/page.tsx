import type { Metadata } from "next";
import FormRunner from "@/components/runner/FormRunner";
import { getUser } from "@/lib/auth";
import { getForm } from "@/lib/forms";
import type { FormDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

// webhook e planilha são segredos: ficam só no servidor, nunca vão no código da página
function forBrowser(doc: FormDoc): FormDoc {
  return { ...doc, settings: { ...doc.settings, webhook: { enabled: false, url: "" }, sheets: { enabled: false, url: "" } } };
}

async function load(id: string, preview: boolean) {
  const form = await getForm(id);
  if (!form) return null;
  if (preview && (await getUser())) return { form, doc: form.draft, preview: true };
  return form.published ? { form, doc: form.published, preview: false } : null;
}

export async function generateMetadata(props: PageProps<"/f/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const form = await getForm(id);
  const s = form?.published?.settings.share;
  const title = s?.title || form?.title || "Formulário";
  return {
    title,
    description: s?.description || undefined,
    openGraph: { title, description: s?.description || undefined, images: s?.image ? [s.image] : undefined },
  };
}

function Message({ text }: { text: string }) {
  return <main className="grid min-h-screen place-items-center bg-gray-50 p-6 text-center text-lg text-gray-600">{text}</main>;
}

export default async function PublicForm(props: PageProps<"/f/[id]">) {
  const { id } = await props.params;
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const data = await load(id, sp.preview === "1");
  if (!data) return <Message text="Este formulário não existe ou ainda não foi publicado." />;
  if (data.doc.settings.blocked && !data.preview) return <Message text="Este formulário não está mais aceitando respostas." />;
  return <FormRunner formId={id} doc={forBrowser(data.doc)} preview={data.preview} />;
}
