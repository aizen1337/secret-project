export type FeatureGroup = {
  title: string;
  items: string[];
};

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: "Comfort",
    items: [
      "Air Conditioning",
      "Heated Seats",
      "Leather Seats",
      "Sunroof",
      "Cruise Control",
    ],
  },
  {
    title: "Tech",
    items: [
      "Bluetooth",
      "GPS",
      "Apple CarPlay",
      "Android Auto",
      "USB Charging",
      "Wi-Fi Hotspot",
    ],
  },
  {
    title: "Safety",
    items: [
      "Rear Camera",
      "Parking Sensors",
      "Lane Assist",
      "Blind Spot Monitor",
      "ABS",
      "Adaptive Cruise",
    ],
  },
  {
    title: "Vehicle",
    items: [
      "Automatic",
      "Manual",
      "Hybrid",
      "Electric",
      "AWD",
      "Tow Hook",
      "Child Seat",
    ],
  },
];
