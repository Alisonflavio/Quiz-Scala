/** Faixa amarela da pré-visualização do rascunho (nada é salvo). */
export default function PreviewBar() {
  return (
    <div className="sticky top-0 z-20 bg-amber-400 px-4 py-1.5 text-center text-sm font-medium text-black">
      Pré-visualização do rascunho: as respostas não são salvas.
    </div>
  );
}
