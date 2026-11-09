"use client";
import { useState } from "react";
import { firstName, formatPhone, formatReais, isValidPhone, type ObrigadoData } from "./data";
import { Badge, BigButton, Card, Check, Footer, LARANJA, Notice, Step, Title, VERDE } from "./ui";

/** Cartão "Vamos te chamar neste número", com correção do telefone. */
function PhoneCard({ telefone, onSave }: { telefone: string; onSave: (digits: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const save = () => {
    if (!isValidPhone(value)) return;
    onSave(value.replace(/\D/g, ""));
    setEditing(false);
  };
  return (
    <div className="obg-card mb-4">
      <div className="obg-label mb-2">Vamos te chamar neste número</div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[20px] font-bold tracking-[-0.01em]" data-testid="telefone">
          {formatPhone(telefone) || "Não informado"}
        </div>
        <button
          type="button"
          className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-[14px] font-semibold underline"
          style={{ color: LARANJA }}
          onClick={() => {
            setValue(telefone.replace(/\D/g, ""));
            setEditing(true);
          }}
        >
          Corrigir
        </button>
      </div>
      <div className="mt-1 text-[13px] text-[#8a8a8a]">Confira se está certo, para a gente não te perder.</div>
      {editing && (
        <div className="mt-3 flex gap-2">
          <input
            type="tel"
            inputMode="numeric"
            maxLength={15}
            autoFocus
            aria-label="Telefone com DDD"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="min-w-0 flex-1 rounded-lg border border-[#2a2a2a] bg-black px-3 py-2 text-white outline-none focus:border-[#ff6432]"
            placeholder="41999990000"
          />
          <button
            type="button"
            onClick={save}
            className="cursor-pointer rounded-lg border-0 px-3 py-2 text-sm font-semibold text-white"
            style={{ background: LARANJA }}
          >
            Salvar
          </button>
        </div>
      )}
    </div>
  );
}

/** Tela 1: diagnóstico recebido, telefone, próximos passos e botão para a aula. */
export default function ThankYouScreen({
  data,
  onPhone,
  onLesson,
}: {
  data: ObrigadoData;
  onPhone: (digits: string) => void;
  onLesson: () => void;
}) {
  const nome = firstName(data.nome);
  const fatura = formatReais(data.renda);
  const meta = formatReais(data.meta);
  return (
    <section className="obg-tela ativa" aria-label="Diagnóstico recebido">
      <div className="mb-5 flex justify-start">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: "rgba(34,197,94,0.12)", border: `2px solid ${VERDE}` }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7.5 12.5l3 3 6-6" stroke={VERDE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="mb-4 flex justify-start">
        <Badge color="verde">Diagnóstico recebido</Badge>
      </div>

      <Title>
        Tudo certo{nome && `, ${nome}`}! Seu diagnóstico já está com&nbsp;
        <span style={{ color: LARANJA }}>o nosso time.</span>
      </Title>
      <p className="m-0 mb-6 text-left text-[16px] leading-[1.55] text-[#d4d4d4]">
        Em breve, um <strong className="text-white">gestor de carreira</strong> da Scala vai te chamar no WhatsApp para
        conversar sobre o seu caso.
      </p>

      <PhoneCard telefone={data.telefone} onSave={onPhone} />

      <Card label="O que acontece agora" className="mb-4">
        <div className="flex flex-col gap-5">
          <div className="obg-linha flex items-start gap-3">
            <Check size={28} />
            <div>
              <div className="text-[16px] leading-[1.3] font-bold">Você concluiu o diagnóstico</div>
              <div className="mt-1 text-[14px] leading-[1.4] text-[#8a8a8a]">
                Seus números já chegaram ao nosso time.
              </div>
            </div>
          </div>
          <div className="obg-linha flex items-start gap-3">
            <Step n={2} style={{ width: 28, height: 28, boxShadow: "0 0 0 5px rgba(255,100,50,0.2)" }} />
            <div>
              <div className="text-[16px] leading-[1.3] font-bold">Um gestor de carreira te chama</div>
              <div className="mt-1 text-[14px] leading-[1.4] text-[#8a8a8a]">
                No WhatsApp que você informou, em breve.
              </div>
            </div>
          </div>
          <div className="obg-linha flex items-start gap-3">
            <Step n={3} pendente style={{ width: 28, height: 28, background: "#2a2a2a", border: 0 }} />
            <div>
              <div className="text-[16px] leading-[1.3] font-bold text-[#bdbdbd]">Vocês montam o seu plano</div>
              <div className="mt-1 text-[14px] leading-[1.4] text-[#8a8a8a]">
                O passo a passo para chegar na sua meta
                {fatura && meta && `: sair de ${fatura} e chegar em ${meta} por mês`}.
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Notice
        className="mb-6"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
            <path
              d="M4 6.5C4 5.12 5.12 4 6.5 4h11C18.88 4 20 5.12 20 6.5v7c0 1.38-1.12 2.5-2.5 2.5H11l-4.2 3.15c-.55.41-1.3.02-1.3-.66V16H6.5C5.12 16 4 14.88 4 13.5v-7z"
              fill={VERDE}
            />
          </svg>
        }
      >
        Fique de olho no WhatsApp: a mensagem vai chegar do{" "}
        <strong className="text-white">time da Scala Fitness.</strong>
      </Notice>

      <BigButton title="Assistir à aula do Rafael" subtitle="Enquanto isso · 20 minutos" onClick={onLesson} />

      <Footer />
    </section>
  );
}
