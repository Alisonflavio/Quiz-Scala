import { readFile } from "fs/promises";
import path from "path";
import { getForm } from "@/lib/forms";

const PLACEHOLDER = "<!--SF_TRACKERS-->";

/** Só letras, números, "_" e "-": o id vai dentro de um <script>. */
const clean = (id: string) => id.trim().replace(/[^\w-]/g, "");

/** Código-base do Pixel da Meta (o mesmo do formulário), com PageView. */
function metaPixel(id: string) {
  return `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');</script>`;
}

/**
 * Serve a página de obrigado (HTML estático em public/obg) com os dados da pesquisa na query string.
 * Com `?fid=<id do formulário>`, inclui o Pixel da Meta configurado nesse formulário.
 */
export async function GET(req: Request) {
  const file = path.join(process.cwd(), "public", "obg", "page.html");
  let html = await readFile(file, "utf8");

  let trackers = "";
  const fid = new URL(req.url).searchParams.get("fid");
  if (fid && /^[\w-]{1,40}$/.test(fid)) {
    try {
      const px = (await getForm(fid))?.published?.settings.facebookPixel;
      const id = px?.enabled ? clean(px.id) : "";
      if (id) trackers = metaPixel(id);
    } catch (err) {
      // banco fora do ar não pode derrubar a página de obrigado
      console.error("[obrigado] pixel", err instanceof Error ? err.message : err);
    }
  }
  html = html.replace(PLACEHOLDER, trackers);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
