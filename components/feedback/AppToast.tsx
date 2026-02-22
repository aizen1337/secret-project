import { Platform, View } from "react-native";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type AppToastKind = "success" | "warning" | "error";

export type AppToastPayload = {
  id: string;
  kind: AppToastKind;
  title?: string;
  message: string;
};

type AppToastProps = {
  toast: AppToastPayload | null;
};

function mapVariant(kind: AppToastKind) {
  if (kind === "success") return "success";
  if (kind === "warning") return "warning";
  return "destructive";
}

export function AppToast({ toast }: AppToastProps) {
  if (!toast) return null;

  const webContainerClassName = "absolute top-4 right-4 max-w-sm w-[22rem] z-50";
  const nativeContainerClassName = "absolute top-4 left-4 right-4 z-50";

  return (
    <View pointerEvents="box-none" className={Platform.OS === "web" ? webContainerClassName : nativeContainerClassName}>
      <Alert variant={mapVariant(toast.kind)}>
        {toast.title ? <AlertTitle>{toast.title}</AlertTitle> : null}
        <AlertDescription className={toast.title ? "mt-1" : ""}>{toast.message}</AlertDescription>
      </Alert>
    </View>
  );
}

