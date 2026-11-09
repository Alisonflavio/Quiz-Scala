import { notFound } from "next/navigation";
import OptionsForm from "@/components/options/OptionsForm";
import SettingsShell from "@/components/options/SettingsShell";
import VersionHistory from "@/components/options/VersionHistory";
import { requireUser } from "@/lib/auth";
import { getForm, listVersions } from "@/lib/forms";

export const dynamic = "force-dynamic";

export default async function OptionsPage(props: PageProps<"/dash/forms/[id]/options">) {
  const user = await requireUser();
  const { id } = await props.params;
  const [f, versions] = await Promise.all([getForm(id), listVersions(id)]);
  if (!f) notFound();
  return (
    <SettingsShell
      id={id}
      initialTitle={f.title}
      initialTheme={f.draft.theme}
      initialSettings={f.draft.settings}
      active="options"
    >
      <OptionsForm id={id} fields={f.draft.fields} isAdmin={user.role === "admin"} />
      <VersionHistory formId={id} versions={versions} />
    </SettingsShell>
  );
}
