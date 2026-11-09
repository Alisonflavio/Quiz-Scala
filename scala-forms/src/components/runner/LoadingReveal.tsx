"use client";
import { useEffect, useState } from "react";
import { alpha } from "@/lib/theme";

/* Tela de "carregando o diagnóstico": aparece só na transição pro resultado (scala_diagnosis),
 * pra dar a sensação de que a gente está processando as respostas da pessoa antes de mostrar o
 * resultado — a logo redonda (mesma da tela de boas-vindas) com um anel girando em volta, e
 * frases trocando embaixo. */
export const LOADING_MS = 2400;
const LOADING_MESSAGES = [
  "Lendo suas respostas...",
  "Identificando onde você está travando...",
  "Montando o seu passo a passo...",
  "Quase lá...",
];
export default function LoadingReveal({ acc, color }: { acc: string; color: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setI((v) => Math.min(v + 1, LOADING_MESSAGES.length - 1)),
      LOADING_MS / LOADING_MESSAGES.length,
    );
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-7 px-6 text-center">
      <div className="relative h-28 w-28">
        <div className="absolute inset-0 rounded-full border-4" style={{ borderColor: alpha(color, 0.15) }} />
        <div
          className="absolute inset-0 animate-spin rounded-full border-4 border-transparent"
          style={{ borderTopColor: acc, animationDuration: "0.9s" }}
        />
        <img
          src="/scala/selo-orange.svg"
          alt=""
          className="absolute inset-3 h-[calc(100%-24px)] w-[calc(100%-24px)] rounded-full object-contain"
        />
      </div>
      <p className="sf-in text-base" key={i} style={{ color: alpha(color, 0.75) }}>
        {LOADING_MESSAGES[i]}
      </p>
      <style>{`.sf-in{animation:sfin .35s ease}@keyframes sfin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
