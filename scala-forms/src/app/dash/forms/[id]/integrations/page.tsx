import { notFound } from "next/navigation";
import IntegrationsForm from "@/components/options/IntegrationsForm";
import SettingsShell from "@/components/options/SettingsShell";
import { requireUser } from "@/lib/auth";
import { getForm } from "@/lib/forms";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage(props: PageProps<"/dash/forms/[id]/integrations">) {
  await requireUser();
  const { id } = await props.params;
  const f = await getForm(id);
  if (!f) notFound();
  return (
    <SettingsShell id={id} initialTitle={f.title} initialTheme={f.draft.theme} initialSettings={f.draft.settings} active="integrations">
      <IntegrationsForm id={id} fields={f.draft.fields} />
    </SettingsShell>
  );
}
