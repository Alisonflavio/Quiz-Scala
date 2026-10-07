import { describe, expect, it } from "vitest";
import { isAllowedSignupEmail } from "@/lib/signup-policy";

const DOMAIN = "ptadigital.com.br";

describe("isAllowedSignupEmail", () => {
  it("deve_aceitar_email_do_dominio_sem_diferenciar_maiusculas", () => {
    expect(isAllowedSignupEmail("ana@ptadigital.com.br", DOMAIN)).toBe(true);
    expect(isAllowedSignupEmail("Ana@PTADigital.com.BR", DOMAIN)).toBe(true);
  });

  it("deve_recusar_outros_dominios_e_truques_de_sufixo_ou_prefixo", () => {
    expect(isAllowedSignupEmail("ana@gmail.com", DOMAIN)).toBe(false);
    expect(isAllowedSignupEmail("ana@evilptadigital.com.br", DOMAIN)).toBe(false);
    expect(isAllowedSignupEmail("ana@ptadigital.com.br.evil.com", DOMAIN)).toBe(false);
    expect(isAllowedSignupEmail("ana@sub.ptadigital.com.br", DOMAIN)).toBe(false);
  });

  it("deve_recusar_email_invalido_ou_vazio", () => {
    expect(isAllowedSignupEmail("", DOMAIN)).toBe(false);
    expect(isAllowedSignupEmail("@ptadigital.com.br", DOMAIN)).toBe(false);
    expect(isAllowedSignupEmail("ptadigital.com.br", DOMAIN)).toBe(false);
  });
});
