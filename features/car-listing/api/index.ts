import { api } from "@/convex/_generated/api";

export const carListingApi = {
  createCar: api.cars.createCar,
  getHostCarById: api.cars.getHostCarById,
  updateHostCar: api.cars.updateHostCar,
  getCarOfferById: api.cars.getCarOfferById,
  generateCarImageUploadUrl: api.cars.generateCarImageUploadUrl,
  searchAddresses: api.cars.searchAddresses,
  resolveAddressDetails: api.cars.resolveAddressDetails,
  verifyAndAutofillCarFromVin: api.cars.verifyAndAutofillCarFromVin,
  createCheckoutSession: api.stripe.createCheckoutSession,
};
