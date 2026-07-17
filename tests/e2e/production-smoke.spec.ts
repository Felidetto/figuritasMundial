import { test, expect } from "@playwright/test";

const PROD_URL = process.env.PRODUCTION_URL ?? "https://figuritas-mundial-blue.vercel.app";

test.describe("Smoke producción", () => {
  test.use({ baseURL: PROD_URL });

  test("GET / responde 200", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
  });

  test("GET /elegir responde 200 y catálogo", async ({ page }) => {
    await page.goto("/elegir");
    await expect(page.getByRole("heading", { name: /selector de láminas/i })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText("980 códigos en catálogo")).toBeVisible({ timeout: 30000 });
  });

  test("50 secciones y búsqueda ARG10", async ({ page }) => {
    await page.goto("/elegir");
    await expect(page.getByText("980 códigos en catálogo")).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: "Expandir todas" }).click();
    await expect(page.locator("section[aria-labelledby^='heading-']")).toHaveCount(50, {
      timeout: 15000,
    });
    await page.getByLabel("Buscar láminas").fill("ARG10");
    await expect(page.getByRole("button", { name: /ARG 10/i }).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("stock 0 deshabilitado", async ({ page }) => {
    await page.goto("/elegir");
    await page.getByLabel("Buscar láminas").fill("ARG 1");
    const btn = page.getByRole("button", { name: /ARG 1, Agotada/i }).first();
    await expect(btn).toBeVisible({ timeout: 10000 });
    await expect(btn).toBeDisabled();
  });

  test("admin inventario exige login", async ({ page }) => {
    await page.goto("/admin/inventario");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("admin dashboard exige login", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("login admin carga", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: /Panel Super Admin/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
  });

  test("precios públicos actualizados", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Pack de 50 láminas a elección/i)).toBeVisible();
    await expect(page.getByText(/\$15\.000|\$15,000|15\.000/)).toBeVisible();
    await expect(page.getByText(/Desde la lámina 51/i)).toBeVisible();
    await expect(page.getByText(/Despacho.*2\.000|2,000/i)).toBeVisible();
  });

  test("no expone service role en HTML", async ({ page }) => {
    await page.goto("/elegir");
    const html = await page.content();
    expect(html).not.toMatch(/service_role/i);
    expect(html).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/i);
  });

  test("HTTPS activo", async ({ page }) => {
    await page.goto("/");
    expect(page.url()).toMatch(/^https:\/\//);
  });
});
