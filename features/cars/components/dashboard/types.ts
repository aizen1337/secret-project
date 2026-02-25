export type CarItem = {
  id: string;
  title?: string;
  make: string;
  model: string;
  year: number;
  pricePerDay: number;
  images: string[];
  features: string[];
  customFeatures: string[];
  isCarVerified?: boolean;
  location: {
    city: string;
    country: string;
    lat: number;
    lng: number;
  };
};

export type BrowseAdvancedFilters = {
  make: string;
  model: string;
  minYear: string;
  maxYear: string;
  minPrice: string;
  maxPrice: string;
  selectedFeatures: string[];
  verifiedOnly: boolean;
};

export type RecentLocation = {
  placeId: string;
  description: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  searchCount: number;
  lastSearchedAt: number;
};

export type OfferScoreBreakdown = {
  priceScore: number;
  carReviewScore: number;
  hostReviewScore: number;
  rentalBehaviorScore: number;
  distanceScore: number;
  frequencyScore: number;
  durationScore: number;
  utilizationScore: number;
};

export type PromotionalOffer = {
  id: string;
  title?: string;
  make: string;
  model: string;
  year: number;
  pricePerDay: number;
  images: string[];
  location: {
    city: string;
    country: string;
    lat: number;
    lng: number;
  };
  carRating: number;
  carReviewCount: number;
  hostRating: number;
  hostReviewCount: number;
  bookingCount180d: number;
  totalRentalDays180d: number;
  avgRentalDays: number;
  offerScore: number;
  badge: "best_value" | "top_rated" | "popular" | null;
  scoreBreakdown: OfferScoreBreakdown;
  matchedRecentLocationPlaceId?: string;
};

export type NearbyBigCityOffersResult = {
  anchorLocation: RecentLocation | null;
  city: {
    city: string;
    country: string;
    listingCount: number;
    medianPrice: number;
    minDistanceToAnchorKm: number;
  } | null;
  offers: PromotionalOffer[];
  error: string | null;
};
