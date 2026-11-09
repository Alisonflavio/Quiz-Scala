import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import Script from "next/script";
import ObrigadoClient from "@/components/obrigado/ObrigadoClient";
import { getForm } from "@/lib/forms";
import "./obrigado.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Diagnóstico recebido | Mentoria Scala Fitness",
  description:
    "Seu diagnóstico foi enviado. Assista à aula do Rafael enquanto o gestor de carreira te chama no WhatsApp.",
  robots: { index: false, follow: false },
  icons: { icon: "/obg/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#000000" };

/** Só letras, números, "_" e "-": o id vai dentro de um <script>. */
const cleanId = (id: string) => id.trim().replace(/[^\w-]/g, "");

/** Id do Pixel da Meta do formulário (`?fid=`), se estiver ligado. Banco fora do ar não derruba a página. */
async function pixelIdFor(fid: string | undefined) {
  if (!fid || !/^[\w-]{1,40}$/.test(fid)) return "";
  try {
    const px = (await getForm(fid))?.published?.settings.facebookPixel;
    return px?.enabled ? cleanId(px.id) : "";
  } catch (err) {
    console.error("[obrigado] pixel", err instanceof Error ? err.message : err);
    return "";
  }
}

/** Página de obrigado depois do Diagnóstico Scala. As telas ficam em components/obrigado. */
export default async function ObrigadoPage(props: PageProps<"/obrigado">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const pixelId = await pixelIdFor(sp.fid);
  return (
    <div className={montserrat.variable}>
      <ObrigadoClient />
      {pixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
        </Script>
      )}
    </div>
  );
}
