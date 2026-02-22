import type * as ImagePicker from "expo-image-picker";

export type FieldErrorKey =
  | "vin"
  | "registrationNumber"
  | "registrationDate"
  | "kilometersLimitPerDay"
  | "depositAmount"
  | "fuelPolicy"
  | "title"
  | "make"
  | "model"
  | "year"
  | "pricePerDay"
  | "city"
  | "country"
  | "latitude"
  | "longitude"
  | "images"
  | "availability"
  | "address"
  | "features";

export type FieldErrors = Partial<Record<FieldErrorKey, string>>;

export type AddressSuggestion = {
  description: string;
  placeId: string;
};

export type WizardStep = "identification" | "details" | "features" | "images";

export type FuelPolicy = "full_to_full" | "same_to_same" | "fuel_included";

export type DisplayImage = {
  uri: string;
  source: "existing" | "new";
};

export type CarFormMode = "create" | "edit";

export type CarFormHydrationData = {
  title?: string;
  make?: string;
  model?: string;
  year?: number;
  pricePerDay?: number;
  vin?: string;
  registrationNumber?: string;
  registrationDate?: string;
  isCarVerified?: boolean;
  verificationSource?: string;
  verifiedAt?: number;
  formattedAddress?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  availableFrom?: string;
  availableUntil?: string;
  features?: string[];
  customFeatures?: string[];
  kilometersLimitPerDay?: number;
  depositAmount?: number;
  fuelPolicy?: FuelPolicy;
  fuelPolicyNote?: string;
  images?: string[];
};

export type CarFormState = {
  title: string;
  make: string;
  model: string;
  year: string;
  pricePerDay: string;
  vin: string;
  registrationNumber: string;
  registrationDate: string;
  isCarVerified: boolean;
  verificationSource?: string;
  verifiedAt?: number;
  vinLookupError: string | null;
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
  selectedFeatures: string[];
  customFeatureInput: string;
  customFeatures: string[];
  kilometersLimitPerDay: string;
  depositAmount: string;
  fuelPolicy: FuelPolicy | "";
  fuelPolicyNote: string;
  existingImageUrls: string[];
  initialImageUrls: string[];
  newImages: ImagePicker.ImagePickerAsset[];
  fieldErrors: FieldErrors;
  currentStep: WizardStep;
  isSubmitting: boolean;
  isUploadingImages: boolean;
  isResolvingAddress: boolean;
  isSearchingAddress: boolean;
  isVerifyingCar: boolean;
  isHydrated: boolean;
};
