import { Pressable, Text, TextInput, View } from "react-native";

import { DateRangePicker } from "@/components/filters/DateRangePicker";
import { FUEL_POLICIES } from "@/features/cars/form/constants";
import type { AddressSuggestion, FieldErrors, FuelPolicy } from "@/features/cars/form/types";

type DetailsStepProps = {
  title: string;
  make: string;
  model: string;
  year: string;
  pricePerDay: string;
  addressQuery: string;
  formattedAddress: string;
  addressSuggestions: AddressSuggestion[];
  showAddressSuggestions: boolean;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  startDate: string;
  endDate: string;
  kilometersLimitPerDay: string;
  depositAmount: string;
  fuelPolicy: FuelPolicy | "";
  fuelPolicyNote: string;
  isSearchingAddress: boolean;
  fieldErrors: FieldErrors;
  t: (key: string) => string;
  onTitleChange: (value: string) => void;
  onMakeChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onAddressQueryChange: (value: string) => void;
  onSelectAddressSuggestion: (suggestion: AddressSuggestion) => void;
  onFormattedAddressChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
  onDatesApply: (nextStartDate: string, nextEndDate: string) => void;
  onKilometersLimitChange: (value: string) => void;
  onDepositAmountChange: (value: string) => void;
  onFuelPolicyChange: (value: FuelPolicy) => void;
  onFuelPolicyNoteChange: (value: string) => void;
};

export function DetailsStep({
  title,
  make,
  model,
  year,
  pricePerDay,
  addressQuery,
  formattedAddress,
  addressSuggestions,
  showAddressSuggestions,
  city,
  country,
  latitude,
  longitude,
  startDate,
  endDate,
  kilometersLimitPerDay,
  depositAmount,
  fuelPolicy,
  fuelPolicyNote,
  isSearchingAddress,
  fieldErrors,
  t,
  onTitleChange,
  onMakeChange,
  onModelChange,
  onYearChange,
  onPriceChange,
  onAddressQueryChange,
  onSelectAddressSuggestion,
  onFormattedAddressChange,
  onCityChange,
  onCountryChange,
  onLatitudeChange,
  onLongitudeChange,
  onDatesApply,
  onKilometersLimitChange,
  onDepositAmountChange,
  onFuelPolicyChange,
  onFuelPolicyNoteChange,
}: DetailsStepProps) {
  return (
    <>
      <View className="bg-card rounded-xl border border-border p-4 mb-3">
        <Text className="text-base font-semibold text-foreground mb-3">{t("carForm.details.basics")}</Text>
        <TextInput
          value={title}
          onChangeText={onTitleChange}
          placeholder={t("carForm.details.titlePlaceholder")}
          className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
        />
        {fieldErrors.title ? <Text className="text-xs text-destructive mb-2">{fieldErrors.title}</Text> : null}

        <TextInput
          value={make}
          onChangeText={onMakeChange}
          placeholder={t("carForm.details.makePlaceholder")}
          className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
        />
        {fieldErrors.make ? <Text className="text-xs text-destructive mb-2">{fieldErrors.make}</Text> : null}

        <TextInput
          value={model}
          onChangeText={onModelChange}
          placeholder={t("carForm.details.modelPlaceholder")}
          className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
        />
        {fieldErrors.model ? <Text className="text-xs text-destructive mb-2">{fieldErrors.model}</Text> : null}

        <View className="flex-row gap-2">
          <View className="flex-1">
            <TextInput
              value={year}
              onChangeText={onYearChange}
              placeholder={t("carForm.details.yearPlaceholder")}
              keyboardType="numeric"
              className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
            />
            {fieldErrors.year ? <Text className="text-xs text-destructive mb-1">{fieldErrors.year}</Text> : null}
          </View>
          <View className="flex-1">
            <TextInput
              value={pricePerDay}
              onChangeText={onPriceChange}
              placeholder={t("carForm.details.pricePlaceholder")}
              keyboardType="numeric"
              className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
            />
            {fieldErrors.pricePerDay ? <Text className="text-xs text-destructive mb-1">{fieldErrors.pricePerDay}</Text> : null}
          </View>
        </View>
      </View>

      <View className="bg-card rounded-xl border border-border p-4 mb-3">
        <Text className="text-base font-semibold text-foreground mb-3">{t("carForm.details.rulesTitle")}</Text>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <TextInput
              value={kilometersLimitPerDay}
              onChangeText={onKilometersLimitChange}
              placeholder={t("carForm.details.kmLimitPlaceholder")}
              keyboardType="numeric"
              className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
            />
            {fieldErrors.kilometersLimitPerDay ? (
              <Text className="text-xs text-destructive mb-1">{fieldErrors.kilometersLimitPerDay}</Text>
            ) : null}
          </View>
          <View className="flex-1">
            <TextInput
              value={depositAmount}
              onChangeText={onDepositAmountChange}
              placeholder={t("carForm.details.depositPlaceholder")}
              keyboardType="numeric"
              className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
            />
            {fieldErrors.depositAmount ? (
              <Text className="text-xs text-destructive mb-1">{fieldErrors.depositAmount}</Text>
            ) : null}
          </View>
        </View>

        <Text className="text-xs uppercase text-muted-foreground mb-2 mt-2">{t("carForm.details.fuelRules")}</Text>
        <View className="flex-row flex-wrap gap-2">
          {FUEL_POLICIES.map((policy) => {
            const selected = fuelPolicy === policy.value;
            return (
              <Pressable
                key={policy.value}
                onPress={() => onFuelPolicyChange(policy.value)}
                className={`px-3 py-2 rounded-full border ${selected ? "bg-primary border-primary" : "bg-secondary border-border"}`}
              >
                <Text className={`text-xs font-medium ${selected ? "text-primary-foreground" : "text-foreground"}`}>
                  {t(policy.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {fieldErrors.fuelPolicy ? <Text className="text-xs text-destructive mt-2">{fieldErrors.fuelPolicy}</Text> : null}

        <TextInput
          value={fuelPolicyNote}
          onChangeText={onFuelPolicyNoteChange}
          placeholder={t("carForm.details.fuelNotePlaceholder")}
          className="rounded-lg border border-border px-3 py-3 text-foreground mt-3"
        />
      </View>

      <View className="bg-card rounded-xl border border-border p-4 mb-3">
        <Text className="text-base font-semibold text-foreground mb-3">{t("carForm.details.addressTitle")}</Text>
        <TextInput
          value={addressQuery}
          onChangeText={onAddressQueryChange}
          placeholder={t("carForm.details.addressSearchPlaceholder")}
          className="rounded-lg border border-border px-3 py-3 text-foreground"
        />

        {isSearchingAddress ? (
          <Text className="text-xs text-muted-foreground mt-2">{t("carForm.details.searchingAddresses")}</Text>
        ) : null}

        {showAddressSuggestions && addressSuggestions.length > 0 ? (
          <View className="mt-2 rounded-lg border border-border overflow-hidden">
            {addressSuggestions.map((suggestion) => (
              <Pressable
                key={suggestion.placeId}
                onPress={() => onSelectAddressSuggestion(suggestion)}
                className="px-3 py-3 border-b border-border bg-card"
              >
                <Text className="text-sm text-foreground">{suggestion.description}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {fieldErrors.address ? <Text className="text-xs text-destructive mt-2">{fieldErrors.address}</Text> : null}

        <TextInput
          value={formattedAddress}
          onChangeText={onFormattedAddressChange}
          placeholder={t("carForm.details.formattedAddressPlaceholder")}
          className="rounded-lg border border-border px-3 py-3 text-foreground mt-3 mb-2"
        />

        <View className="flex-row gap-2">
          <View className="flex-1">
            <TextInput
              value={city}
              onChangeText={onCityChange}
              placeholder={t("carForm.details.cityPlaceholder")}
              className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
            />
            {fieldErrors.city ? <Text className="text-xs text-destructive mb-1">{fieldErrors.city}</Text> : null}
          </View>
          <View className="flex-1">
            <TextInput
              value={country}
              onChangeText={onCountryChange}
              placeholder={t("carForm.details.countryPlaceholder")}
              className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
            />
            {fieldErrors.country ? <Text className="text-xs text-destructive mb-1">{fieldErrors.country}</Text> : null}
          </View>
        </View>

        <View className="flex-row gap-2">
          <View className="flex-1">
            <TextInput
              value={latitude}
              onChangeText={onLatitudeChange}
              placeholder={t("carForm.details.latitudePlaceholder")}
              keyboardType="numeric"
              className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
            />
            {fieldErrors.latitude ? <Text className="text-xs text-destructive mb-1">{fieldErrors.latitude}</Text> : null}
          </View>
          <View className="flex-1">
            <TextInput
              value={longitude}
              onChangeText={onLongitudeChange}
              placeholder={t("carForm.details.longitudePlaceholder")}
              keyboardType="numeric"
              className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
            />
            {fieldErrors.longitude ? <Text className="text-xs text-destructive mb-1">{fieldErrors.longitude}</Text> : null}
          </View>
        </View>
      </View>

      <View className="bg-card rounded-xl border border-border p-4 mb-3">
        <Text className="text-base font-semibold text-foreground mb-3">{t("carForm.details.availabilityTitle")}</Text>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onApply={onDatesApply}
        />
        {fieldErrors.availability ? (
          <Text className="text-xs text-destructive mt-2">{fieldErrors.availability}</Text>
        ) : null}
      </View>
    </>
  );
}
