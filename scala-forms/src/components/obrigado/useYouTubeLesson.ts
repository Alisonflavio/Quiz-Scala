"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/* Tipos mínimos da API de iframe do YouTube (https://developers.google.com/youtube/iframe_api_reference). */
type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  unMute(): void;
  setVolume(v: number): void;
  getPlayerState(): number;
  getDuration(): number;
  getCurrentTime(): number;
  destroy(): void;
};
type YTNamespace = {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number };
};
type W = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };

/** Carrega a API do YouTube uma vez só e resolve quando ela estiver pronta. */
let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  const w = window as W;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(w.YT!);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

const MILESTONES = [25, 50, 75, 100] as const;

/**
 * Player da aula: começa com a capa; o primeiro toque tira a capa e toca com som; depois, cada toque pausa/continua.
 * Avisa o progresso (`onProgress` com 25/50/75/100, cada um uma vez), o primeiro play e o fim do vídeo.
 * `stopAt` (segundos, opcional): para nesse ponto como se tivesse acabado (teste do pitch, via ?pitch=).
 */
export function useYouTubeLesson({
  videoId,
  stopAt,
  onPlay,
  onProgress,
  onEnd,
}: {
  videoId: string;
  stopAt?: number;
  onPlay: () => void;
  onProgress: (milestone: number) => void;
  onEnd: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const yt = useRef<YTNamespace | null>(null);
  const sent = useRef(new Set<number>());
  const [started, setStarted] = useState(false);
  const [pct, setPct] = useState(0);
  // callbacks mais recentes sem recriar o player
  const cb = useRef({ onPlay, onProgress, onEnd });
  useEffect(() => {
    cb.current = { onPlay, onProgress, onEnd };
  });

  const mark = useCallback((p: number) => {
    for (const m of MILESTONES) {
      if (sent.current.has(m) || p < (m === 100 ? 95 : m)) continue;
      sent.current.add(m);
      cb.current.onProgress(m);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadApi().then((api) => {
      if (cancelled || !host.current) return;
      yt.current = api;
      // o YouTube troca este elemento por um iframe: ele é criado aqui, fora do controle do React
      const el = document.createElement("div");
      host.current.replaceChildren(el);
      player.current = new api.Player(el, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        playerVars: {
          autoplay: 0,
          mute: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onStateChange: (e: { data: number }) => {
            if (e.data === api.PlayerState.ENDED) {
              mark(100);
              setStarted(false);
              cb.current.onEnd();
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, [videoId, mark]);

  // progresso a cada 250 ms enquanto toca
  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      const p = player.current;
      const dur = p?.getDuration?.();
      if (!p || !dur) return;
      const now = p.getCurrentTime();
      if (stopAt && now >= stopAt) {
        p.pauseVideo();
        setStarted(false);
        cb.current.onEnd();
        return;
      }
      const value = Math.min(100, (now / dur) * 100);
      setPct(value);
      mark(value);
    }, 250);
    return () => clearInterval(id);
  }, [started, stopAt, mark]);

  /** Toque no vídeo: primeiro toque inicia com som; depois alterna pausa/continua. */
  const toggle = useCallback(() => {
    const p = player.current;
    if (!p?.playVideo) return;
    if (!started) {
      setStarted(true);
      if (!sent.current.has(0)) {
        sent.current.add(0);
        cb.current.onPlay();
      }
      p.unMute();
      p.setVolume(100);
      p.playVideo();
      return;
    }
    if (p.getPlayerState() === yt.current?.PlayerState.PLAYING) p.pauseVideo();
    else p.playVideo();
  }, [started]);

  return { host, started, pct, toggle };
}
