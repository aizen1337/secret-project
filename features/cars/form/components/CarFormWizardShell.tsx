import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { WIZARD_STEPS } from "@/features/cars/form/constants";

type CarFormWizardShellProps = {
  title: string;
  onBack: () => void;
  currentStepIndex: number;
  currentStepLabel: string;
  stepCounterLabel: string;
  iconColor: string;
  isBusy: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitBusyLabel: string;
  submitIndicatorColor: string;
  children: React.ReactNode;
  nextLabel: string;
  backLabel: string;
};

export function CarFormWizardShell({
  title,
  onBack,
  currentStepIndex,
  currentStepLabel,
  stepCounterLabel,
  iconColor,
  isBusy,
  isFirstStep,
  isLastStep,
  onPrevious,
  onNext,
  onSubmit,
  submitLabel,
  submitBusyLabel,
  submitIndicatorColor,
  children,
  nextLabel,
  backLabel,
}: CarFormWizardShellProps) {
  return (
    <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="py-3 flex-row items-center justify-between">
        <Pressable
          onPress={onBack}
          className="w-10 h-10 rounded-full bg-card border border-border items-center justify-center"
        >
          <Ionicons name="chevron-back" size={20} color={iconColor} />
        </Pressable>
        <Text className="text-lg font-semibold text-foreground">{title}</Text>
        <View className="w-10 h-10" />
      </View>

      <View className="bg-card rounded-xl border border-border p-4 mb-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-foreground">{stepCounterLabel}</Text>
          <Text className="text-xs text-muted-foreground">{currentStepLabel}</Text>
        </View>
        <View className="flex-row gap-2 mt-3">
          {WIZARD_STEPS.map((step, index) => (
            <View
              key={step}
              className={`h-1.5 flex-1 rounded-full ${index <= currentStepIndex ? "bg-primary" : "bg-secondary"}`}
            />
          ))}
        </View>
      </View>

      {children}

      <View className="flex-row gap-2 mt-2">
        {!isFirstStep ? (
          <Pressable
            onPress={onPrevious}
            disabled={isBusy}
            className="flex-1 py-3 rounded-xl items-center bg-secondary border border-border"
          >
            <Text className="text-sm font-semibold text-foreground">{backLabel}</Text>
          </Pressable>
        ) : null}

        {!isLastStep ? (
          <Pressable
            onPress={onNext}
            disabled={isBusy}
            className={`flex-1 py-3 rounded-xl items-center ${isBusy ? "bg-primary/60" : "bg-primary"}`}
          >
            <Text className="text-sm font-semibold text-primary-foreground">{nextLabel}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onSubmit}
            disabled={isBusy}
            className={`flex-1 py-3 rounded-xl items-center ${isBusy ? "bg-primary/60" : "bg-primary"}`}
          >
            {isBusy ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color={submitIndicatorColor} />
                <Text className="text-primary-foreground font-semibold text-base ml-2">{submitBusyLabel}</Text>
              </View>
            ) : (
              <Text className="text-primary-foreground font-semibold text-base">{submitLabel}</Text>
            )}
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
