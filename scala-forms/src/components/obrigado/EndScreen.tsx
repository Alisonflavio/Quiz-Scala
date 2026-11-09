import { firstName, formatPhone, formatReais, type ObrigadoData } from "./data";
import { Badge, Card, Check, Footer, Title, VERDE } from "./ui";

const TIPS = [
  "Deixe o WhatsApp à mão, com o som ligado",
  "Tenha seus números em mente: hoje e a sua meta",
  "Pense no que mais está travando você agora",
];

/** Tela 3: fechamento, com foto do Rafael, números da pessoa (se houver) e dicas para a conversa. */
export default function EndScreen({ data }: { data: ObrigadoData }) {
  const nome = firstName(data.nome);
  const tel = formatPhone(data.telefone);
  const fatura = formatReais(data.renda);
  const meta = formatReais(data.meta);
  return (
    <section className="obg-tela ativa" aria-label="Você chegou ao fim">
      <div className="relative mb-5 overflow-hidden rounded-[22px]">
        <img
          src="/obg/rafael.webp"
          alt="Rafael Tonietto"
          className="block h-[340px] w-full object-cover object-[50%_18%]"
          width={900}
          height={1125}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-4 pt-16 pb-4">
          <div className="text-[18px] font-bold">Rafael Tonietto</div>
          <div className="text-[13px] text-[#b3b3b3]">Scala Fitness</div>
        </div>
      </div>

      <div className="mb-4">
        <Badge color="verde">Você chegou ao fim</Badge>
      </div>

      <Title>Você deu o primeiro passo{nome && `, ${nome}`}.</Title>
      <p className="m-0 mb-6 text-[15px] leading-[1.55] text-[#a3a3a3]">
        Agora é com a gente: seu <strong className="text-white">gestor de carreira</strong> já recebeu o seu diagnóstico
        e vai te chamar no WhatsApp
        {tel && (
          <>
            {" "}
            <strong className="text-white">{tel}</strong>
          </>
        )}
        .
      </p>

      {fatura && meta && (
        <Card label="A base da sua conversa" destaque className="mb-4 text-center">
          <div className="mb-2 text-[28px] font-extrabold tracking-[-0.02em]">
            <span className="text-white">{fatura}</span>
            <span style={{ color: VERDE }}> → </span>
            <span style={{ color: VERDE }}>{meta}</span>
          </div>
          <p className="m-0 text-[13px] leading-[1.4] text-[#8a8a8a]">
            Do que você fatura hoje até a meta que você escolheu, por mês.
          </p>
        </Card>
      )}

      <Card label="Para a conversa render mais" className="mb-6">
        <div className="flex flex-col gap-4">
          {TIPS.map((t) => (
            <div key={t} className="flex items-start gap-3">
              <Check />
              <span className="text-[14px] leading-[1.4]">{t}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="mb-8 text-center">
        <p className="m-0 mb-2 text-[17px] font-bold">Não precisa fazer mais nada agora.</p>
        <p className="m-0 text-[13px] leading-[1.45] text-[#8a8a8a]">
          É só esperar a nossa mensagem. Pode fechar esta página.
        </p>
      </div>

      <div className="mb-3 flex justify-center">
        <img src="/obg/selo.svg" alt="" width={80} height={80} />
      </div>
      <Footer className="!pt-0" />
    </section>
  );
}
