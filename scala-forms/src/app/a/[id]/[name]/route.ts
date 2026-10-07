import { queryOne } from "@/lib/db";

export async function GET(_: Request, ctx: RouteContext<"/a/[id]/[name]">) {
  const { id } = await ctx.params;
  const a = await queryOne<{ mime: string; data: string }>("SELECT mime, data FROM assets WHERE id = $1", [id]);
  if (!a) return new Response("Não encontrado", { status: 404 });
  return new Response(Buffer.from(a.data, "base64"), {
    headers: {
      "Content-Type": a.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // SVG enviado pelo usuário não pode rodar script
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
