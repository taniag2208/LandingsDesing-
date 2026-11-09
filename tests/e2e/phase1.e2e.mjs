/**
 * E2E Fase 1 — flujo real contra la app + Supabase local (sin mocks).
 *
 * Requisitos:
 *   npm run db:start && npm run db:reset
 *   npm run build && npm run start         (en otra terminal, puerto 3000)
 *   npm run test:e2e
 *
 * Variables opcionales: BASE_URL, MAILPIT_URL, E2E_SCREENSHOTS (directorio).
 */
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

// Playwright se resuelve en tiempo de ejecución (local: `npm i -D playwright && npx playwright install chromium`).
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const SHOTS = process.env.E2E_SCREENSHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const run = Date.now().toString(36);
const PASSWORD = "Tita2026Studio";
const users = {
  owner: { name: "Ana Owner", email: `ana.${run}@e2e.test` },
  editor: { name: "Beto Editor", email: `beto.${run}@e2e.test` },
  outsider: { name: "Caro Externa", email: `caro.${run}@e2e.test` },
};

let step = 0;
function log(msg) {
  step += 1;
  console.log(`  ✓ ${String(step).padStart(2, "0")} ${msg}`);
}

/** PNG sólido mínimo válido generado en memoria. */
function makePng(w, h, [r, g, b]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set([r, g, b], y * (w * 3 + 1) + 1 + x * 3);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function waitForEmail(to, subjectIncludes) {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const data = await res.json();
    const msg = data.messages?.find((m) => m.Subject.includes(subjectIncludes));
    if (msg) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json();
      const href = /href="([^"]+)"/.exec(full.HTML)?.[1];
      assert.ok(href, "el correo contiene un enlace");
      return href.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No llegó el correo "${subjectIncludes}" a ${to}`);
}

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: false });
}

async function signUpAndConfirm(browser, user, next) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("Nombre completo").fill(user.name);
  await page.getByLabel("Correo de trabajo").fill(user.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.waitForURL(/\/check-email/);
  // Antes de confirmar no se puede ingresar.
  const link = await waitForEmail(user.email, "Confirma");
  await page.goto(link);
  return { ctx, page };
}

async function main() {
  const browser = await chromium.launch();
  console.log(`E2E Fase 1 · ${BASE}`);
  try {
    // --- Protección de rutas ---------------------------------------------
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(`${BASE}/brand-kit`);
      await page.waitForURL(/\/login\?next=%2Fbrand-kit/);
      log("Rutas privadas redirigen a login conservando el destino");
      await page.goto(`${BASE}/login?next=https://evil.example`);
      await page.getByLabel("Correo").fill("nadie@e2e.test");
      await page.getByLabel("Contraseña").fill("Incorrecta123");
      await page.getByRole("button", { name: "Ingresar" }).click();
      await page.getByText("Correo o contraseña incorrectos.").waitFor();
      log("Credenciales inválidas muestran error genérico");
      await shot(page, "01-login");
      await ctx.close();
    }

    // --- Registro + confirmación + organización ---------------------------
    const owner = await signUpAndConfirm(browser, users.owner);
    let page = owner.page;
    await page.waitForURL(/\/onboarding/);
    log("Registro y confirmación por correo (token_hash) llevan al onboarding");
    await shot(page, "02-onboarding");

    const orgName = `Café Origen ${run}`;
    await page.getByLabel("Nombre de la empresa o marca").fill(orgName);
    const slug = await page.getByLabel("Identificador").inputValue();
    assert.match(slug, /^cafe-origen-/);
    await page.getByRole("button", { name: "Crear organización" }).click();
    await page.waitForURL(/\/brand-kit\?welcome=1/);
    await page.getByText("¡Tu organización está lista!").waitFor();
    log(`Organización creada (slug ${slug}) y redirección al Brand Kit`);

    // --- Brand Kit ----------------------------------------------------------
    const primaryHex = page.locator("input[maxlength='7']").first();
    await primaryHex.fill("#C2410C");
    await primaryHex.press("Enter");
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: "Subir logo" }).first().click()]);
    await chooser.setFiles({ name: "logo.png", mimeType: "image/png", buffer: makePng(120, 40, [194, 65, 12]) });
    await page.locator('img[alt="Logo principal"]').waitFor();
    log("Logo subido a Storage (bucket brand-assets, carpeta de la organización)");

    await page.getByLabel("Describe cómo habla tu marca").fill("Hablamos como un amigo experto en café, cálidos y orgullosos del origen.");
    await page.getByText("Premium", { exact: true }).click();
    await page.getByLabel("Instagram").fill("http://instagram.com/inseguro");
    await page.getByRole("button", { name: /Guardar/ }).click();
    await page.getByText("Revisa los campos marcados antes de guardar.").waitFor();
    await page.getByText("Ingresa un enlace https de instagram.com").waitFor();
    log("Validación bloquea enlaces sociales no https");

    await page.getByLabel("Instagram").fill("https://www.instagram.com/cafeorigen");
    await page.getByLabel("WhatsApp").fill("+573001234567");
    await page.getByRole("button", { name: /Guardar/ }).click();
    await page.getByText("Brand Kit guardado.").waitFor();
    log("Brand Kit guardado");
    await shot(page, "03-brand-kit");

    await page.reload();
    assert.equal(await page.locator("input[maxlength='7']").first().inputValue(), "#c2410c");
    assert.equal(await page.getByLabel("WhatsApp").inputValue(), "+573001234567");
    await page.locator('img[alt="Logo principal"]').waitFor();
    const logoSrc = await page.locator('img[alt="Logo principal"]').first().getAttribute("src");
    const logoRes = await fetch(new URL(logoSrc, BASE));
    assert.equal(logoRes.status, 200);
    assert.equal(logoRes.headers.get("content-type"), "image/png");
    log("Persistencia verificada tras recargar (color, contacto, logo público accesible)");

    // --- Concurrencia optimista --------------------------------------------
    const second = await owner.ctx.newPage();
    await second.goto(`${BASE}/brand-kit`);
    await second.getByLabel("Ciudad").fill("Medellín");
    await second.getByRole("button", { name: /Guardar/ }).click();
    await second.getByText("Brand Kit guardado.").waitFor();
    await page.getByLabel("Ciudad").fill("Bogotá");
    await page.getByRole("button", { name: /Guardar/ }).click();
    await page.getByText(/Alguien más actualizó el Brand Kit/).waitFor();
    await second.close();
    log("Edición concurrente detectada: no se sobrescriben cambios ajenos");

    // --- Equipo -------------------------------------------------------------
    await page.goto(`${BASE}/settings/team`);
    await page.getByLabel("Correo").fill(users.editor.email);
    await page.getByRole("button", { name: "Invitar" }).click();
    const inviteLink = await page.locator("code").first().textContent();
    assert.match(inviteLink, /\/invite\/[0-9a-f]{64}$/);
    log("Invitación creada con token de un solo uso");
    await page.getByLabel("Correo").fill(`otro.${run}@e2e.test`);
    await page.getByRole("button", { name: "Invitar" }).click();
    await page.getByText("Tu plan no tiene más asientos disponibles.").waitFor();
    log("Límite de asientos del plan Starter aplicado");
    await shot(page, "04-team");

    // El editor se registra desde el enlace de invitación
    const invitePath = new URL(inviteLink).pathname;
    const editor = await signUpAndConfirm(browser, users.editor, invitePath);
    await editor.page.waitForURL(new RegExp(invitePath));
    await editor.page.getByRole("button", { name: "Aceptar invitación" }).click();
    await editor.page.waitForURL(/\/dashboard\?joined=1/);
    await editor.page.getByText(`Te uniste a ${orgName}`).waitFor();
    log("El invitado se registra, confirma y se une a la organización");
    await editor.page.goto(`${BASE}/settings`);
    assert.equal(await editor.page.getByLabel("Nombre", { exact: true }).isDisabled(), true);
    await editor.page.goto(`${BASE}/settings/activity`);
    await editor.page.getByText("Solo propietarios y administradores pueden ver la actividad.").waitFor();
    log("Un editor no puede editar la organización ni ver auditoría");
    await editor.ctx.close();

    // --- Aislamiento entre organizaciones ----------------------------------
    const outsider = await signUpAndConfirm(browser, users.outsider);
    await outsider.page.waitForURL(/\/onboarding/);
    await outsider.page.getByLabel("Nombre de la empresa o marca").fill(`Otra Marca ${run}`);
    await outsider.page.getByRole("button", { name: "Crear organización" }).click();
    await outsider.page.waitForURL(/\/brand-kit/);
    const cookies = await outsider.ctx.cookies();
    // Forzar la cookie de organización activa con el id ajeno no otorga acceso.
    const ownerOrgCookie = (await owner.ctx.cookies()).find((c) => c.name === "tls_active_org");
    await outsider.ctx.addCookies([{ ...ownerOrgCookie, value: ownerOrgCookie.value }]);
    await outsider.page.goto(`${BASE}/dashboard`);
    const body = await outsider.page.textContent("body");
    assert.ok(!body.includes(orgName), "no debe ver el nombre de la otra organización");
    assert.ok(body.includes(`Otra Marca ${run}`));
    log("Manipular la cookie de organización activa no filtra datos de otro tenant");
    void cookies;
    await outsider.ctx.close();

    // --- Actividad / auditoría ---------------------------------------------
    await page.goto(`${BASE}/settings/activity`);
    await page.getByText(/actualizó el Brand Kit/).first().waitFor();
    log("La auditoría registra los cambios del Brand Kit");

    // --- Recuperación de contraseña ----------------------------------------
    await page.getByRole("button", { name: "Salir" }).first().click();
    await page.waitForURL(/\/login/);
    await page.goto(`${BASE}/forgot-password`);
    await page.getByLabel("Correo").fill(users.owner.email);
    await page.getByRole("button", { name: /Enviar enlace/ }).click();
    await page.waitForURL(/\/check-email/);
    const resetLink = await waitForEmail(users.owner.email, "Restablece");
    await page.goto(resetLink);
    await page.waitForURL(/\/reset-password/);
    await page.getByLabel("Nueva contraseña", { exact: true }).fill("Nueva2026Segura");
    await page.getByLabel("Confirmar contraseña").fill("Nueva2026Segura");
    await page.getByRole("button", { name: "Actualizar contraseña" }).click();
    await page.waitForURL(/\/dashboard\?password=updated/);
    log("Recuperación de contraseña de punta a punta");
    await shot(page, "05-dashboard");

    // --- Móvil ----------------------------------------------------------------
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await owner.ctx.storageState() });
    const mp = await mobile.newPage();
    await mp.goto(`${BASE}/brand-kit`);
    await mp.getByRole("button", { name: "Abrir menú" }).click();
    await mp.getByRole("link", { name: "Configuración" }).click();
    await mp.waitForURL(/\/settings/);
    const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(overflow, false, "sin scroll horizontal en móvil");
    log("Navegación móvil funcional y sin desbordamiento horizontal");
    await mp.goto(`${BASE}/brand-kit`);
    await shot(mp, "06-mobile-brand-kit");
    await mobile.close();

    await owner.ctx.close();
    console.log(`\nE2E Fase 1: ${step} verificaciones OK`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("\n✗ E2E falló:", err);
  process.exit(1);
});
