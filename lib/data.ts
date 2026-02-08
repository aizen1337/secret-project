type Car = {
  id: string;
  make: string;
  model: string;
  year: number;
  pricePerDay: number;
  image: string;
  location: string;
  features: string[];
  owner: {
    name: string;
    avatar: string;
    memberSince: string;
    responseRate: number;
  };
  rating: number;
  trips: number;
};

type Review = {
  id: string;
  carId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
};

const cars: Car[] = [
  {
    id: "car-1",
    make: "Tesla",
    model: "Model 3",
    year: 2023,
    pricePerDay: 120,
    image: "https://picsum.photos/800/600?car=1",
    location: "San Francisco, CA",
    features: ["Autopilot", "Long Range", "Heated Seats", "Bluetooth"],
    owner: {
      name: "Jordan Lee",
      avatar: "https://picsum.photos/200/200?user=1",
      memberSince: "2021",
      responseRate: 98,
    },
    rating: 4.9,
    trips: 214,
  },
  {
    id: "car-2",
    make: "BMW",
    model: "X5",
    year: 2022,
    pricePerDay: 150,
    image: "https://picsum.photos/800/600?car=2",
    location: "Los Angeles, CA",
    features: ["Luxury Interior", "All Wheel Drive", "Panoramic Roof"],
    owner: {
      name: "Casey Morgan",
      avatar: "https://picsum.photos/200/200?user=2",
      memberSince: "2019",
      responseRate: 95,
    },
    rating: 4.8,
    trips: 167,
  },
];

const reviews: Review[] = [
  {
    id: "review-1",
    carId: "car-1",
    userName: "Alex Rivera",
    userAvatar: "https://picsum.photos/200/200?reviewer=1",
    rating: 5,
    comment: "Easy pickup, spotless car, great experience.",
    date: "Jan 2025",
  },
  {
    id: "review-2",
    carId: "car-1",
    userName: "Jamie Chen",
    userAvatar: "https://picsum.photos/200/200?reviewer=2",
    rating: 4,
    comment: "Smooth ride and responsive host.",
    date: "Dec 2024",
  },
  {
    id: "review-3",
    carId: "car-2",
    userName: "Taylor Brooks",
    userAvatar: "https://picsum.photos/200/200?reviewer=3",
    rating: 5,
    comment: "Comfortable and powerful. Would rent again.",
    date: "Feb 2025",
  },
];

export function getCarById(id?: string) {
  if (!id) return null;
  return cars.find((car) => car.id === id) ?? null;
}

export function getReviewsByCarId(id?: string) {
  if (!id) return [];
  return reviews.filter((review) => review.carId === id);
}
