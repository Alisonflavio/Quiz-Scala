/*
 * Teste ponta a ponta do Diagnóstico Scala, num navegador de verdade (Playwright):
 * cria (ou entra com) um admin de teste, cria e publica o Diagnóstico, responde tudo, confirma o diagnóstico,
 * passa pela página de obrigado (corrige o telefone, abre a aula, chega ao fim) e confere o painel.
 *
 * Use só com banco de teste (sem DATABASE_URL o app usa o banco embutido em .data/):
 *   npm run dev            # em outro terminal
 *   npm run e2e            # BASE=http://localhost:3000 por padrão
 * A senha do admin de teste fica em .e2e-senha (ignorado pelo git).
 */
import { chromium } from "playwright";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const CRED = new URL("../.e2e-senha", import.meta.url);
const senha = existsSync(CRED) ? readFileSync(CRED, "utf8") : randomBytes(12).toString("hex");
writeFileSync(CRED, senha);
const BASE = process.env.BASE ?? "http://localhost:3000";
const fail = (msg) => {
  console.error("FALHOU:", msg);
  process.exitCode = 1;
};
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
// conta admin descartável só no banco local de teste
await p.goto(BASE + "/setup");
await p.waitForLoadState("networkidle");
if (p.url().includes("setup")) await p.fill('input[name="name"]', "Teste Local");
else {
  await p.goto(BASE + "/login");
  await p.waitForLoadState("networkidle");
}
await p.fill('input[name="email"]', "teste@local.test");
await p.fill('input[name="password"]', senha);
await Promise.all([p.waitForURL(/\/dash/), p.locator("form button:not([type=button])").click()]);
await p
  .getByRole("button", { name: /novo|criar/i })
  .first()
  .click();
await Promise.all([p.waitForURL(/editor/), p.getByText("Diagnóstico Scala Fitness").click()]);
const formId = p.url().match(/forms\/([^/]+)/)[1];
await p.getByRole("button", { name: "Publicar" }).click();
await p.getByRole("button", { name: /Publicado/ }).waitFor();
console.log("FORM", formId);

const q = await ctx.newPage();
q.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await q.goto(`${BASE}/f/${formId}?utm_source=teste`);
for (let i = 0; i < 25; i++) {
  await q.waitForTimeout(700);
  if (
    await q
      .getByText("Ver a solução")
      .isVisible()
      .catch(() => false)
  )
    break;
  const all = q.locator("main input:visible");
  if ((await all.count()) === 2) {
    await all.nth(0).fill("41");
    await all.nth(1).fill("988887777");
    await all.nth(1).press("Enter");
    continue;
  }
  const input = q.locator("main input:visible, main textarea:visible").first();
  if (await input.count()) {
    const type = await input.getAttribute("type");
    const val =
      type === "email"
        ? "ana@exemplo.com"
        : type === "tel"
          ? "41988887777"
          : (await q.locator("h1,h2").first().innerText()).toLowerCase().includes("nome")
            ? "Ana Souza"
            : "@ana";
    await input.fill(val);
    await input.press("Enter");
    continue;
  }
  const opt = q.locator("main button.sf-opt, main [role=radio], main button:has-text('A')").first();
  const start = q.getByRole("button", { name: /começar|vamos|quero/i }).first();
  if (await start.isVisible().catch(() => false)) {
    await start.click();
    continue;
  }
  if (await opt.count()) {
    await opt.click();
    continue;
  }
  console.log("TRAVOU EM:", (await q.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 300));
  break;
}
await q.waitForTimeout(3000);
console.log("DIAG:", (await q.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 300));
await Promise.all([q.waitForURL(/obrigado/), q.getByText("Ver a solução").click()]);
const u = new URL(q.url());
console.log("OBRIGADO rid/fid:", !!u.searchParams.get("rid"), u.searchParams.get("fid") === formId);
if (!u.searchParams.get("rid") || u.searchParams.get("fid") !== formId) fail("página de obrigado sem rid/fid");
if (u.search.match(/nome|whatsapp|email|renda/)) fail("dados pessoais na URL da página de obrigado");
await q.waitForTimeout(800);
console.log(
  "OBRIGADO TEXTO:",
  (await q.locator('section[aria-label="Diagnóstico recebido"]').innerText()).replace(/\s+/g, " ").slice(0, 160),
);
await q.getByRole("button", { name: "Corrigir" }).click();
await q.fill('input[aria-label="Telefone com DDD"]', "41977776666");
await q.getByRole("button", { name: "Salvar" }).click();
const tel = await q.getByTestId("telefone").innerText();
console.log("TEL NA TELA:", tel);
if (tel !== "(41) 97777-6666") fail("telefone corrigido não aparece na tela");
await q.getByRole("button", { name: /Assistir à aula/ }).click();
await q.waitForTimeout(800);
console.log("AULA:", await q.locator("section").first().getAttribute("aria-label"), "| hash:", new URL(q.url()).hash);
await q.getByRole("button", { name: /Já assisti/ }).click();
await q.waitForTimeout(800);
console.log("FIM:", (await q.locator("section").first().innerText()).replace(/\s+/g, " ").slice(0, 200));
await q.waitForTimeout(1000);
await p.goto(`${BASE}/dash/forms/${formId}/responses`);
const painel = (await p.locator("body").innerText()).replace(/\s+/g, " ");
console.log("EVENTOS PAINEL:", painel.match(/chegou_fim: \S+|telefone_corrigido: \S+/g));
if (!painel.includes("telefone_corrigido: 41977776666")) fail("telefone corrigido não chegou ao painel");
if (!painel.includes("chegou_fim: sim")) fail("evento chegou_fim não chegou ao painel");
console.log(
  "PAINEL:",
  (await p.locator("body").innerText()).replace(/\s+/g, " ").match(/Resultado do diagnóstico.{0,400}/)?.[0],
);
await p.goto(`${BASE}/dash/forms/${formId}/responses?q=97777`);
const busca = (await p.locator("aside").innerText()).replace(/\s+/g, " ");
console.log("BUSCA TELEFONE:", busca.slice(0, 80));
if (!busca.includes("Ana Souza")) fail("busca pelo telefone corrigido não encontrou a resposta");
await b.close();
console.log(process.exitCode ? "E2E: FALHOU" : "E2E: OK");
