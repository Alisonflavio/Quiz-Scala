"use client";
import { BigButton, Card, Check, Footer, LARANJA, Notice, Step, Badge, Title } from "./ui";
import { useYouTubeLesson } from "./useYouTubeLesson";

/** Vídeo da aula do Rafael no YouTube. */
const VIDEO_ID = "7KFNhE8j9AQ";

const TOPICS = [
  "Posicionamento: como arrumar o seu Instagram",
  "Stories que puxam conversa",
  "Reels que transformam seguidor em cliente",
  "Roteiro de abordagem no direct e no WhatsApp",
  "Produto, preço e recorrência",
];

/** Tela 2: aula do Rafael (vídeo com capa), tópicos e botão para a tela final. */
export default function LessonScreen({
  stopAt,
  onPlay,
  onProgress,
  onDone,
}: {
  stopAt?: number;
  onPlay: () => void;
  onProgress: (milestone: number) => void;
  onDone: () => void;
}) {
  const { host, started, pct, toggle } = useYouTubeLesson({
    videoId: VIDEO_ID,
    stopAt,
    onPlay,
    onProgress,
    onEnd: onDone,
  });
  return (
    <section className="obg-tela ativa" aria-label="Aula do Rafael">
      <Notice className="mb-5" icon={<Check className="mt-0.5" />}>
        Diagnóstico enviado. Seu gestor de carreira vai te chamar em breve.
      </Notice>

      <div className="mb-4">
        <Badge color="laranja">Enquanto isso</Badge>
      </div>

      <Title>
        Antes da conversa, assista à <span style={{ color: LARANJA }}>aula do Rafael.</span>
      </Title>
      <p className="m-0 mb-6 text-[15px] leading-[1.55] text-[#d4d4d4]">
        <strong className="text-white">5 passos para dobrar o seu faturamento</strong> nos próximos 6 meses. Você chega
        na conversa já com a cabeça no plano.
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label={started ? "Pausar ou continuar a aula" : "Assistir à aula"}
        onClick={toggle}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle()}
        className="relative mb-3 aspect-[9/16] w-full cursor-pointer overflow-hidden rounded-[18px] bg-[#111]"
      >
        <div ref={host} className="obg-player" />
        {!started && (
          <div className="absolute inset-0 z-[2]">
            <img
              src="/obg/aula-capa.webp"
              alt="5 passos para dobrar o seu faturamento"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/25" />
            <div className="absolute top-3 left-3 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
              Aula · 20 min
            </div>
            <div className="absolute inset-x-4 top-[28%] text-center">
              <div className="text-[28px] leading-[1.05] font-extrabold tracking-[-0.02em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)]">
                5 PASSOS PARA
                <br />
                <span className="text-[#4da3ff]">DOBRAR</span>
                <br />O SEU
                <br />
                FATURAMENTO
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pt-[42%]">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full shadow-[0_8px_30px_rgba(255,100,50,0.45)]"
                style={{ background: LARANJA }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="ml-0.5">
                  <path d="M8 5.5v13l11-6.5L8 5.5z" fill="#fff" />
                </svg>
              </div>
            </div>
            <div className="absolute right-3 bottom-3 left-3">
              <div className="mb-1 flex justify-between text-[11px] text-white/80">
                <span>0:00</span>
                <span>20:45</span>
              </div>
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/25">
                <div className="h-full bg-white" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mb-6 flex items-center gap-2 text-[13px] text-[#d4d4d4]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 3.5h9.5L18.5 7v13.5H6V3.5z" stroke="#a3a3a3" strokeWidth="1.6" />
          <path d="M8.5 10h7M8.5 13.5h7M8.5 17h4.5" stroke="#a3a3a3" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        Pega papel e caneta: tem uma conta pra fazer no meio da aula.
      </p>

      <Card label="O que você vai ver" className="mb-2">
        <ol className="m-0 flex list-none flex-col gap-0 p-0">
          {TOPICS.map((t, i) => (
            <li
              key={t}
              className={`flex items-center gap-3 py-3 ${i < TOPICS.length - 1 ? "border-b border-[#242424]" : ""}`}
            >
              <Step n={i + 1} />
              <span className="text-[14px] leading-[1.35]">{t}</span>
            </li>
          ))}
        </ol>
        <div className="mt-2 flex items-center gap-3 border-t border-[#242424] pt-4">
          <img
            src="/obg/rafael.webp"
            alt="Rafael Tonietto"
            className="h-12 w-12 rounded-full object-cover object-top"
            width={48}
            height={48}
          />
          <div>
            <div className="text-[14px] font-bold">Rafael Tonietto</div>
            <div className="text-[12px] leading-[1.35] text-[#8a8a8a]">
              +20 anos de mercado · método aplicado com +500 personal trainers
            </div>
          </div>
        </div>
      </Card>

      <BigButton title="Já assisti à aula" subtitle="Continuar" onClick={onDone} className="mt-6" />

      <Footer />
    </section>
  );
}
