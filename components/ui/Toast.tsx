'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts }: { toasts: ToastMessage[] }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[3000] flex flex-col gap-2 max-w-[90vw]"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg bg-primary-900/95 dark:bg-primary-900/95 border border-primary-400/50 min-h-[48px] text-slate-100"
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-accent-400 flex-shrink-0" />}
            {t.type === 'error' && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-accent-400 flex-shrink-0" />}
            <span className="text-sm font-medium">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {
        // no-op when used outside provider
      },
    };
  }
  return ctx;
}
