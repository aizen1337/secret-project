import { api } from "@/convex/_generated/api";

export const searchApi = {
  listCurrentlyAvailableCarsPaginated: api.cars.listCurrentlyAvailableCarsPaginated,
  searchAddresses: api.cars.searchAddresses,
  resolveAddressDetails: api.cars.resolveAddressDetails,
};
