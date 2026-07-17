"use client";

import { useState, useTransition } from "react";
import { importCsvAction, previewCsvAction } from "@/actions/admin";

type StockMode = "replace" | "add";

export function CsvImportForm() {
  const [mode, setMode] = useState<StockMode>("replace");
  const [preview, setPreview] = useState<{
    valid: number;
    invalid: string[];
    updates: Array<{ code: string; current: number; new: number }>;
  } | null>(null);
  const [csvContent, setCsvContent] = useState("");
  const [result, setResult] = useState<{ success: boolean; rows: string[]; error?: string | null } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setCsvContent(content);
      startTransition(async () => {
        const p = await previewCsvAction(content, mode);
        setPreview(p);
      });
    };
    reader.readAsText(file);
  }

  function handleImport() {
    if (!csvContent) return;
    startTransition(async () => {
      const res = await importCsvAction(csvContent, mode);
      setResult(res);
      if (res.success) window.location.reload();
    });
  }

  return (
    <div className="rounded-xl border p-4">
      <h2 className="font-bold">Importar inventario CSV</h2>
      <p className="mt-1 text-xs text-slate-600">Formato: section,code,name,stock,enabled</p>

      <fieldset className="mt-3 flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={mode === "replace"}
            onChange={() => setMode("replace")}
          />
          Reemplazar stock
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === "add"} onChange={() => setMode("add")} />
          Sumar stock
        </label>
      </fieldset>

      <input
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="mt-3 text-sm"
        aria-label="Archivo CSV"
      />

      {preview && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
          <p>Válidas: {preview.valid}</p>
          {preview.invalid.length > 0 && (
            <ul className="mt-1 text-red-600">
              {preview.invalid.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          {preview.updates.length > 0 && (
            <ul className="mt-2 max-h-32 overflow-y-auto text-xs">
              {preview.updates.slice(0, 20).map((u) => (
                <li key={u.code}>
                  {u.code}: {u.current} → {u.new}
                </li>
              ))}
              {preview.updates.length > 20 && (
                <li>… y {preview.updates.length - 20} más</li>
              )}
            </ul>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={isPending || !csvContent || (preview?.invalid.length ?? 0) > 0}
        onClick={handleImport}
        className="mt-3 rounded bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {isPending ? "Importando…" : "Aplicar importación"}
      </button>

      {result && (
        <div className={`mt-2 text-sm ${result.success ? "text-emerald-700" : "text-red-600"}`}>
          {result.error}
          <ul>
            {result.rows.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
