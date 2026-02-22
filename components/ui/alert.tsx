import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Text, View, type TextProps, type ViewProps } from "react-native";

const alertVariants = cva("w-full rounded-xl border px-4 py-3", {
  variants: {
    variant: {
      default: "border-border bg-card",
      success: "border-green-700 bg-green-600",
      warning: "border-amber-600 bg-amber-500",
      destructive: "border-red-700 bg-red-600",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type AlertProps = ViewProps & VariantProps<typeof alertVariants>;

function Alert({ className, variant, ...props }: AlertProps) {
  return <View className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: TextProps) {
  return <Text className={cn("font-semibold text-sm text-white", className)} {...props} />;
}

function AlertDescription({ className, ...props }: TextProps) {
  return <Text className={cn("text-sm text-white", className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription };

