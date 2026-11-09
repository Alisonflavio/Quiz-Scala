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

/** Publica: a versão pública passa a ser uma cópia do rascunho atual, e a cópia entra no histórico. */
export async function publishForm(id: string, userId: string | null = null) {
  await query("UPDATE forms SET published = draft, published_at = now(), updated_at = now() WHERE id = $1", [id]);
  await query(
    "INSERT INTO form_versions (form_id, title, doc, published_by) SELECT id, title, draft, $2 FROM forms WHERE id = $1",
    [id, userId],
  );
}

export type FormVersion = {
  id: number;
  title: string;
  published_at: string | Date;
  published_by_name: string | null;
  note: string | null;
};

/** Últimas versões publicadas (mais recente primeiro), com o nome de quem publicou. */
export async function listVersions(formId: string, limit = 20) {
  return query<FormVersion>(
    `SELECT v.id::int AS id, v.title, v.published_at, u.name AS published_by_name, v.note
       FROM form_versions v LEFT JOIN users u ON u.id = v.published_by
      WHERE v.form_id = $1 ORDER BY v.published_at DESC, v.id DESC LIMIT $2`,
    [formId, limit],
  );
}

/**
 * Volta o formulário para uma versão do histórico: rascunho e versão no ar recebem aquele conteúdo,
 * e a restauração entra no histórico como uma publicação nova (dá para desfazer do mesmo jeito).
 * @returns `false` se a versão não pertence ao formulário.
 */
export async function restoreVersion(formId: string, versionId: number, userId: string) {
  const v = await queryOne<{ id: number }>("SELECT id FROM form_versions WHERE id = $1 AND form_id = $2", [
    versionId,
    formId,
  ]);
  if (!v) return false;
  await query(
    `UPDATE forms f SET draft = v.doc, published = v.doc, title = v.title, published_at = now(), updated_at = now()
       FROM form_versions v WHERE v.id = $1 AND f.id = v.form_id`,
    [versionId],
  );
  await query(
    `INSERT INTO form_versions (form_id, title, doc, published_by, note)
       SELECT form_id, title, doc, $2, 'restaurou a versão de ' || to_char(published_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
       FROM form_versions WHERE id = $1`,
    [versionId, userId],
  );
  return true;
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
