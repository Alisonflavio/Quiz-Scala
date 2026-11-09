"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import EndScreen from "./EndScreen";
import LessonScreen from "./LessonScreen";
import ThankYouScreen from "./ThankYouScreen";
import { loadData, pixelEvent, saveData, sendEvent, type ObrigadoData } from "./data";

type Screen = "obrigado" | "aula" | "fim";

/** Tela inicial pelo #aula / #fim ou ?tela=aula|fim (para testes e links diretos). */
function initialScreen(): Screen {
  const h = window.location.hash.replace("#", "");
  const q = new URLSearchParams(window.location.search).get("tela");
  const v = h || q;
  return v === "aula" || v === "fim" ? v : "obrigado";
}

/**
 * Página de obrigado depois do Diagnóstico Scala, em três telas:
 * 1. Diagnóstico recebido (telefone e próximos passos) → 2. Aula do Rafael → 3. Fechamento.
 * Registra na resposta: telefone corrigido, abriu a aula, progresso da aula e chegou ao fim.
 */
export default function ObrigadoApp() {
  // só roda no navegador (ver ObrigadoClient): dá para ler sessionStorage e a URL direto no estado inicial
  const [data, setData] = useState<ObrigadoData>(loadData);
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const seen = useRef(new Set<Screen>());
  // `?pitch=SEGUNDOS`: para a aula nesse ponto (teste do pitch)
  const [stopAt] = useState(() => Number(new URLSearchParams(window.location.search).get("pitch")) || undefined);

  // guarda junto com o que veio da URL (ids), para recarregar a página sem perder os dados
  useEffect(() => saveData(data), [data]);

  const go = useCallback(
    (s: Screen) => {
      setScreen(s);
      window.scrollTo({ top: 0, behavior: "smooth" });
      try {
        history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${s}`);
      } catch {}
      if (seen.current.has(s)) return;
      seen.current.add(s);
      if (s === "aula") sendEvent(data, "abriu_aula");
      if (s === "fim") {
        sendEvent(data, "chegou_fim");
        pixelEvent("ObrigadoFim");
      }
    },
    [data],
  );

  const correctPhone = (digits: string) => {
    const d = { ...data, telefone: digits };
    setData(d);
    // grava a correção na resposta (painel e integrações), não só neste navegador
    sendEvent(d, "telefone_corrigido", { telefone: digits });
  };

  return (
    <div className="obrigado">
      <div className="obg-shell">
        <div className="obg-logo">
          <img src="/obg/logo-horizontal.svg" alt="Mentoria Scala Fitness" width={150} />
        </div>
        {screen === "obrigado" && <ThankYouScreen data={data} onPhone={correctPhone} onLesson={() => go("aula")} />}
        {screen === "aula" && (
          <LessonScreen
            stopAt={stopAt}
            onPlay={() => {
              sendEvent(data, "aula_play");
              pixelEvent("AulaPlay");
            }}
            onProgress={(m) => {
              sendEvent(data, `aula_${m}`);
              if (m === 75) pixelEvent("Aula75");
            }}
            onDone={() => go("fim")}
          />
        )}
        {screen === "fim" && <EndScreen data={data} />}
      </div>
    </div>
  );
}
