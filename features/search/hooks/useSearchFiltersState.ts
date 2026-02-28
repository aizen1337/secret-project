import { useCallback, useMemo, useState } from "react";

import type { BrowseAdvancedFilters, CarItem } from "@/features/cars/components/dashboard/types";

function createEmptyAdvancedFilters(): BrowseAdvancedFilters {
  return {
    make: "",
    model: "",
    minYear: "",
    maxYear: "",
    minPrice: "",
    maxPrice: "",
    selectedFeatures: [],
    verifiedOnly: false,
  };
}

export function useSearchFiltersState(cars: CarItem[]) {
  const [advancedFilters, setAdvancedFilters] = useState<BrowseAdvancedFilters>(
    createEmptyAdvancedFilters,
  );
  const [draftAdvancedFilters, setDraftAdvancedFilters] = useState<BrowseAdvancedFilters>(
    createEmptyAdvancedFilters,
  );
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);

  const makeText = advancedFilters.make.trim().toLowerCase();
  const modelText = advancedFilters.model.trim().toLowerCase();
  const minYear = Number(advancedFilters.minYear);
  const maxYear = Number(advancedFilters.maxYear);
  const minPrice = Number(advancedFilters.minPrice);
  const maxPrice = Number(advancedFilters.maxPrice);
  const hasMinYear = advancedFilters.minYear.trim().length > 0 && Number.isFinite(minYear);
  const hasMaxYear = advancedFilters.maxYear.trim().length > 0 && Number.isFinite(maxYear);
  const hasMinPrice = advancedFilters.minPrice.trim().length > 0 && Number.isFinite(minPrice);
  const hasMaxPrice = advancedFilters.maxPrice.trim().length > 0 && Number.isFinite(maxPrice);

  const filteredCars = useMemo(
    () =>
      cars.filter((car) => {
        const carFeatures = [...(car.features ?? []), ...(car.customFeatures ?? [])].map((item) =>
          item.toLowerCase(),
        );
        return (
          (makeText.length === 0 || car.make.toLowerCase().includes(makeText)) &&
          (modelText.length === 0 || car.model.toLowerCase().includes(modelText)) &&
          (!hasMinYear || car.year >= minYear) &&
          (!hasMaxYear || car.year <= maxYear) &&
          (!hasMinPrice || car.pricePerDay >= minPrice) &&
          (!hasMaxPrice || car.pricePerDay <= maxPrice) &&
          advancedFilters.selectedFeatures.every((feature) =>
            carFeatures.includes(feature.toLowerCase()),
          ) &&
          (!advancedFilters.verifiedOnly || Boolean(car.isCarVerified))
        );
      }),
    [
      advancedFilters.selectedFeatures,
      advancedFilters.verifiedOnly,
      cars,
      hasMaxPrice,
      hasMaxYear,
      hasMinPrice,
      hasMinYear,
      makeText,
      maxPrice,
      maxYear,
      minPrice,
      minYear,
      modelText,
    ],
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.make.trim()) count += 1;
    if (advancedFilters.model.trim()) count += 1;
    if (advancedFilters.minYear.trim()) count += 1;
    if (advancedFilters.maxYear.trim()) count += 1;
    if (advancedFilters.minPrice.trim()) count += 1;
    if (advancedFilters.maxPrice.trim()) count += 1;
    if (advancedFilters.selectedFeatures.length > 0) count += 1;
    if (advancedFilters.verifiedOnly) count += 1;
    return count;
  }, [advancedFilters]);

  const openFiltersDialog = useCallback(() => {
    setDraftAdvancedFilters(advancedFilters);
    setIsFiltersDialogOpen(true);
  }, [advancedFilters]);

  const closeFiltersDialog = useCallback(() => {
    setIsFiltersDialogOpen(false);
  }, []);

  const resetDraftFilters = useCallback(() => {
    setDraftAdvancedFilters(createEmptyAdvancedFilters());
  }, []);

  const applyDraftFilters = useCallback(() => {
    setAdvancedFilters(draftAdvancedFilters);
    setIsFiltersDialogOpen(false);
  }, [draftAdvancedFilters]);

  return {
    filteredCars,
    draftAdvancedFilters,
    setDraftAdvancedFilters,
    applyDraftFilters,
    resetDraftFilters,
    isFiltersDialogOpen,
    openFiltersDialog,
    closeFiltersDialog,
    activeFiltersCount,
  };
}
