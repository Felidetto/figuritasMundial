"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { adminLogoutAction } from "@/actions/admin";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/inventario", label: "Inventario" },
  { href: "/admin/ventas", label: "Ventas" },
  { href: "/admin/configuracion", label: "Configuración" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-emerald-700">Panel Super Admin</p>
            <p className="text-sm font-bold text-slate-900">Láminas 2026</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border px-3 py-2 text-sm"
            aria-expanded={open}
          >
            Menú
          </button>
        </div>
        {open && (
          <nav className="mt-3 flex flex-col gap-1 border-t pt-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  pathname.startsWith(item.href) ? "bg-emerald-100 font-semibold" : "hover:bg-slate-100",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/elegir" className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100">
              Ir a la tienda
            </Link>
            <form action={adminLogoutAction}>
              <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600">
                Cerrar sesión
              </button>
            </form>
          </nav>
        )}
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-56 shrink-0 border-r bg-white p-4 lg:block lg:min-h-screen">
          <p className="text-xs font-medium uppercase text-emerald-700">Panel Super Admin</p>
          <p className="mt-1 text-lg font-bold text-slate-900">Láminas 2026</p>
          <nav className="mt-6 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  pathname.startsWith(item.href) ? "bg-emerald-100 font-semibold text-emerald-900" : "text-slate-700 hover:bg-slate-100",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 space-y-2 border-t pt-4 text-sm">
            <Link href="/elegir" className="block rounded-lg px-3 py-2 hover:bg-slate-100">
              Ir a la tienda
            </Link>
            <form action={adminLogoutAction}>
              <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50">
                Cerrar sesión
              </button>
            </form>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
