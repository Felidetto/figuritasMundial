import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
            26
          </span>
          <div>
            <p className="text-sm font-bold text-emerald-950">Láminas 2026</p>
            <p className="text-xs text-emerald-700">Colección a elección</p>
          </div>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/elegir" className="rounded-full bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
            Elegir láminas
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function LegalNotice() {
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Sitio independiente de reventa particular. No afiliado ni patrocinado por Panini, FIFA ni
      sus asociados.
    </p>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-emerald-900/10 bg-emerald-950 text-emerald-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <LegalNotice />
        <p className="mt-4 text-xs text-emerald-200">
          © {new Date().getFullYear()} Láminas 2026 — Venta particular en Osorno, Chile.
        </p>
      </div>
    </footer>
  );
}
