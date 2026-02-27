import { api } from "@/convex/_generated/api";

export const hostDashboardApi = {
  listHostCars: api.cars.listHostCars,
  archiveHostCar: api.cars.archiveHostCar,
  unarchiveHostCar: api.cars.unarchiveHostCar,
  deleteHostCar: api.cars.deleteHostCar,
  fileHostDepositCase: api.depositCases.fileHostDepositCase,
  listHostBookingsWithPayouts: api.bookings.listHostBookingsWithPayouts,
  cancelReservation: api.bookings.cancelReservation,
  getHostPayoutStatus: api.users.getHostPayoutStatus,
};
