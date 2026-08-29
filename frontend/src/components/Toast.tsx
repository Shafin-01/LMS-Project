"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastType = "success" | "error";

interface ToastRecord {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// How long a toast stays on screen before it removes itself.
const AUTO_DISMISS_MS = 3500;

/**
 * A single toast card. It renders itself invisible for one frame and then
 * transitions to visible — that's what makes it slide/fade in instead of
 * just appearing. It also exposes onDismiss so a click closes it early.
 */
function ToastCard({ toast, onDismiss }: { toast: ToastRecord; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const isSuccess = toast.type === "success";

  return (
    <div
      role="status"
      onClick={onDismiss}
      className={`pointer-events-auto flex w-80 max-w-[calc(100vw-2.5rem)] cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lg shadow-black/20 backdrop-blur transition-all duration-300 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      } ${
        isSuccess
          ? "border-emerald-800/50 bg-emerald-950/95 text-emerald-100"
          : "border-red-800/50 bg-red-950/95 text-red-100"
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          isSuccess ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
        }`}
      >
        {isSuccess ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </span>
      <p className="text-sm font-medium leading-snug">{toast.message}</p>
    </div>
  );
}

/**
 * Mounted once near the root of the app (see layout.tsx). Any page can call
 * useToast().showToast(...) instead of holding its own "Saved!" state next
 * to a button — this renders a floating, self-dismissing notification
 * instead, which is the more standard pattern for confirming an action.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, type }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-2.5">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() must be called from inside <ToastProvider>.");
  }
  return ctx;
}