import { api } from "@/convex/_generated/api";

export const exploreApi = {
  listPromotionalOffersForRecentLocations: api.cars.listPromotionalOffersForRecentLocations,
  listPromotionalOffersForNearbyBigCity: api.cars.listPromotionalOffersForNearbyBigCity,
  searchAddresses: api.cars.searchAddresses,
  resolveAddressDetails: api.cars.resolveAddressDetails,
  upsertRecentLocationSearch: api.recentSearches.upsertRecentLocationSearch,
  listMyRecentLocationSearches: api.recentSearches.listMyRecentLocationSearches,
};
