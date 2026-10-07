"use client";
import { useRef, useState, type Ref } from "react";
import { formatNumero, joinPhone, splitPhone } from "@/lib/phone";
import { alpha } from "@/lib/theme";

/* Telefone em dois campos, DDD e número, para a pessoa não misturar os dois. Para o resto do sistema
 * continua sendo uma resposta só ("(41) 99515-0509"), igual ao campo antigo. */
export default function PhoneInput({
  value,
  onChange,
  color,
  dddRef,
}: {
  value: string;
  onChange: (v: string) => void;
  color: string;
  dddRef: Ref<HTMLInputElement>;
}) {
  const [parts, setParts] = useState(() => splitPhone(value));
  const numeroRef = useRef<HTMLInputElement>(null);
  const set = (ddd: string, numero: string) => {
    setParts({ ddd, numero });
    onChange(joinPhone(ddd, numero));
  };
  const campo =
    "w-full border-b-2 bg-transparent pb-2 text-[clamp(20px,3.6vw,28px)] outline-none placeholder:opacity-40";
  const rotulo = "mb-1 block text-xs font-semibold uppercase tracking-wider";

  return (
    <div className="flex items-end gap-5">
      <label className="block w-[84px] shrink-0">
        <span className={rotulo} style={{ color: alpha(color, 0.6) }}>
          DDD
        </span>
        <input
          ref={dddRef}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-area-code"
          maxLength={2}
          placeholder="41"
          value={parts.ddd}
          onChange={(e) => {
            const ddd = e.target.value.replace(/\D/g, "").slice(0, 2);
            set(ddd, parts.numero);
            if (ddd.length === 2) numeroRef.current?.focus();
          }}
          className={campo}
          style={{ borderColor: alpha(color, 0.5), color }}
        />
      </label>
      <label className="block min-w-0 flex-1">
        <span className={rotulo} style={{ color: alpha(color, 0.6) }}>
          Número
        </span>
        <input
          ref={numeroRef}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-local"
          maxLength={10}
          placeholder="99999-9999"
          value={parts.numero}
          onChange={(e) => set(parts.ddd, formatNumero(e.target.value))}
          className={campo}
          style={{ borderColor: alpha(color, 0.5), color }}
        />
      </label>
    </div>
  );
}
