import * as React from "react";
import { View } from "react-native";

import { AppToast, type AppToastKind, type AppToastPayload } from "@/components/feedback/AppToast";

type ToastOptions = {
  title?: string;
  durationMs?: number;
};

type ToastApi = {
  success: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
};

const DEFAULT_DURATION_MS = 2600;

const ToastContext = React.createContext<ToastApi | null>(null);

function randomToastId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<AppToastPayload | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = React.useCallback((kind: AppToastKind, message: string, options?: ToastOptions) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setToast({
      id: randomToastId(),
      kind,
      title: options?.title,
      message,
    });
    timeoutRef.current = setTimeout(() => setToast(null), options?.durationMs ?? DEFAULT_DURATION_MS);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const value = React.useMemo<ToastApi>(
    () => ({
      success: (message, options) => push("success", message, options),
      warning: (message, options) => push("warning", message, options),
      error: (message, options) => push("error", message, options),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      <View className="flex-1" pointerEvents="box-none">
        {children}
        <AppToast toast={toast} />
      </View>
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }
  return context;
}

