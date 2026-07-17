"use client";

import { useMemo, useState, useTransition } from "react";
import {
  adjustStockAction,
  adjustStockDeltaAction,
  exportInventoryAction,
  toggleStickerAction,
  updateStickerNameAction,
} from "@/actions/admin";
import { CsvImportForm } from "./csv-import-form";

export const STOCK_REASONS = [
  "nueva repetida obtenida",
  "corrección de inventario",
  "venta presencial",
  "lámina dañada",
  "devolución",
  "ajuste inicial",
] as const;

export interface InventoryRow {
  id: string;
  code: string;
  section_code: string;
  section_name: string;
  name: string | null;
  enabled: boolean;
  physical_stock: number;
  reserved_stock: number;
  sold_stock: number;
  available_qty: number;
}

export function InventoryAdmin({ rows }: { rows: InventoryRow[] }) {
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [onlyOut, setOnlyOut] = useState(false);
  const [onlyWithStock, setOnlyWithStock] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sections = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) m.set(r.section_code, r.section_name);
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (sectionFilter !== "all" && r.section_code !== sectionFilter) return false;
      if (onlyOut && r.available_qty > 0) return false;
      if (onlyWithStock && r.physical_stock <= 0) return false;
      if (q && !r.code.toLowerCase().includes(q) && !r.section_code.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [rows, search, sectionFilter, onlyOut, onlyWithStock]);

  function run(action: () => Promise<{ success: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const res = await action();
      if (res.success) {
        setMessage("Actualizado correctamente");
        window.location.reload();
      } else {
        setMessage(res.error ?? res.message ?? "Error");
      }
    });
  }

  function handleDelta(stickerId: string, delta: number) {
    const reason =
      prompt(`Motivo del ajuste (${delta > 0 ? "+" : ""}${delta}):`, STOCK_REASONS[0]) ??
      STOCK_REASONS[0];
    run(() => adjustStockDeltaAction({ stickerId, delta, reason }));
  }

  function handleSetExact(stickerId: string, current: number) {
    const val = prompt(`Stock físico exacto (actual: ${current}):`, String(current));
    if (val === null) return;
    const n = parseInt(val, 10);
    if (Number.isNaN(n)) return;
    const reason = prompt("Motivo:", "corrección de inventario") ?? "corrección de inventario";
    run(() => adjustStockAction({ stickerId, newPhysical: n, reason }));
  }

  function handleExport() {
    startTransition(async () => {
      const csv = await exportInventoryAction();
      if (!csv) return;
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "inventario-laminas-2026.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="space-y-6">
      <CsvImportForm />

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Buscar código…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        />
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="all">Todas</option>
          {sections.map(([c, n]) => (
            <option key={c} value={c}>
              {c} — {n}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={onlyOut} onChange={(e) => setOnlyOut(e.target.checked)} />
          Solo agotadas
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={onlyWithStock}
            onChange={(e) => setOnlyWithStock(e.target.checked)}
          />
          Solo con stock
        </label>
        <button
          type="button"
          onClick={handleExport}
          disabled={isPending}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-emerald-50"
        >
          Exportar CSV
        </button>
      </div>

      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <p className="text-sm text-slate-500">
        Mostrando {filtered.length} de {rows.length} códigos
      </p>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-emerald-50">
            <tr>
              <th className="p-2">Código</th>
              <th className="p-2">Sección</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Físico</th>
              <th className="p-2">Res.</th>
              <th className="p-2">Vend.</th>
              <th className="p-2">Disp.</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2 font-mono font-semibold">{row.code}</td>
                <td className="p-2">{row.section_code}</td>
                <td className="p-2">
                  <button
                    type="button"
                    className="text-left underline decoration-dotted"
                    onClick={() => {
                      const name = prompt("Nombre:", row.name ?? "");
                      if (name === null) return;
                      run(() => updateStickerNameAction(row.id, name));
                    }}
                  >
                    {row.name ?? "—"}
                  </button>
                </td>
                <td className="p-2">{row.physical_stock}</td>
                <td className="p-2">{row.reserved_stock}</td>
                <td className="p-2">{row.sold_stock}</td>
                <td className="p-2 font-bold">{row.available_qty}</td>
                <td className="p-2">{row.enabled ? "Activa" : "Inactiva"}</td>
                <td className="p-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelta(row.id, -1)}
                      className="rounded border px-2 py-0.5 text-xs"
                    >
                      −1
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelta(row.id, 1)}
                      className="rounded border px-2 py-0.5 text-xs"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelta(row.id, 5)}
                      className="rounded border px-2 py-0.5 text-xs"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSetExact(row.id, row.physical_stock)}
                      className="text-xs text-emerald-700 underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        run(() => toggleStickerAction(row.id, !row.enabled).then((r) => r))
                      }
                      className="text-xs text-slate-600 underline"
                    >
                      {row.enabled ? "Off" : "On"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
