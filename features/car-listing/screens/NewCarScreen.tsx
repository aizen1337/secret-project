import { useState } from "react";
import { Alert, Platform } from "react-native";
import { useColorScheme } from "nativewind";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAction, useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/components/feedback/useToast";
import { WIZARD_STEPS } from "@/features/cars/form/constants";
import { randomToken, toEndOfDayIso, toStartOfDayIso } from "@/features/cars/form/dateUtils";
import { useCarFormWizard } from "@/features/cars/form/useCarFormWizard";
import { CarFormWizardShell } from "@/features/cars/form/components/CarFormWizardShell";
import { IdentificationStep } from "@/features/cars/form/components/steps/IdentificationStep";
import { DetailsStep } from "@/features/cars/form/components/steps/DetailsStep";
import { FeaturesStep } from "@/features/cars/form/components/steps/FeaturesStep";
import { ImagesStep } from "@/features/cars/form/components/steps/ImagesStep";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

export default function NewCarScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const mode = resolveThemeMode(useColorScheme());

  const generateCarImageUploadUrl = useMutation(api.cars.generateCarImageUploadUrl);
  const createCar = useMutation(api.cars.createCar);
  const searchAddresses = useAction(api.cars.searchAddresses);
  const resolveAddressDetails = useAction(api.cars.resolveAddressDetails);
  const verifyAndAutofillCarFromVin = useAction(api.cars.verifyAndAutofillCarFromVin);

  const [idempotencyKey] = useState(() => randomToken("car-create"));

  const confirmUnverifiedVin = async () => {
    if (Platform.OS === "web") {
      return globalThis.confirm(t("carForm.identification.unverifiedConfirmWeb"));
    }

    return await new Promise<boolean>((resolve) => {
      Alert.alert(
        t("carForm.identification.unverifiedTitle"),
        t("carForm.identification.unverifiedMessage"),
        [
          { text: t("common.actions.cancel"), style: "cancel", onPress: () => resolve(false) },
          { text: t("common.actions.continue"), onPress: () => resolve(true) },
        ],
      );
    });
  };

  const uploadImages = async (assets: { uri: string; mimeType?: string | null }[]) => {
    const storageIds: string[] = [];
    for (const asset of assets) {
      const uploadUrl = await generateCarImageUploadUrl({});
      const fileResponse = await fetch(asset.uri);
      const blob = await fileResponse.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType ?? "application/octet-stream" },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error(t("carForm.submit.uploadFailed"));
      }

      const payload = (await uploadResponse.json()) as { storageId?: string };
      if (!payload.storageId) {
        throw new Error(t("carForm.submit.invalidStorage"));
      }
      storageIds.push(payload.storageId);
    }

    return storageIds;
  };

  const wizard = useCarFormWizard({
    mode: "create",
    t,
    toast,
    searchAddresses,
    resolveAddressDetails,
    verifyAndAutofillCarFromVin,
    confirmUnverifiedVin,
    successMessageKey: "carForm.submit.successCreate",
    errorFallbackKey: "carForm.submit.failedCreate",
    onSuccess: () => setTimeout(() => router.replace("/dashboard"), 700),
    performSubmit: async ({ state, setUploading }) => {
      setUploading(true);
      let imageStorageIds: string[] = [];

      try {
        imageStorageIds = await uploadImages(state.newImages);
      } finally {
        setUploading(false);
      }

      await createCar({
        title: state.title.trim(),
        make: state.make.trim(),
        model: state.model.trim(),
        year: Number(state.year),
        pricePerDay: Number(state.pricePerDay),
        availableFrom: toStartOfDayIso(state.startDate),
        availableUntil: toEndOfDayIso(state.endDate),
        formattedAddress: state.formattedAddress.trim(),
        features: state.selectedFeatures,
        customFeatures: state.customFeatures,
        vin: state.vin.trim() ? state.vin.trim().toUpperCase() : undefined,
        registrationNumber: state.registrationNumber.trim()
          ? state.registrationNumber.trim().toUpperCase()
          : undefined,
        registrationDate: state.vin.trim() ? toStartOfDayIso(state.registrationDate) : undefined,
        kilometersLimitPerDay: state.kilometersLimitPerDay.trim()
          ? Number(state.kilometersLimitPerDay)
          : undefined,
        depositAmount: state.depositAmount.trim() ? Number(state.depositAmount) : undefined,
        fuelPolicy: state.fuelPolicy || undefined,
        fuelPolicyNote: state.fuelPolicyNote.trim() || undefined,
        collectionMethods: state.collectionMethods,
        collectionInPersonInstructions: state.collectionInPersonInstructions.trim() || undefined,
        collectionLockboxCode: state.collectionLockboxCode.trim() || undefined,
        collectionLockboxInstructions: state.collectionLockboxInstructions.trim() || undefined,
        collectionDeliveryInstructions: state.collectionDeliveryInstructions.trim() || undefined,
        idempotencyKey,
        location: {
          city: state.city.trim(),
          country: state.country.trim(),
          lat: Number(state.latitude),
          lng: Number(state.longitude),
        },
        imageStorageIds: imageStorageIds as Id<"_storage">[],
      });
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <CarFormWizardShell
        title={t("carForm.createTitle")}
        onBack={() => router.back()}
        currentStepIndex={wizard.currentStepIndex}
        currentStepLabel={wizard.stepLabels[wizard.state.currentStep]}
        stepCounterLabel={t("carForm.steps.stepCounter", {
          current: wizard.currentStepIndex + 1,
          total: WIZARD_STEPS.length,
        })}
        iconColor={getTokenColor(mode, "icon")}
        isBusy={wizard.isBusy}
        isFirstStep={wizard.isFirstStep}
        isLastStep={wizard.isLastStep}
        onPrevious={wizard.goToPreviousStep}
        onNext={wizard.goToNextStep}
        onSubmit={wizard.handleSubmit}
        submitLabel={t("carForm.submit.create")}
        submitBusyLabel={wizard.submitBusyLabel}
        submitIndicatorColor={getTokenColor(mode, "primaryForeground")}
        nextLabel={t("common.actions.next")}
        backLabel={t("common.actions.back")}
      >
        {wizard.state.currentStep === "identification" ? (
          <IdentificationStep
            vin={wizard.state.vin}
            registrationNumber={wizard.state.registrationNumber}
            registrationDate={wizard.state.registrationDate}
            isCarVerified={wizard.state.isCarVerified}
            vinLookupError={wizard.state.vinLookupError}
            isVerifyingCar={wizard.state.isVerifyingCar}
            fieldErrors={wizard.state.fieldErrors}
            title={t("carForm.identification.title")}
            verifiedLabel={t("carForm.identification.verified")}
            dateHint={t("carForm.identification.dateHint")}
            vinPlaceholder="VIN"
            registrationPlaceholder={t("carForm.identification.regNumberPlaceholder")}
            autofillLabel={t("carForm.identification.autofill")}
            fetchingLabel={t("carForm.identification.fetching")}
            onVinChange={wizard.setVin}
            onRegistrationNumberChange={wizard.setRegistrationNumber}
            onRegistrationDateChange={wizard.setRegistrationDate}
            onAutofill={wizard.handleVinAutofill}
          />
        ) : null}

        {wizard.state.currentStep === "details" ? (
          <DetailsStep
            title={wizard.state.title}
            make={wizard.state.make}
            model={wizard.state.model}
            year={wizard.state.year}
            pricePerDay={wizard.state.pricePerDay}
            addressQuery={wizard.state.addressQuery}
            formattedAddress={wizard.state.formattedAddress}
            addressSuggestions={wizard.state.addressSuggestions}
            showAddressSuggestions={wizard.state.showAddressSuggestions}
            city={wizard.state.city}
            country={wizard.state.country}
            latitude={wizard.state.latitude}
            longitude={wizard.state.longitude}
            startDate={wizard.state.startDate}
            endDate={wizard.state.endDate}
            kilometersLimitPerDay={wizard.state.kilometersLimitPerDay}
            depositAmount={wizard.state.depositAmount}
            fuelPolicy={wizard.state.fuelPolicy}
            fuelPolicyNote={wizard.state.fuelPolicyNote}
            collectionMethods={wizard.state.collectionMethods}
            collectionInPersonInstructions={wizard.state.collectionInPersonInstructions}
            collectionLockboxCode={wizard.state.collectionLockboxCode}
            collectionLockboxInstructions={wizard.state.collectionLockboxInstructions}
            collectionDeliveryInstructions={wizard.state.collectionDeliveryInstructions}
            isSearchingAddress={wizard.state.isSearchingAddress}
            fieldErrors={wizard.state.fieldErrors}
            t={t}
            onTitleChange={(value) => {
              wizard.setField("title", value);
              wizard.clearError("title");
            }}
            onMakeChange={(value) => {
              wizard.setField("make", value);
              wizard.clearError("make");
            }}
            onModelChange={(value) => {
              wizard.setField("model", value);
              wizard.clearError("model");
            }}
            onYearChange={(value) => {
              wizard.setField("year", value);
              wizard.clearError("year");
            }}
            onPriceChange={(value) => {
              wizard.setField("pricePerDay", value);
              wizard.clearError("pricePerDay");
            }}
            onAddressQueryChange={wizard.setAddressQuery}
            onSelectAddressSuggestion={wizard.onSelectSuggestion}
            onFormattedAddressChange={(value) => {
              wizard.setField("formattedAddress", value);
              wizard.clearError("address");
            }}
            onCityChange={(value) => {
              wizard.setField("city", value);
              wizard.clearError("city");
            }}
            onCountryChange={(value) => {
              wizard.setField("country", value);
              wizard.clearError("country");
            }}
            onLatitudeChange={(value) => {
              wizard.setField("latitude", value);
              wizard.clearError("latitude");
            }}
            onLongitudeChange={(value) => {
              wizard.setField("longitude", value);
              wizard.clearError("longitude");
            }}
            onDatesApply={(nextStartDate, nextEndDate) => {
              wizard.setField("startDate", nextStartDate);
              wizard.setField("endDate", nextEndDate);
              wizard.clearError("availability");
            }}
            onKilometersLimitChange={(value) => {
              wizard.setField("kilometersLimitPerDay", value);
              wizard.clearError("kilometersLimitPerDay");
            }}
            onDepositAmountChange={(value) => {
              wizard.setField("depositAmount", value);
              wizard.clearError("depositAmount");
            }}
            onFuelPolicyChange={(value) => {
              wizard.setField("fuelPolicy", value);
              wizard.clearError("fuelPolicy");
            }}
            onFuelPolicyNoteChange={(value) => wizard.setField("fuelPolicyNote", value)}
            onToggleCollectionMethod={(value) => {
              const selected = wizard.state.collectionMethods;
              const hasValue = selected.includes(value);
              if (hasValue && selected.length === 1) return;
              const next = hasValue
                ? selected.filter((entry) => entry !== value)
                : [...selected, value];
              wizard.setField("collectionMethods", next);
              wizard.clearError("collectionMethods");
            }}
            onCollectionInPersonInstructionsChange={(value) =>
              wizard.setField("collectionInPersonInstructions", value)
            }
            onCollectionLockboxCodeChange={(value) => {
              wizard.setField("collectionLockboxCode", value);
              wizard.clearError("collectionLockboxCode");
            }}
            onCollectionLockboxInstructionsChange={(value) =>
              wizard.setField("collectionLockboxInstructions", value)
            }
            onCollectionDeliveryInstructionsChange={(value) => {
              wizard.setField("collectionDeliveryInstructions", value);
              wizard.clearError("collectionDeliveryInstructions");
            }}
          />
        ) : null}

        {wizard.state.currentStep === "features" ? (
          <FeaturesStep
            selectedFeatures={wizard.state.selectedFeatures}
            customFeatureInput={wizard.state.customFeatureInput}
            customFeatures={wizard.state.customFeatures}
            fieldErrors={wizard.state.fieldErrors}
            customRemoveIconColor={getTokenColor(mode, "iconMuted")}
            t={t}
            onToggleFeature={wizard.toggleFeature}
            onCustomFeatureInputChange={(value) => wizard.setField("customFeatureInput", value)}
            onAddCustomFeature={wizard.addCustomFeature}
            onRemoveCustomFeature={wizard.removeCustomFeature}
          />
        ) : null}

        {wizard.state.currentStep === "images" ? (
          <ImagesStep
            images={wizard.displayImages}
            fieldErrors={wizard.state.fieldErrors}
            removeOverlayColor={getTokenColor(mode, "overlay")}
            removeIconColor={getTokenColor(mode, "primaryForeground")}
            t={t}
            onPickImages={wizard.pickImages}
            onRemoveImage={wizard.removeImage}
          />
        ) : null}
      </CarFormWizardShell>
    </SafeAreaView>
  );
}
