import Link from "next/link";
import { adminLogoutAction } from "@/actions/admin";

export function AdminNav() {
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b pb-4 text-sm">
      <Link href="/admin" className="rounded px-3 py-1 hover:bg-emerald-50">
        Dashboard
      </Link>
      <Link href="/admin/inventario" className="rounded px-3 py-1 hover:bg-emerald-50">
        Inventario
      </Link>
      <Link href="/admin/pedidos" className="rounded px-3 py-1 hover:bg-emerald-50">
        Pedidos
      </Link>
      <Link href="/admin/configuracion" className="rounded px-3 py-1 hover:bg-emerald-50">
        Configuración
      </Link>
      <form action={adminLogoutAction} className="ml-auto">
        <button type="submit" className="text-red-600 hover:underline">
          Cerrar sesión
        </button>
      </form>
    </nav>
  );
}
