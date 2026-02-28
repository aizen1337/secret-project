import { useEffect, useMemo, useReducer, useRef } from "react";
import * as ImagePicker from "expo-image-picker";
import type { TFunction } from "i18next";

import { MAX_IMAGES, WIZARD_STEPS } from "@/features/cars/form/constants";
import { fromIsoToDateInputValue, randomToken, toDateInputValue } from "@/features/cars/form/dateUtils";
import type {
  AddressSuggestion,
  CarFormHydrationData,
  CarFormMode,
  CarFormState,
  DisplayImage,
  FieldErrorKey,
  FieldErrors,
  FuelPolicy,
  WizardStep,
} from "@/features/cars/form/types";
import { validateAll, validateCurrentStep } from "@/features/cars/form/validators";
import { toLocalizedErrorMessage, toUserErrorMessage } from "@/lib/errors";

type ToastApi = {
  success: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
};

type SearchAddressesFn = (args: { query: string; sessionToken: string }) => Promise<AddressSuggestion[]>;
type ResolveAddressDetailsFn = (args: {
  placeId: string;
  sessionToken: string;
}) => Promise<{ city: string; country: string; lat: number; lng: number; formattedAddress: string }>;
type VerifyVinFn = (args: {
  vin: string;
  registrationNumber: string;
  registrationDate: string;
}) => Promise<{ make: string; model: string; year: number; title?: string; features: string[]; customFeatures: string[]; verified: boolean; source: string }>;

type SubmitContext = {
  state: CarFormState;
  setUploading: (value: boolean) => void;
};

type UseCarFormWizardParams = {
  mode: CarFormMode;
  t: TFunction;
  toast: ToastApi;
  searchAddresses: SearchAddressesFn;
  resolveAddressDetails: ResolveAddressDetailsFn;
  verifyAndAutofillCarFromVin: VerifyVinFn;
  confirmUnverifiedVin: () => Promise<boolean>;
  performSubmit: (ctx: SubmitContext) => Promise<void>;
  onSuccess: () => void;
  successMessageKey: string;
  errorFallbackKey: string;
  initialData?: CarFormHydrationData | null;
};

type Action =
  | { type: "set_field"; key: keyof CarFormState; value: CarFormState[keyof CarFormState] }
  | { type: "set_fields"; value: Partial<CarFormState> }
  | { type: "set_errors"; value: FieldErrors }
  | { type: "clear_error"; key: FieldErrorKey }
  | { type: "set_step"; step: WizardStep }
  | { type: "set_hydrated" };

function reducer(state: CarFormState, action: Action): CarFormState {
  switch (action.type) {
    case "set_field":
      return { ...state, [action.key]: action.value };
    case "set_fields":
      return { ...state, ...action.value };
    case "set_errors":
      return { ...state, fieldErrors: { ...state.fieldErrors, ...action.value } };
    case "clear_error": {
      const nextErrors = { ...state.fieldErrors };
      delete nextErrors[action.key];
      return { ...state, fieldErrors: nextErrors };
    }
    case "set_step":
      return { ...state, currentStep: action.step };
    case "set_hydrated":
      return { ...state, isHydrated: true };
    default:
      return state;
  }
}

function createInitialState(mode: CarFormMode): CarFormState {
  const today = new Date();
  const defaultEnd = new Date();
  defaultEnd.setDate(defaultEnd.getDate() + 30);

  return {
    title: "",
    make: "",
    model: "",
    year: "",
    pricePerDay: "",
    vin: "",
    registrationNumber: "",
    registrationDate: toDateInputValue(today),
    isCarVerified: false,
    verificationSource: undefined,
    verifiedAt: undefined,
    vinLookupError: null,
    addressQuery: "",
    formattedAddress: "",
    addressSuggestions: [],
    showAddressSuggestions: false,
    city: "",
    country: "",
    latitude: "",
    longitude: "",
    startDate: toDateInputValue(today),
    endDate: toDateInputValue(mode === "create" ? defaultEnd : today),
    selectedFeatures: [],
    customFeatureInput: "",
    customFeatures: [],
    kilometersLimitPerDay: "",
    depositAmount: "",
    fuelPolicy: "",
    fuelPolicyNote: "",
    collectionMethods: ["in_person"],
    collectionInPersonInstructions: "",
    collectionLockboxCode: "",
    collectionLockboxInstructions: "",
    collectionDeliveryInstructions: "",
    existingImageUrls: [],
    initialImageUrls: [],
    newImages: [],
    fieldErrors: {},
    currentStep: "identification",
    isSubmitting: false,
    isUploadingImages: false,
    isResolvingAddress: false,
    isSearchingAddress: false,
    isVerifyingCar: false,
    isHydrated: mode === "create",
  };
}

export function useCarFormWizard({
  mode,
  t,
  toast,
  searchAddresses,
  resolveAddressDetails,
  verifyAndAutofillCarFromVin,
  confirmUnverifiedVin,
  performSubmit,
  onSuccess,
  successMessageKey,
  errorFallbackKey,
  initialData,
}: UseCarFormWizardParams) {
  const [state, dispatch] = useReducer(reducer, createInitialState(mode));
  const submitLockRef = useRef(false);
  const placesSessionTokenRef = useRef(randomToken("places"));

  const stepLabels: Record<WizardStep, string> = useMemo(
    () => ({
      identification: t("carForm.steps.identification"),
      details: t("carForm.steps.details"),
      features: t("carForm.steps.features"),
      images: t("carForm.steps.images"),
    }),
    [t],
  );

  const currentStepIndex = WIZARD_STEPS.indexOf(state.currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;
  const isBusy =
    state.isSubmitting || state.isUploadingImages || state.isResolvingAddress || state.isVerifyingCar;

  const submitBusyLabel = state.isVerifyingCar
    ? t("carForm.submit.verifying")
    : state.isUploadingImages
      ? t("carForm.submit.uploading")
      : mode === "create"
        ? t("carForm.submit.createLoading")
        : t("carForm.submit.saveLoading");

  const displayImages: DisplayImage[] = useMemo(
    () => [
      ...state.existingImageUrls.map((uri) => ({ uri, source: "existing" as const })),
      ...state.newImages.map((asset) => ({ uri: asset.uri, source: "new" as const })),
    ],
    [state.existingImageUrls, state.newImages],
  );

  useEffect(() => {
    if (mode !== "edit" || !initialData || state.isHydrated) return;

    dispatch({
      type: "set_fields",
      value: {
        title: initialData.title ?? "",
        make: initialData.make ?? "",
        model: initialData.model ?? "",
        year: initialData.year !== undefined ? String(initialData.year) : "",
        pricePerDay: initialData.pricePerDay !== undefined ? String(initialData.pricePerDay) : "",
        vin: initialData.vin ?? "",
        registrationNumber: initialData.registrationNumber ?? "",
        registrationDate: fromIsoToDateInputValue(initialData.registrationDate),
        isCarVerified: Boolean(initialData.isCarVerified),
        verificationSource: initialData.verificationSource,
        verifiedAt: initialData.verifiedAt,
        addressQuery: initialData.formattedAddress ?? "",
        formattedAddress: initialData.formattedAddress ?? "",
        city: initialData.city ?? "",
        country: initialData.country ?? "",
        latitude: initialData.lat !== undefined ? String(initialData.lat) : "",
        longitude: initialData.lng !== undefined ? String(initialData.lng) : "",
        startDate: fromIsoToDateInputValue(initialData.availableFrom),
        endDate: fromIsoToDateInputValue(initialData.availableUntil),
        selectedFeatures: initialData.features ?? [],
        customFeatures: initialData.customFeatures ?? [],
        kilometersLimitPerDay:
          initialData.kilometersLimitPerDay !== undefined ? String(initialData.kilometersLimitPerDay) : "",
        depositAmount: initialData.depositAmount !== undefined ? String(initialData.depositAmount) : "",
        fuelPolicy: initialData.fuelPolicy ?? "",
        fuelPolicyNote: initialData.fuelPolicyNote ?? "",
        collectionMethods:
          Array.isArray(initialData.collectionMethods) && initialData.collectionMethods.length > 0
            ? initialData.collectionMethods
            : ["in_person"],
        collectionInPersonInstructions: initialData.collectionInPersonInstructions ?? "",
        collectionLockboxCode: initialData.collectionLockboxCode ?? "",
        collectionLockboxInstructions: initialData.collectionLockboxInstructions ?? "",
        collectionDeliveryInstructions: initialData.collectionDeliveryInstructions ?? "",
        existingImageUrls: initialData.images ?? [],
        initialImageUrls: initialData.images ?? [],
      },
    });
    dispatch({ type: "set_hydrated" });
  }, [initialData, mode, state.isHydrated]);

  useEffect(() => {
    const trimmed = state.addressQuery.trim();
    if (trimmed.length < 3) {
      dispatch({ type: "set_fields", value: { addressSuggestions: [], showAddressSuggestions: false } });
      return;
    }

    let isCancelled = false;
    dispatch({ type: "set_field", key: "isSearchingAddress", value: true });

    const timeout = setTimeout(async () => {
      try {
        const suggestions = await searchAddresses({
          query: trimmed,
          sessionToken: placesSessionTokenRef.current,
        });
        if (isCancelled) return;
        dispatch({
          type: "set_fields",
          value: { addressSuggestions: suggestions, showAddressSuggestions: true },
        });
      } catch {
        if (isCancelled) return;
        dispatch({ type: "set_fields", value: { addressSuggestions: [] } });
      } finally {
        if (!isCancelled) {
          dispatch({ type: "set_field", key: "isSearchingAddress", value: false });
        }
      }
    }, 280);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [searchAddresses, state.addressQuery]);

  const setUploading = (value: boolean) => {
    dispatch({ type: "set_field", key: "isUploadingImages", value });
  };

  const setField = <K extends keyof CarFormState>(key: K, value: CarFormState[K]) => {
    dispatch({ type: "set_field", key, value });
  };

  const clearError = (key: FieldErrorKey) => {
    dispatch({ type: "clear_error", key });
  };

  const setVin = (value: string) => {
    dispatch({
      type: "set_fields",
      value: {
        vin: value.toUpperCase(),
        isCarVerified: false,
        verificationSource: undefined,
        verifiedAt: undefined,
        vinLookupError: null,
      },
    });
    clearError("vin");
  };

  const setRegistrationNumber = (value: string) => {
    dispatch({
      type: "set_fields",
      value: {
        registrationNumber: value.toUpperCase(),
        isCarVerified: false,
        verificationSource: undefined,
        verifiedAt: undefined,
        vinLookupError: null,
      },
    });
    clearError("registrationNumber");
  };

  const setRegistrationDate = (value: string) => {
    dispatch({ type: "set_fields", value: { registrationDate: value, vinLookupError: null } });
    clearError("registrationDate");
  };

  const setAddressQuery = (value: string) => {
    dispatch({ type: "set_fields", value: { addressQuery: value, formattedAddress: "", showAddressSuggestions: true } });
    clearError("address");
  };

  const onSelectSuggestion = async (suggestion: AddressSuggestion) => {
    dispatch({ type: "set_field", key: "isResolvingAddress", value: true });
    try {
      const details = await resolveAddressDetails({
        placeId: suggestion.placeId,
        sessionToken: placesSessionTokenRef.current,
      });

      dispatch({
        type: "set_fields",
        value: {
          addressQuery: suggestion.description,
          formattedAddress: details.formattedAddress || suggestion.description,
          city: details.city || state.city,
          country: details.country || state.country || "Polska",
          latitude: Number(details.lat).toFixed(6),
          longitude: Number(details.lng).toFixed(6),
          addressSuggestions: [],
          showAddressSuggestions: false,
        },
      });
      dispatch({
        type: "set_errors",
        value: {
          address: undefined,
          city: undefined,
          country: undefined,
          latitude: undefined,
          longitude: undefined,
        },
      });
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t, "carForm.submit.resolveAddressFailed"));
    } finally {
      dispatch({ type: "set_field", key: "isResolvingAddress", value: false });
    }
  };

  const addCustomFeature = () => {
    const value = state.customFeatureInput.trim();
    if (!value) return;
    if (
      state.selectedFeatures.includes(value) ||
      state.customFeatures.some((feature) => feature.toLowerCase() === value.toLowerCase())
    ) {
      dispatch({ type: "set_field", key: "customFeatureInput", value: "" });
      return;
    }

    dispatch({
      type: "set_fields",
      value: {
        customFeatures: [...state.customFeatures, value],
        customFeatureInput: "",
      },
    });
    clearError("features");
  };

  const removeCustomFeature = (feature: string) => {
    dispatch({
      type: "set_field",
      key: "customFeatures",
      value: state.customFeatures.filter((item) => item !== feature),
    });
  };

  const toggleFeature = (feature: string) => {
    dispatch({
      type: "set_field",
      key: "selectedFeatures",
      value: state.selectedFeatures.includes(feature)
        ? state.selectedFeatures.filter((value) => value !== feature)
        : [...state.selectedFeatures, feature],
    });
    clearError("features");
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES,
      quality: 0.9,
    });

    if (result.canceled) return;

    const availableSlots = mode === "edit" ? MAX_IMAGES - state.existingImageUrls.length : MAX_IMAGES;
    const merged = [...state.newImages, ...result.assets];
    const uniqueByUri = merged.filter(
      (asset, index, all) => all.findIndex((a) => a.uri === asset.uri) === index,
    );

    dispatch({
      type: "set_field",
      key: "newImages",
      value: uniqueByUri.slice(0, Math.max(0, availableSlots)),
    });
    clearError("images");
  };

  const removeImage = (uri: string, source: "existing" | "new") => {
    if (source === "existing") {
      dispatch({
        type: "set_field",
        key: "existingImageUrls",
        value: state.existingImageUrls.filter((item) => item !== uri),
      });
      return;
    }

    dispatch({
      type: "set_field",
      key: "newImages",
      value: state.newImages.filter((item) => item.uri !== uri),
    });
  };

  const formatVinLookupErrorMessage = (error: unknown) => {
    const message = toUserErrorMessage(error, t("carForm.identification.vinLookupFailed"));
    if (message.startsWith("INVALID_INPUT:")) {
      return message.replace("INVALID_INPUT:", "").trim();
    }
    if (message.startsWith("NOT_FOUND:")) {
      return t("carForm.identification.notFound");
    }
    if (message.startsWith("UNAVAILABLE:")) {
      return t("carForm.identification.unavailable");
    }
    return message;
  };

  const handleVinAutofill = async () => {
    if (!state.vin.trim()) {
      toast.warning(t("carForm.validation.vinMissing"));
      return;
    }
    if (!state.registrationNumber.trim()) {
      toast.warning(t("carForm.validation.registrationNumberMissing"));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(state.registrationDate.trim())) {
      toast.warning(t("carForm.validation.registrationDateMissing"));
      return;
    }

    dispatch({ type: "set_fields", value: { isVerifyingCar: true, vinLookupError: null } });
    try {
      const result = await verifyAndAutofillCarFromVin({
        vin: state.vin.trim().toUpperCase(),
        registrationNumber: state.registrationNumber.trim().toUpperCase(),
        registrationDate: state.registrationDate,
      });

      const mergedSelected =
        Array.isArray(result.features) && result.features.length > 0
          ? Array.from(new Set([...state.selectedFeatures, ...result.features]))
          : state.selectedFeatures;
      const mergedCustom =
        Array.isArray(result.customFeatures) && result.customFeatures.length > 0
          ? Array.from(new Set([...state.customFeatures, ...result.customFeatures]))
          : state.customFeatures;

      dispatch({
        type: "set_fields",
        value: {
          title: result.title || state.title,
          make: result.make,
          model: result.model,
          year: String(result.year),
          selectedFeatures: mergedSelected,
          customFeatures: mergedCustom,
          isCarVerified: Boolean(result.verified),
          verificationSource: result.verified ? result.source : undefined,
          verifiedAt: result.verified ? Date.now() : undefined,
        },
      });
      toast.success(t("carForm.identification.autofilled"));
    } catch (error) {
      const message = formatVinLookupErrorMessage(error);
      dispatch({
        type: "set_fields",
        value: {
          isCarVerified: false,
          verificationSource: undefined,
          verifiedAt: undefined,
          vinLookupError: message,
        },
      });
      toast.error(message);
    } finally {
      dispatch({ type: "set_field", key: "isVerifyingCar", value: false });
    }
  };

  const goToNextStep = () => {
    const errors = validateCurrentStep(state, t);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: "set_errors", value: errors });
      return;
    }

    const currentIndex = WIZARD_STEPS.indexOf(state.currentStep);
    if (currentIndex < WIZARD_STEPS.length - 1) {
      dispatch({ type: "set_step", step: WIZARD_STEPS[currentIndex + 1] });
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = WIZARD_STEPS.indexOf(state.currentStep);
    if (currentIndex > 0) {
      dispatch({ type: "set_step", step: WIZARD_STEPS[currentIndex - 1] });
    }
  };

  const handleSubmit = async () => {
    if (submitLockRef.current || isBusy) return;
    submitLockRef.current = true;

    const errors = validateAll(state, t);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: "set_errors", value: errors });
      submitLockRef.current = false;
      return;
    }

    if (!state.isCarVerified) {
      const confirmed = await confirmUnverifiedVin();
      if (!confirmed) {
        submitLockRef.current = false;
        return;
      }
    }

    dispatch({ type: "set_field", key: "isSubmitting", value: true });
    try {
      await performSubmit({ state, setUploading });
      toast.success(t(successMessageKey));
      onSuccess();
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t, errorFallbackKey));
      submitLockRef.current = false;
    } finally {
      dispatch({ type: "set_field", key: "isSubmitting", value: false });
    }
  };

  return {
    state,
    stepLabels,
    currentStepIndex,
    isFirstStep,
    isLastStep,
    isBusy,
    displayImages,
    submitBusyLabel,
    setField,
    setVin,
    setRegistrationNumber,
    setRegistrationDate,
    setAddressQuery,
    clearError,
    onSelectSuggestion,
    addCustomFeature,
    removeCustomFeature,
    toggleFeature,
    pickImages,
    removeImage,
    handleVinAutofill,
    goToNextStep,
    goToPreviousStep,
    handleSubmit,
  };
}

export type CarFormWizardController = ReturnType<typeof useCarFormWizard>;
