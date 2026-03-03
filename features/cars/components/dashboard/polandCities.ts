export type PolandCityQuickPick = {
  placeId: string;
  description: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
};

const QUICK_PICKS: PolandCityQuickPick[] = [
  { placeId: "CITY:WARSAW", description: "Warsaw, Poland", city: "Warsaw", country: "Poland", lat: 52.2297, lng: 21.0122 },
  { placeId: "CITY:KRAKOW", description: "Krakow, Poland", city: "Krakow", country: "Poland", lat: 50.0647, lng: 19.945 },
  { placeId: "CITY:LODZ", description: "Lodz, Poland", city: "Lodz", country: "Poland", lat: 51.7592, lng: 19.456 },
  { placeId: "CITY:WROCLAW", description: "Wroclaw, Poland", city: "Wroclaw", country: "Poland", lat: 51.1079, lng: 17.0385 },
  { placeId: "CITY:POZNAN", description: "Poznan, Poland", city: "Poznan", country: "Poland", lat: 52.4064, lng: 16.9252 },
  { placeId: "CITY:GDANSK", description: "Gdansk, Poland", city: "Gdansk", country: "Poland", lat: 54.352, lng: 18.6466 },
  { placeId: "CITY:SZCZECIN", description: "Szczecin, Poland", city: "Szczecin", country: "Poland", lat: 53.4285, lng: 14.5528 },
  { placeId: "CITY:BYDGOSZCZ", description: "Bydgoszcz, Poland", city: "Bydgoszcz", country: "Poland", lat: 53.1235, lng: 18.0084 },
  { placeId: "CITY:LUBLIN", description: "Lublin, Poland", city: "Lublin", country: "Poland", lat: 51.2465, lng: 22.5684 },
  { placeId: "CITY:BIALYSTOK", description: "Bialystok, Poland", city: "Bialystok", country: "Poland", lat: 53.1325, lng: 23.1688 },
];

export function getPolandCityQuickPicks(query?: string) {
  const trimmed = String(query ?? "").trim().toLowerCase();
  if (!trimmed) return QUICK_PICKS;
  return QUICK_PICKS.filter((city) => city.description.toLowerCase().includes(trimmed));
}

export function getPolandCityDetailsByPlaceId(placeId: string) {
  return QUICK_PICKS.find((city) => city.placeId === placeId) ?? null;
}
