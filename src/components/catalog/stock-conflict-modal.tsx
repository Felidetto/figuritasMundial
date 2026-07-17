"use client";

interface StockConflictModalProps {
  codes: string[];
  onRemoveAndContinue: () => void;
  onClose: () => void;
}

export function StockConflictModal({
  codes,
  onRemoveAndContinue,
  onClose,
}: StockConflictModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="conflict-title" className="text-lg font-bold text-red-800">
          Algunas láminas se agotaron mientras realizabas tu selección
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Estos códigos ya no están disponibles:
        </p>
        <ul className="mt-3 max-h-40 overflow-y-auto rounded-lg border bg-slate-50 p-3 font-mono text-sm">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onRemoveAndContinue}
            className="flex-1 rounded-full bg-emerald-600 py-2.5 text-sm font-bold text-white"
          >
            Quitar agotadas y continuar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border py-2.5 text-sm font-medium"
          >
            Volver al selector
          </button>
        </div>
      </div>
    </div>
  );
}
