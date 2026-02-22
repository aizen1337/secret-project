import type { FuelPolicy, WizardStep } from "@/features/cars/form/types";

export const WIZARD_STEPS: WizardStep[] = ["identification", "details", "features", "images"];

export const FUEL_POLICIES: Array<{ value: FuelPolicy; labelKey: string }> = [
  { value: "full_to_full", labelKey: "carForm.details.fuelPolicies.full_to_full" },
  { value: "same_to_same", labelKey: "carForm.details.fuelPolicies.same_to_same" },
  { value: "fuel_included", labelKey: "carForm.details.fuelPolicies.fuel_included" },
];

export const MAX_IMAGES = 8;
