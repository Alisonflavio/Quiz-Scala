/* Acesso ao banco para formulários: rascunho (`draft`) e versão publicada (`published`) ficam na mesma linha. */
import "server-only";
import { customAlphabet } from "nanoid";
import { json, query, queryOne } from "./db";
import { DEFAULT_SETTINGS, DEFAULT_THEME, type FormDoc } from "./types";

export const newFormId = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789", 10);

export type FormRow = {
  id: string;
  title: string;
  draft: FormDoc;
  published: FormDoc | null;
  published_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

/** Garante que documentos antigos recebam campos novos de tema/configuração */
export function normalizeDoc(doc: Partial<FormDoc> | null | undefined): FormDoc {
  const s = { ...DEFAULT_SETTINGS, ...(doc?.settings ?? {}) };
  return {
    fields: doc?.fields ?? [],
    theme: { ...DEFAULT_THEME, ...(doc?.theme ?? {}) },
    settings: {
      ...s,
      temperature: { ...DEFAULT_SETTINGS.temperature, ...(doc?.settings?.temperature ?? {}) },
      share: { ...DEFAULT_SETTINGS.share, ...(doc?.settings?.share ?? {}) },
      conversion: { ...DEFAULT_SETTINGS.conversion, ...(doc?.settings?.conversion ?? {}) },
    },
  };
}

function hydrate(r: FormRow | null): FormRow | null {
  if (!r) return null;
  return { ...r, draft: normalizeDoc(r.draft), published: r.published ? normalizeDoc(r.published) : null };
}

export async function listForms(search = "") {
  return query<FormRow & { responses: number; complete: number }>(
    `SELECT f.*,
       (SELECT count(*)::int FROM responses r WHERE r.form_id = f.id) AS responses,
       (SELECT count(*)::int FROM responses r WHERE r.form_id = f.id AND r.status = 'complete') AS complete
     FROM forms f
     WHERE $1 = '' OR f.title ILIKE '%' || $1 || '%'
     ORDER BY f.updated_at DESC`,
    [search.trim()],
  );
}

export async function getForm(id: string) {
  return hydrate(await queryOne<FormRow>("SELECT * FROM forms WHERE id = $1", [id]));
}

export async function createForm(title: string, doc: FormDoc, userId: string) {
  const id = newFormId();
  await query("INSERT INTO forms (id, title, draft, created_by) VALUES ($1,$2,$3::jsonb,$4)", [
    id,
    title,
    json(doc),
    userId,
  ]);
  return id;
}

/** Salva só o rascunho; o público continua vendo a versão publicada. */
export async function saveDraft(id: string, title: string, doc: FormDoc) {
  await query("UPDATE forms SET title = $2, draft = $3::jsonb, updated_at = now() WHERE id = $1", [
    id,
    title,
    json(doc),
  ]);
}

/** Publica: a versão pública passa a ser uma cópia do rascunho atual. */
export async function publishForm(id: string) {
  await query("UPDATE forms SET published = draft, published_at = now(), updated_at = now() WHERE id = $1", [id]);
}

/** Copia o rascunho para um novo formulário "(cópia)". @returns id da cópia, ou `null` se o original não existe. */
export async function duplicateForm(id: string, userId: string) {
  const f = await getForm(id);
  if (!f) return null;
  return createForm(`${f.title} (cópia)`, f.draft, userId);
}

export async function deleteForm(id: string) {
  await query("DELETE FROM forms WHERE id = $1", [id]);
}

export async function deleteResponses(id: string) {
  await query("DELETE FROM responses WHERE form_id = $1", [id]);
}
