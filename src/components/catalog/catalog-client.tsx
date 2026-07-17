"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReservationAction } from "@/actions/reservations";
import { refreshCatalogAction } from "@/actions/catalog";
import { useCart } from "@/hooks/use-cart";
import {
  calculatePricing,
  type PricingRule,
  qtyToPromo50,
  pack51AddMessage,
} from "@/lib/pricing";
import { matchesStickerSearch } from "@/lib/catalog/search";
import type { CatalogSectionDTO } from "@/lib/catalog/group";
import { dtoToCatalogSticker } from "@/lib/catalog/group";
import type { CatalogSticker } from "@/types";
import { SectionPanel } from "./section-panel";
import { CartSummary } from "./cart-summary";
import { StockConflictModal } from "./stock-conflict-modal";

const POLL_MS = 25000;

interface CatalogClientProps {
  initialSections: CatalogSectionDTO[];
  initialError: string | null;
  initialTotal: number;
  pricingRules: PricingRule[];
  minPickup: number;
  minShipping: number;
  shippingCost: number;
}

export function CatalogClient({
  initialSections,
  initialError,
  initialTotal,
  pricingRules,
  minPickup,
  minShipping,
  shippingCost,
}: CatalogClientProps) {
  const [sections, setSections] = useState(initialSections);
  const [loadError, setLoadError] = useState(initialError);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"full" | "buyable">("full");
  const [lastUnitsOnly, setLastUnitsOnly] = useState(false);
  const [expandAll, setExpandAll] = useState<boolean | null>(null);
  const [pack51Notice, setPack51Notice] = useState<string | null>(null);
  const [conflictCodes, setConflictCodes] = useState<string[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { items, totalQty, addItem, removeItem, setQty, removeUnavailable, hydrated } = useCart();

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await refreshCatalogAction();
      if (result.error) setLoadError(result.error);
      else {
        setLoadError(null);
        setSections(result.sections);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const selectedMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.stickerId, i.qty);
    return m;
  }, [items]);

  const sectionOptions = useMemo(
    () => sections.map((s) => ({ code: s.sectionCode, name: s.sectionName })),
    [sections],
  );

  const filteredSections = useMemo(() => {
    return sections
      .filter((sec) => sectionFilter === "all" || sec.sectionCode === sectionFilter)
      .map((sec) => {
        const stickers = sec.stickers.filter((dto) => {
          const sticker = dtoToCatalogSticker(dto, sec);
          if (viewMode === "buyable") {
            if (!dto.enabled || dto.availableStock <= 0) return false;
          }
          if (lastUnitsOnly && dto.availableStock !== 1) return false;
          if (search && !matchesStickerSearch(sticker, search)) return false;
          return true;
        });
        return { ...sec, stickers };
      })
      .filter((sec) => sec.stickers.length > 0);
  }, [sections, sectionFilter, viewMode, lastUnitsOnly, search]);

  const pricing = useMemo(() => {
    if (totalQty < minPickup) {
      return { subtotal: 0, savings: 0, isPromo: false };
    }
    try {
      const p = calculatePricing(totalQty);
      return { subtotal: p.subtotal, savings: p.savings, isPromo: p.isPromo };
    } catch {
      return { subtotal: 0, savings: 0, isPromo: false };
    }
  }, [totalQty, minPickup]);

  const defaultOpenFor = useCallback(
    (sec: CatalogSectionDTO) => {
      if (expandAll !== null) return expandAll;
      return sec.sectionCode === "FWC" || sec.sectionCode === "ARG" || sec.availableCount > 0;
    },
    [expandAll],
  );

  function handleAdd(sticker: CatalogSticker) {
    if (sticker.available_qty <= 0 || !sticker.enabled) return;
    if (totalQty === 50) {
      setPack51Notice(pack51AddMessage(51));
    }
    addItem({
      stickerId: sticker.id,
      code: sticker.code,
      sectionCode: sticker.section_code,
      maxQty: sticker.available_qty,
      qty: 1,
    });
  }

  function handleReserve() {
    setConflictCodes(null);
    startTransition(async () => {
      await refresh();
      const payload = items.map((i) => ({ sticker_id: i.stickerId, qty: i.qty }));
      const result = await createReservationAction(payload);

      if (!result.success) {
        if (result.error === "STOCK_CONFLICT" && result.unavailable) {
          setConflictCodes(result.unavailable.map((u) => u.code));
          return;
        }
        const messages: Record<string, string> = {
          MIN_QUANTITY: `El pedido mínimo es de ${minPickup} láminas.`,
          RATE_LIMITED: "Demasiados intentos. Espera unos minutos.",
          SERVER_ERROR: "Error del servidor. Intenta nuevamente.",
        };
        alert(messages[result.error] ?? "No se pudo crear la reserva.");
        return;
      }

      sessionStorage.setItem(`reservation_${result.reservationId}`, result.accessToken);
      router.push(`/checkout/${result.reservationId}`);
    });
  }

  if (!hydrated) {
    return (
      <p className="py-12 text-center text-slate-600" role="status">
        Cargando catálogo de láminas…
      </p>
    );
  }

  if (loadError && sections.length === 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-800">No pudimos cargar las láminas.</p>
        <p className="mt-1 text-sm text-red-600">{loadError}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-4 rounded-full bg-red-700 px-6 py-2 text-sm text-white"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:pb-8">
      <div className="min-w-0 pb-36 lg:pb-0">
        {/* Filtros */}
        <div className="space-y-4 rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              placeholder="Buscar: ARG 10, ARG10, Argentina…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              aria-label="Buscar láminas"
            />
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="rounded-xl border border-emerald-200 px-4 py-2.5 text-sm"
              aria-label="Filtrar por sección"
            >
              <option value="all">Todas las secciones</option>
              {sectionOptions.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="viewMode"
                checked={viewMode === "full"}
                onChange={() => setViewMode("full")}
              />
              Mostrar catálogo completo
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="viewMode"
                checked={viewMode === "buyable"}
                onChange={() => setViewMode("buyable")}
              />
              Solo lo que puedo comprar
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={lastUnitsOnly}
                onChange={(e) => setLastUnitsOnly(e.target.checked)}
              />
              Últimas unidades
            </label>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => setExpandAll(true)}
              className="rounded-full border px-3 py-1 hover:bg-emerald-50"
            >
              Expandir todas
            </button>
            <button
              type="button"
              onClick={() => setExpandAll(false)}
              className="rounded-full border px-3 py-1 hover:bg-emerald-50"
            >
              Contraer todas
            </button>
            {isRefreshing && (
              <span className="self-center text-slate-500" role="status">
                Actualizando stock…
              </span>
            )}
            <span className="self-center text-slate-500">
              {initialTotal || sections.reduce((n, s) => n + s.totalStickers, 0)} códigos en
              catálogo
            </span>
          </div>
        </div>

        {/* Secciones */}
        <div className="mt-6 space-y-4">
          {filteredSections.length === 0 ? (
            <p className="py-8 text-center text-slate-600">
              No encontramos láminas con estos filtros.
            </p>
          ) : (
            filteredSections.map((sec) => (
              <SectionPanel
                key={`${sec.sectionCode}-${expandAll}`}
                section={sec}
                defaultOpen={defaultOpenFor(sec)}
                selectedMap={selectedMap}
                onAdd={handleAdd}
                onRemove={removeItem}
                onSetQty={setQty}
              />
            ))
          )}
        </div>
      </div>

      <CartSummary
        totalQty={totalQty}
        minPickup={minPickup}
        minShipping={minShipping}
        shippingCost={shippingCost}
        subtotal={pricing.subtotal}
        savings={pricing.savings}
        toPromo50={qtyToPromo50(totalQty)}
        isPromo={pricing.isPromo}
        items={items}
        onRemove={removeItem}
        onReserve={handleReserve}
        isPending={isPending}
      />

      {pack51Notice && totalQty === 51 && (
        <div className="fixed inset-x-4 bottom-36 z-40 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 lg:bottom-8 lg:left-auto lg:right-[340px] lg:max-w-sm">
          <p>{pack51Notice}</p>
          <button
            type="button"
            onClick={() => setPack51Notice(null)}
            className="mt-2 text-emerald-700 underline"
          >
            Entendido
          </button>
        </div>
      )}

      {conflictCodes && (
        <StockConflictModal
          codes={conflictCodes}
          onRemoveAndContinue={() => {
            const ids = items
              .filter((i) => conflictCodes.includes(i.code))
              .map((i) => i.stickerId);
            removeUnavailable(ids);
            setConflictCodes(null);
          }}
          onClose={() => setConflictCodes(null)}
        />
      )}
    </div>
  );
}
