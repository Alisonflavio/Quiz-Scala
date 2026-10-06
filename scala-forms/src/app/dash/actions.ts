"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createUser, hashPassword, requireAdmin, requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { createForm, deleteForm, deleteResponses, duplicateForm, getForm, publishForm, saveDraft } from "@/lib/forms";
import { deleteResponse, setManualTemperature } from "@/lib/responses";
import { blankForm, scalaTemplate } from "@/lib/templates";
import type { FormDoc, Settings, Temperature, Theme } from "@/lib/types";
import { json } from "@/lib/db";

/* ---------- formulários ---------- */
export async function createFormAction(template: "blank" | "scala") {
  const u = await requireUser();
  const id =
    template === "scala"
      ? await createForm("Diagnóstico de Carreira - Scala Fitness", scalaTemplate(), u.id)
      : await createForm("Novo formulário", blankForm(), u.id);
  redirect(`/dash/forms/${id}/editor`);
}

export async function saveDraftAction(id: string, title: string, doc: FormDoc) {
  await requireUser();
  await saveDraft(id, title.slice(0, 60) || "Sem título", doc);
  return { ok: true, at: new Date().toISOString() };
}

export async function publishAction(id: string, title: string, doc: FormDoc) {
  await requireUser();
  await saveDraft(id, title.slice(0, 60) || "Sem título", doc);
  await publishForm(id);
  revalidatePath(`/f/${id}`);
  return { ok: true };
}

/** Opções e integrações valem na hora: gravam no rascunho e na versão publicada (as perguntas continuam dependendo de "Publicar") */
export async function saveSettingsAction(id: string, title: string, theme: Theme, settings: Settings) {
  await requireUser();
  const f = await getForm(id);
  if (!f) return { ok: false };
  const t = title.trim().slice(0, 60) || "Sem título";
  await query(
    `UPDATE forms SET title = $2,
       draft = jsonb_set(jsonb_set(draft, '{theme}', $3::jsonb), '{settings}', $4::jsonb),
       published = CASE WHEN published IS NULL THEN NULL
                   ELSE jsonb_set(jsonb_set(published, '{theme}', $3::jsonb), '{settings}', $4::jsonb) END,
       updated_at = now()
     WHERE id = $1`,
    [id, t, json(theme), json(settings)],
  );
  revalidatePath(`/f/${id}`);
  return { ok: true };
}

export async function duplicateFormAction(id: string) {
  const u = await requireUser();
  await duplicateForm(id, u.id);
  revalidatePath("/dash");
}

export async function deleteFormAction(id: string) {
  await requireUser();
  await deleteForm(id);
  redirect("/dash");
}

export async function deleteAllResponsesAction(id: string) {
  await requireUser();
  await deleteResponses(id);
  revalidatePath(`/dash/forms/${id}/responses`);
}

/* ---------- respostas ---------- */
export async function setTemperatureAction(formId: string, responseId: string, t: Temperature | "") {
  await requireUser();
  await setManualTemperature(responseId, t || null);
  revalidatePath(`/dash/forms/${formId}/responses`);
}

export async function deleteResponseAction(formId: string, responseId: string) {
  await requireUser();
  await deleteResponse(responseId);
  revalidatePath(`/dash/forms/${formId}/responses`);
}

/* ---------- time ---------- */
export type TeamState = { error?: string; ok?: string };

export async function addMemberAction(_: TeamState, fd: FormData): Promise<TeamState> {
  await requireAdmin();
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const role = fd.get("role") === "admin" ? "admin" : "member";
  if (name.length < 2) return { error: "Digite o nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Digite um e-mail válido." };
  if (password.length < 8) return { error: "A senha provisória precisa ter pelo menos 8 caracteres." };
  try {
    await createUser(name, email, password, role);
  } catch {
    return { error: "Já existe um usuário com esse e-mail." };
  }
  revalidatePath("/dash/team");
  return { ok: `${name} foi adicionado(a). Envie o e-mail e a senha provisória para a pessoa entrar.` };
}

export async function removeMemberAction(userId: string) {
  const me = await requireAdmin();
  if (userId === me.id) return;
  await query("DELETE FROM users WHERE id = $1", [userId]);
  revalidatePath("/dash/team");
}

export async function setRoleAction(userId: string, role: "admin" | "member") {
  const me = await requireAdmin();
  if (userId === me.id) return;
  await query("UPDATE users SET role = $2 WHERE id = $1", [userId, role]);
  revalidatePath("/dash/team");
}

export async function updateAccountAction(_: TeamState, fd: FormData): Promise<TeamState> {
  const me = await requireUser();
  const name = String(fd.get("name") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (name.length < 2) return { error: "Digite seu nome." };
  if (password && password.length < 8) return { error: "A nova senha precisa ter pelo menos 8 caracteres." };
  await query("UPDATE users SET name = $2 WHERE id = $1", [me.id, name]);
  if (password) await query("UPDATE users SET password_hash = $2 WHERE id = $1", [me.id, await hashPassword(password)]);
  revalidatePath("/dash");
  return { ok: "Dados atualizados." };
}

export async function getFormForClient(id: string) {
  await requireUser();
  return getForm(id);
}
