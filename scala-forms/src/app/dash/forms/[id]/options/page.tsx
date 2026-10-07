import { notFound } from "next/navigation";
import OptionsForm from "@/components/options/OptionsForm";
import SettingsShell from "@/components/options/SettingsShell";
import { requireUser } from "@/lib/auth";
import { getForm } from "@/lib/forms";

export const dynamic = "force-dynamic";

export default async function OptionsPage(props: PageProps<"/dash/forms/[id]/options">) {
  await requireUser();
  const { id } = await props.params;
  const f = await getForm(id);
  if (!f) notFound();
  return (
    <SettingsShell
      id={id}
      initialTitle={f.title}
      initialTheme={f.draft.theme}
      initialSettings={f.draft.settings}
      active="options"
    >
      <OptionsForm id={id} fields={f.draft.fields} />
    </SettingsShell>
  );
}
