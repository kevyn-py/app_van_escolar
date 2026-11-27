"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleCheck, TriangleAlert, Undo2, X } from "lucide-react";

export interface ToastOptions {
  message: string;
  tone?: "success" | "error" | "info";
  actionLabel?: string;
  onAction?: () => void;
  /** Duração em ms (padrão 5000 — RN-11). */
  duration?: number;
}

interface ToastState extends ToastOptions {
  id: number;
}

const ToastContext = createContext<{ show: (t: ToastOptions) => void; dismiss: () => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((t: ToastOptions) => {
    if (timer.current) clearTimeout(timer.current);
    const id = Date.now();
    setToast({ ...t, id });
    timer.current = setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), t.duration ?? 5000);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);
  const tone = toast?.tone ?? "info";

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-6 md:left-64"
      >
        {toast && (
          <div
            key={toast.id}
            role={tone === "error" ? "alert" : "status"}
            className={`toast-in pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-xl ${
              tone === "error" ? "bg-red-700" : "bg-slate-900"
            }`}
          >
            {tone === "error" ? (
              <TriangleAlert className="size-5 shrink-0" aria-hidden />
            ) : (
              <CircleCheck className="size-5 shrink-0 text-emerald-300" aria-hidden />
            )}
            <p className="flex-1 text-[15px] leading-snug">{toast.message}</p>
            {toast.actionLabel && toast.onAction ? (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  dismiss();
                }}
                className="flex min-h-11 items-center gap-1.5 rounded-xl bg-white/15 px-3 font-semibold text-white hover:bg-white/25"
              >
                <Undo2 className="size-4" aria-hidden />
                {toast.actionLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={dismiss}
                aria-label="Fechar aviso"
                className="flex size-11 items-center justify-center rounded-xl hover:bg-white/15"
              >
                <X className="size-5" aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx;
}
