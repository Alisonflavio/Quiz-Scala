import type { FormDoc } from "@/lib/types";

/* Miniatura do formulário na lista, desenhada com as cores e a primeira tela dele */
export default function FormThumb({ doc }: { doc: FormDoc }) {
  const t = doc.theme;
  const first = doc.fields[0];
  return (
    <div
      className="relative h-[108px] w-[194px] shrink-0 overflow-hidden rounded-2xl"
      style={{ background: t.bgImage ? `url(${t.bgImage}) center/cover, ${t.bgColor}` : t.bgColor }}
    >
      <div className="absolute inset-0 flex flex-col justify-center gap-1.5 px-6">
        {t.logo && <img src={t.logo} alt="" className="mx-auto mb-1 h-2.5 object-contain" />}
        <div className="line-clamp-3 text-[7px] font-bold leading-tight" style={{ color: t.questionColor }}>
          {first?.title}
        </div>
        <div className="mt-1 h-1.5 w-12 rounded-sm" style={{ background: t.buttonColor }} />
      </div>
    </div>
  );
}
