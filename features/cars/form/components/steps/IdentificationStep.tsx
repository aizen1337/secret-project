import { Pressable, Text, TextInput, View } from "react-native";

import { SingleDatePicker } from "@/components/filters/SingleDatePicker";
import type { FieldErrors } from "@/features/cars/form/types";

type IdentificationStepProps = {
  vin: string;
  registrationNumber: string;
  registrationDate: string;
  isCarVerified: boolean;
  vinLookupError: string | null;
  isVerifyingCar: boolean;
  fieldErrors: FieldErrors;
  title: string;
  verifiedLabel: string;
  dateHint: string;
  vinPlaceholder: string;
  registrationPlaceholder: string;
  autofillLabel: string;
  fetchingLabel: string;
  onVinChange: (value: string) => void;
  onRegistrationNumberChange: (value: string) => void;
  onRegistrationDateChange: (value: string) => void;
  onAutofill: () => void;
};

export function IdentificationStep({
  vin,
  registrationNumber,
  registrationDate,
  isCarVerified,
  vinLookupError,
  isVerifyingCar,
  fieldErrors,
  title,
  verifiedLabel,
  dateHint,
  vinPlaceholder,
  registrationPlaceholder,
  autofillLabel,
  fetchingLabel,
  onVinChange,
  onRegistrationNumberChange,
  onRegistrationDateChange,
  onAutofill,
}: IdentificationStepProps) {
  return (
    <View className="bg-card rounded-xl border border-border p-4 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        {isCarVerified ? (
          <View className="px-2 py-1 bg-verified-bg rounded-full">
            <Text className="text-[10px] font-semibold text-verified-fg">{verifiedLabel}</Text>
          </View>
        ) : null}
      </View>

      <TextInput
        value={vin}
        onChangeText={onVinChange}
        placeholder={vinPlaceholder}
        autoCapitalize="characters"
        className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
      />
      {fieldErrors.vin ? <Text className="text-xs text-destructive mb-2">{fieldErrors.vin}</Text> : null}

      <TextInput
        value={registrationNumber}
        onChangeText={onRegistrationNumberChange}
        placeholder={registrationPlaceholder}
        autoCapitalize="characters"
        className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
      />
      {fieldErrors.registrationNumber ? (
        <Text className="text-xs text-destructive mb-2">{fieldErrors.registrationNumber}</Text>
      ) : null}

      <SingleDatePicker value={registrationDate} onChange={onRegistrationDateChange} />
      {fieldErrors.registrationDate ? (
        <Text className="text-xs text-destructive mt-2">{fieldErrors.registrationDate}</Text>
      ) : null}

      <Text className="text-xs text-muted-foreground mt-2">{dateHint}</Text>

      <Pressable
        onPress={onAutofill}
        disabled={isVerifyingCar}
        className={`rounded-lg px-3 py-3 mt-3 items-center ${isVerifyingCar ? "bg-primary/60" : "bg-primary"}`}
      >
        <Text className="text-sm font-semibold text-primary-foreground">
          {isVerifyingCar ? fetchingLabel : autofillLabel}
        </Text>
      </Pressable>

      {vinLookupError ? <Text className="text-xs text-destructive mt-2">{vinLookupError}</Text> : null}
    </View>
  );
}
