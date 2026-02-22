import { useToastContext } from "@/components/feedback/ToastProvider";

export function useToast() {
  return useToastContext();
}

