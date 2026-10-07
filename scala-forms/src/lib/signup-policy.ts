/* Quem pode criar conta sozinho: só e-mails do domínio da empresa (a posse do e-mail é confirmada por link enviado a ele, ver signup.ts). */

const DEFAULT_SIGNUP_DOMAIN = "ptadigital.com.br";

/** Domínio liberado para cadastro automático; pode ser trocado em SIGNUP_DOMAIN. */
export const signupDomain = () => (process.env.SIGNUP_DOMAIN || DEFAULT_SIGNUP_DOMAIN).trim().toLowerCase();

/**
 * `true` se o e-mail termina exatamente em `@dominio`. Compara o domínio inteiro (depois do último `@`),
 * então `x@ptadigital.com.br.evil.com` e `x@evilptadigital.com.br` não passam.
 */
export function isAllowedSignupEmail(email: string, domain = signupDomain()): boolean {
  const at = email.lastIndexOf("@");
  return (
    at > 0 &&
    email
      .slice(at + 1)
      .trim()
      .toLowerCase() === domain.toLowerCase()
  );
}
