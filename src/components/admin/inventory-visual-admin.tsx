"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { adjustStockAction, adjustStockDeltaAction } from "@/actions/admin";
import { matchesStickerSearch } from "@/lib/catalog/search";
import type { CatalogSectionDTO } from "@/lib/catalog/group";
import type { CatalogSticker } from "@/types";

const REASONS = {
  plus: "Nueva lámina recibida",
  minus: "Corrección manual",
  exact: "Corrección de inventario",
} as const;

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
  section_sort_order?: number;
  display_order?: number;
}

type Filter = "all" | "with_stock" | "out" | "last_unit" | "reserved";

function toSections(rows: InventoryRow[]): CatalogSectionDTO[] {
  const map = new Map<string, CatalogSectionDTO>();
  for (const r of rows) {
    if (!map.has(r.section_code)) {
      map.set(r.section_code, {
        sectionCode: r.section_code,
        sectionName: r.section_name,
        sortOrder: r.section_sort_order ?? 0,
        totalStickers: 0,
        availableCount: 0,
        stickers: [],
      });
    }
    const sec = map.get(r.section_code)!;
    sec.stickers.push({
      id: r.id,
      code: r.code,
      number: 0,
      name: r.name,
      enabled: r.enabled,
      availableStock: r.available_qty,
      physicalStock: r.physical_stock,
      reservedStock: r.reserved_stock,
      soldStock: r.sold_stock,
    });
    sec.totalStickers += 1;
    if (r.available_qty > 0) sec.availableCount += 1;
  }
  return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

function sectionStats(stickers: CatalogSectionDTO["stickers"]) {
  return {
    physical: stickers.reduce((s, st) => s + st.physicalStock, 0),
    available: stickers.reduce((s, st) => s + st.availableStock, 0),
    reserved: stickers.reduce((s, st) => s + st.reservedStock, 0),
    withStock: stickers.filter((st) => st.availableStock > 0).length,
    total: stickers.length,
  };
}

function availableQty(physical: number, reserved: number, sold: number) {
  return Math.max(physical - reserved - sold, 0);
}

function StockQuantity({
  row,
  disabled,
  onMessage,
  onUpdated,
}: {
  row: InventoryRow;
  disabled: boolean;
  onMessage: (msg: string) => void;
  onUpdated: (stickerId: string, physical: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const minPhysical = row.reserved_stock + row.sold_stock;

  function startEdit() {
    if (disabled || isPending) return;
    setDraft(String(row.physical_stock));
    setEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

  function cancelEdit() {
    setEditing(false);
    setDraft("");
  }

  function commitEdit() {
    if (!editing) return;
    const parsed = Number.parseInt(draft, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      onMessage("Ingresa una cantidad válida");
      cancelEdit();
      return;
    }
    if (parsed === row.physical_stock) {
      cancelEdit();
      return;
    }
    if (parsed < minPhysical) {
      onMessage(
        `El stock no puede ser menor que lo comprometido (${minPhysical}: reservas + vendidas)`,
      );
      cancelEdit();
      return;
    }

    setEditing(false);
    startTransition(async () => {
      const res = await adjustStockAction({
        stickerId: row.id,
        newPhysical: parsed,
        reason: REASONS.exact,
      });
      if (!res.success) {
        onMessage(res.error ?? "Error al ajustar");
        return;
      }
      onUpdated(row.id, parsed);
      onMessage("Stock actualizado");
    });
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        min={minPhysical}
        value={draft}
        disabled={disabled || isPending}
        aria-label={`Nueva cantidad para ${row.code}`}
        className="h-8 w-12 rounded border px-1 text-center text-sm font-bold"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitEdit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancelEdit();
          }
        }}
        onBlur={commitEdit}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || isPending}
      onDoubleClick={startEdit}
      title="Doble clic para editar cantidad"
      className="min-w-[1.5rem] cursor-text rounded px-1 font-bold hover:bg-slate-100 disabled:opacity-40"
    >
      {row.physical_stock}
    </button>
  );
}

export function InventoryVisualAdmin({ initialRows }: { initialRows: InventoryRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const summary = useMemo(() => ({
    physical: rows.reduce((s, r) => s + r.physical_stock, 0),
    available: rows.reduce((s, r) => s + r.available_qty, 0),
    reserved: rows.reduce((s, r) => s + r.reserved_stock, 0),
    withStock: rows.filter((r) => r.available_qty > 0).length,
    out: rows.filter((r) => r.available_qty <= 0).length,
  }), [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (search) {
        const sticker = {
          id: r.id,
          code: r.code,
          number: 0,
          name: r.name,
          enabled: r.enabled,
          section_id: "",
          section_code: r.section_code,
          section_name: r.section_name,
          section_sort_order: 0,
          physical_stock: r.physical_stock,
          reserved_stock: r.reserved_stock,
          sold_stock: r.sold_stock,
          available_qty: r.available_qty,
        } satisfies CatalogSticker;
        if (!matchesStickerSearch(sticker, search)) return false;
      }
      if (filter === "with_stock" && r.available_qty <= 0) return false;
      if (filter === "out" && r.available_qty > 0) return false;
      if (filter === "last_unit" && r.available_qty !== 1) return false;
      if (filter === "reserved" && r.reserved_stock <= 0) return false;
      return true;
    });
  }, [rows, search, filter]);

  const sections = useMemo(() => toSections(filteredRows), [filteredRows]);

  function updatePhysical(stickerId: string, physical: number) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === stickerId
          ? {
              ...r,
              physical_stock: physical,
              available_qty: availableQty(physical, r.reserved_stock, r.sold_stock),
            }
          : r,
      ),
    );
  }

  function applyDelta(stickerId: string, delta: number, reason: string) {
    startTransition(async () => {
      const res = await adjustStockDeltaAction({ stickerId, delta, reason });
      if (!res.success) {
        setMessage(res.error ?? res.message ?? "Error al ajustar");
        return;
      }
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== stickerId) return r;
          const physical = r.physical_stock + delta;
          return {
            ...r,
            physical_stock: physical,
            available_qty: availableQty(physical, r.reserved_stock, r.sold_stock),
          };
        }),
      );
      setMessage("Stock actualizado");
    });
  }

  return (
    <div>
      <div className="sticky top-14 z-30 -mx-4 mb-4 space-y-3 border-b border-slate-200 bg-slate-50/95 px-4 pb-4 pt-1 backdrop-blur-sm lg:top-0 lg:-mx-8 lg:px-8">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
          {[
            ["Stock físico total", summary.physical],
            ["Disponibles", summary.available],
            ["Reservadas", summary.reserved],
            ["Con stock", summary.withStock],
            ["Agotados", summary.out],
          ].map(([label, val]) => (
            <div key={label as string} className="rounded-lg border bg-white p-2.5 text-sm shadow-sm sm:p-3">
              <p className="text-slate-500">{label}</p>
              <p className="text-lg font-bold sm:text-xl">{val}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-white p-3 shadow-sm sm:flex-row sm:p-4">
          <input
            type="search"
            placeholder="Buscar ARG10, Argentina…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="all">Todas</option>
            <option value="with_stock">Con stock</option>
            <option value="out">Agotadas</option>
            <option value="last_unit">Última unidad</option>
            <option value="reserved">Con reservas</option>
          </select>
        </div>
      </div>

      {message && <p className="mb-3 text-sm text-emerald-700">{message}</p>}
      <p className="mb-3 text-xs text-slate-500">
        Usa +/− para ajustes rápidos. Doble clic en la cantidad central para editar por teclado
        (Enter guarda, Esc cancela).
      </p>

      <div className="space-y-4">
        {sections.map((sec) => {
          const stats = sectionStats(sec.stickers);
          return (
          <div key={sec.sectionCode} className="rounded-xl border bg-white p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-4">
              <h3 className="font-bold">
                {sec.sectionCode} — {sec.sectionName}
              </h3>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-emerald-800">{stats.physical}</span> en stock
                {" · "}
                <span className="font-semibold text-emerald-700">{stats.available}</span> disponibles
                {stats.reserved > 0 && (
                  <>
                    {" · "}
                    <span className="font-semibold text-amber-700">{stats.reserved}</span> reservadas
                  </>
                )}
                {" · "}
                {stats.withStock}/{stats.total} códigos con stock
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {sec.stickers.map((dto) => {
                const row = rows.find((r) => r.id === dto.id)!;
                return (
                  <div key={dto.id} className="rounded-lg border p-2 text-center text-xs">
                    <p className="font-bold">{dto.code}</p>
                    <p className="text-slate-500">Disp: {row.available_qty}</p>
                    {row.reserved_stock > 0 && (
                      <p className="text-amber-600">Res: {row.reserved_stock}</p>
                    )}
                    <div className="mt-2 flex items-center justify-center gap-1">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => applyDelta(row.id, -1, REASONS.minus)}
                        className="flex h-8 w-8 items-center justify-center rounded border font-bold hover:bg-slate-50 disabled:opacity-40"
                      >
                        −
                      </button>
                      <StockQuantity
                        row={row}
                        disabled={isPending}
                        onMessage={setMessage}
                        onUpdated={updatePhysical}
                      />
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => applyDelta(row.id, 1, REASONS.plus)}
                        className="flex h-8 w-8 items-center justify-center rounded border font-bold hover:bg-emerald-50 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
