import { redirect } from "next/navigation";

export default async function FormIndex(props: PageProps<"/dash/forms/[id]">) {
  const { id } = await props.params;
  redirect(`/dash/forms/${id}/editor`);
}
