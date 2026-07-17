import { test, expect } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const hasAdminCreds = Boolean(adminEmail && adminPassword);

test.describe("Smoke local — público", () => {
  test("home responde 200", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("link", { name: /elegir/i }).first()).toBeVisible();
  });

  test("/elegir carga catálogo remoto", async ({ page }) => {
    await page.goto("/elegir");
    await expect(page.getByRole("heading", { name: /selector de láminas/i })).toBeVisible();
    await expect(page.getByText("980 códigos en catálogo")).toBeVisible({ timeout: 30000 });
  });

  test("50 secciones en catálogo completo", async ({ page }) => {
    await page.goto("/elegir");
    await expect(page.getByText("980 códigos en catálogo")).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: "Expandir todas" }).click();
    await expect(page.locator("section[aria-labelledby^='heading-']")).toHaveCount(50, {
      timeout: 15000,
    });
  });

  test("búsqueda ARG10 encuentra ARG 10", async ({ page }) => {
    await page.goto("/elegir");
    await page.getByLabel("Buscar láminas").fill("ARG10");
    await expect(page.getByRole("button", { name: /ARG 10/i }).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("stock cero aparece deshabilitado (agotada)", async ({ page }) => {
    await page.goto("/elegir");
    await page.getByLabel("Buscar láminas").fill("ARG 1");
    const outBtn = page.getByRole("button", { name: /ARG 1, Agotada/i }).first();
    await expect(outBtn).toBeVisible({ timeout: 10000 });
    await expect(outBtn).toBeDisabled();
  });

  test("modo catálogo completo vs solo disponibles", async ({ page }) => {
    await page.goto("/elegir");
    await expect(page.getByText("980 códigos en catálogo")).toBeVisible({ timeout: 30000 });

    await page.getByLabel("Solo lo que puedo comprar").check();
    await page.waitForTimeout(500);
    const buyableSections = await page.locator("section[aria-labelledby^='heading-']").count();

    await page.getByLabel("Mostrar catálogo completo").check();
    await page.getByRole("button", { name: "Expandir todas" }).click();
    await expect(page.locator("section[aria-labelledby^='heading-']")).toHaveCount(50);

    expect(buyableSections).toBeLessThanOrEqual(50);
  });

  test("filtro por sección ARG", async ({ page }) => {
    await page.goto("/elegir");
    await page.getByLabel("Filtrar por sección").selectOption("ARG");
    await expect(page.locator("section[aria-labelledby='heading-ARG']")).toBeVisible();
    await expect(page.getByRole("button", { name: /ARG 10/i }).first()).toBeVisible();
  });

  test("resumen de selección con lámina disponible", async ({ page }) => {
    await page.goto("/elegir");
    await page.getByLabel("Buscar láminas").fill("FWC 1");

    const fwcBtn = page.getByRole("button", { name: /FWC 1/i }).first();
    const disabled = await fwcBtn.isDisabled();

    if (disabled) {
      test.skip(true, "FWC 1 sin stock — ejecutar prueba admin de stock primero");
    }

    await fwcBtn.click();
    await expect(page.getByRole("region", { name: "Resumen del pedido" })).toContainText("1");
  });
});

test.describe("Smoke local — admin", () => {
  test("inventario redirige a login sin sesión", async ({ page }) => {
    await page.goto("/admin/inventario");
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: /Panel Super Admin/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test("dashboard redirige a login sin sesión", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("login admin e inventario", async ({ page }) => {
    test.skip(!hasAdminCreds, "Define E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD en .env.local");

    await page.goto("/admin/login");
    await page.getByLabel("Correo").fill(adminEmail!);
    await page.getByLabel("Contraseña").fill(adminPassword!);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 });

    await page.goto("/admin/inventario");
    await expect(page.getByRole("heading", { name: "Inventario" })).toBeVisible();
    await expect(page.getByText("ARG 10").first()).toBeVisible({ timeout: 15000 });
  });

  test("ajuste de stock admin y reflejo en /elegir", async ({ page }) => {
    test.skip(!hasAdminCreds, "Define E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD en .env.local");

    await page.goto("/admin/login");
    await page.getByLabel("Correo").fill(adminEmail!);
    await page.getByLabel("Contraseña").fill(adminPassword!);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await page.waitForURL(/\/admin\/dashboard/);

    await page.goto("/admin/inventario");
    await page.getByPlaceholder(/buscar/i).fill("ARG 10");
    await page.waitForTimeout(500);

    const card = page.locator("div").filter({ hasText: /^ARG 10$/ }).first();
    await expect(card).toBeVisible();

    const plusBtn = card.locator("..").getByRole("button", { name: "+" });
    await plusBtn.click();
    await page.waitForTimeout(1000);

    await page.goto("/elegir");
    await page.getByLabel("Buscar láminas").fill("ARG 10");
    const argBtn = page.getByRole("button", { name: /ARG 10/i }).first();
    await expect(argBtn).toBeEnabled({ timeout: 15000 });
  });
});
