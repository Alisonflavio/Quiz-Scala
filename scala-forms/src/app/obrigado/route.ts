import { readFile } from "fs/promises";
import path from "path";

/** Serve a página de obrigado (HTML estático) com os dados da pesquisa na query string. */
export async function GET() {
  const file = path.join(process.cwd(), "public", "obg", "page.html");
  const html = await readFile(file, "utf8");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
