"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { X, Check, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  exiting?: boolean;
  progress: number;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const noop = () => {};

const ToastContext = createContext<ToastContextValue>({
  toast: noop,
  success: noop,
  error: noop,
  warning: noop,
  info: noop,
});

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastVariant, typeof Check> = {
  success: Check,
  error: X,
  warning: AlertTriangle,
  info: Info,
};

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-green-500/20 bg-green-50 text-green-700 [data-theme=dark]:border-green-800/40 [data-theme=dark]:bg-green-950/80 [data-theme=dark]:text-green-300",
  error: "border-red-500/20 bg-red-50 text-red-700 [data-theme=dark]:border-red-800/40 [data-theme=dark]:bg-red-950/80 [data-theme=dark]:text-red-300",
  warning: "border-yellow-500/20 bg-yellow-50 text-yellow-700 [data-theme=dark]:border-yellow-800/40 [data-theme=dark]:bg-yellow-950/80 [data-theme=dark]:text-yellow-300",
  info: "border-indigo-500/20 bg-indigo-50 text-indigo-700 [data-theme=dark]:border-atlas-accent/40 [data-theme=dark]:bg-indigo-950/80 [data-theme=dark]:text-indigo-300",
};

const PROGRESS_COLORS: Record<ToastVariant, string> = {
  success: "bg-green-500/30 [data-theme=dark]:bg-green-400/20",
  error: "bg-red-500/30 [data-theme=dark]:bg-red-400/20",
  warning: "bg-yellow-500/30 [data-theme=dark]:bg-yellow-400/20",
  info: "bg-indigo-500/30 [data-theme=dark]:bg-indigo-400/20",
};

const TOAST_DURATION = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = `toast-${++counterRef.current}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, variant, progress: 100 }]);
      setTimeout(() => removeToast(id), TOAST_DURATION);
    },
    [removeToast]
  );

  const success = useCallback((m: string) => toast(m, "success"), [toast]);
  const error = useCallback((m: string) => toast(m, "error"), [toast]);
  const warning = useCallback((m: string) => toast(m, "warning"), [toast]);
  const info = useCallback((m: string) => toast(m, "info"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = ICONS[t.variant];
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg relative overflow-hidden",
                VARIANT_STYLES[t.variant],
                t.exiting ? "animate-toast-exit" : "animate-toast-enter"
              )}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10 shrink-0">
                <Icon className="h-3 w-3 shrink-0" />
              </div>
              <span className="flex-1 text-[13px] font-medium">{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5">
                <div
                  className={cn("h-full transition-all ease-linear", PROGRESS_COLORS[t.variant])}
                  style={{
                    width: "100%",
                    animation: `shrink-progress ${TOAST_DURATION}ms linear forwards`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
