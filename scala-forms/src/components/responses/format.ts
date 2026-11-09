/** Data e hora no fuso de Brasília ("09/11/2026, 14:30"); vazio sem data. */
export const fmtDate = (d: string | Date | null) =>
  d
    ? new Date(d).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : "";
