import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getUser } from "@/lib/auth";
import { query } from "@/lib/db";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml", "application/pdf"];

/* Guarda a imagem no próprio banco (funciona igual no computador e na Vercel + Supabase) */
export async function POST(req: Request) {
  if (!(await getUser())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Envie uma imagem (PNG, JPG, WEBP, GIF, SVG) ou um PDF." }, { status: 400 });
  if (file.size > 3.5 * 1024 * 1024) return NextResponse.json({ error: "Arquivo maior que 3,5 MB." }, { status: 400 });
  const id = nanoid(14);
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  await query("INSERT INTO assets (id, mime, data) VALUES ($1,$2,$3)", [id, file.type, data]);
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "img";
  return NextResponse.json({ url: `/a/${id}/${encodeURIComponent(file.name.replace(/\.[^.]+$/, ""))}.${ext}` });
}
