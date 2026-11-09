import Link from "next/link";

/** "← Anteriores · Página X de Y · Próximas →". Não aparece com uma página só. */
export default function Pager({
  page,
  pages,
  prevHref,
  nextHref,
}: {
  page: number;
  pages: number;
  prevHref: string;
  nextHref: string;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-3 px-6 py-4 text-sm text-gray-600" aria-label="Páginas">
      <Link href={prevHref} className={page > 1 ? "hover:text-brand" : "pointer-events-none text-gray-300"}>
        ← Anteriores
      </Link>
      <span>
        Página {page} de {pages}
      </span>
      <Link href={nextHref} className={page < pages ? "hover:text-brand" : "pointer-events-none text-gray-300"}>
        Próximas →
      </Link>
    </nav>
  );
}
