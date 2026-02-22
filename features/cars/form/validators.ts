import type { FieldErrors, CarFormState } from "@/features/cars/form/types";
import { toEndOfDayIso, toStartOfDayIso } from "@/features/cars/form/dateUtils";

export type ValidationT = (key: string, options?: Record<string, string | number>) => string;

export function validateIdentification(state: CarFormState, t: ValidationT): FieldErrors {
  const errors: FieldErrors = {};
  if (!state.vin.trim()) errors.vin = t("carForm.validation.vinRequired");
  if (!state.registrationNumber.trim()) errors.registrationNumber = t("carForm.validation.registrationNumberRequired");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(state.registrationDate.trim())) {
    errors.registrationDate = t("carForm.validation.registrationDateFormat");
  }
  return errors;
}

export function validateDetails(state: CarFormState, t: ValidationT): FieldErrors {
  const errors: FieldErrors = {};
  const yearNumber = Number(state.year);
  const priceNumber = Number(state.pricePerDay);
  const latNumber = Number(state.latitude);
  const lngNumber = Number(state.longitude);
  const kmValue = state.kilometersLimitPerDay.trim();
  const depositValue = state.depositAmount.trim();
  const currentYear = new Date().getFullYear() + 1;

  if (!state.title.trim()) errors.title = t("carForm.validation.titleRequired");
  if (!state.make.trim()) errors.make = t("carForm.validation.makeRequired");
  if (!state.model.trim()) errors.model = t("carForm.validation.modelRequired");
  if (!state.year || Number.isNaN(yearNumber) || yearNumber < 1980 || yearNumber > currentYear) {
    errors.year = t("carForm.validation.yearInvalid");
  }
  if (!state.pricePerDay || Number.isNaN(priceNumber) || priceNumber <= 0) {
    errors.pricePerDay = t("carForm.validation.priceInvalid");
  }
  if (!state.city.trim()) errors.city = t("carForm.validation.cityRequired");
  if (!state.country.trim()) errors.country = t("carForm.validation.countryRequired");
  if (!state.formattedAddress.trim()) errors.address = t("carForm.validation.addressRequired");
  if (Number.isNaN(latNumber) || latNumber < -90 || latNumber > 90) {
    errors.latitude = t("carForm.validation.latitudeInvalid");
  }
  if (Number.isNaN(lngNumber) || lngNumber < -180 || lngNumber > 180) {
    errors.longitude = t("carForm.validation.longitudeInvalid");
  }
  if (new Date(toStartOfDayIso(state.startDate)).getTime() > new Date(toEndOfDayIso(state.endDate)).getTime()) {
    errors.availability = t("carForm.validation.availabilityInvalid");
  }
  if (kmValue.length > 0) {
    const km = Number(kmValue);
    if (!Number.isFinite(km) || km < 0) {
      errors.kilometersLimitPerDay = t("carForm.validation.kmInvalid");
    }
  }
  if (depositValue.length > 0) {
    const deposit = Number(depositValue);
    if (!Number.isFinite(deposit) || deposit < 0) {
      errors.depositAmount = t("carForm.validation.depositInvalid");
    }
  }
  if (state.fuelPolicyNote.trim().length > 0 && !state.fuelPolicy) {
    errors.fuelPolicy = t("carForm.validation.fuelPolicyRequiredForNote");
  }
  return errors;
}

export function validateFeatures(state: CarFormState, t: ValidationT): FieldErrors {
  const errors: FieldErrors = {};
  if (state.selectedFeatures.length + state.customFeatures.length < 1) {
    errors.features = t("carForm.validation.featuresRequired");
  }
  return errors;
}

export function validateImages(state: CarFormState, t: ValidationT): FieldErrors {
  const errors: FieldErrors = {};
  if (state.existingImageUrls.length + state.newImages.length < 1) {
    errors.images = t("carForm.validation.imagesRequired");
  }
  return errors;
}

export function validateCurrentStep(state: CarFormState, t: ValidationT): FieldErrors {
  if (state.currentStep === "identification") return validateIdentification(state, t);
  if (state.currentStep === "details") return validateDetails(state, t);
  if (state.currentStep === "features") return validateFeatures(state, t);
  return validateImages(state, t);
}

export function validateAll(state: CarFormState, t: ValidationT): FieldErrors {
  return {
    ...validateIdentification(state, t),
    ...validateDetails(state, t),
    ...validateFeatures(state, t),
    ...validateImages(state, t),
  };
}
