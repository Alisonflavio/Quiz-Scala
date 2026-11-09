"use client";
import dynamic from "next/dynamic";

/**
 * A página de obrigado depende de sessionStorage e da URL do navegador, então só é desenhada no navegador
 * (sem renderização no servidor). Evita mostrar a tela sem nome e trocar logo em seguida.
 */
const ObrigadoClient = dynamic(() => import("./ObrigadoApp"), {
  ssr: false,
  loading: () => <div className="obrigado" />,
});

export default ObrigadoClient;
