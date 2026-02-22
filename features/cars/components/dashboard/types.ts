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
