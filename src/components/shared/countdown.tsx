"use client";

import { useEffect, useState } from "react";
import { getServerTimeAction } from "@/actions/reservations";

export function Countdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    let offset = 0;

    async function sync() {
      const serverTime = await getServerTimeAction();
      offset = new Date(serverTime).getTime() - Date.now();
    }

    sync();

    const interval = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - (Date.now() + offset);
      setRemaining(Math.max(ms, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (remaining === null) return <span className="text-sm text-slate-500">Sincronizando…</span>;

  const totalSec = Math.floor(remaining / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;

  if (remaining <= 0) {
    return (
      <p className="font-medium text-red-600" role="timer">
        Tu reserva venció y las láminas fueron liberadas
      </p>
    );
  }

  return (
    <p className="font-medium text-amber-800" role="timer" aria-live="polite">
      Tiempo restante: {min}:{sec.toString().padStart(2, "0")}
    </p>
  );
}
