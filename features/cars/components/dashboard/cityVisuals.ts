import type { LocationSuggestion } from "@/features/cars/components/dashboard/searchUtils";

const CITY_IMAGE_BY_PLACE_ID: Record<string, string> = {
  "CITY:WARSAW":
    "https://images.unsplash.com/photo-1607427293702-036933bbf746?auto=format&fit=crop&w=1200&q=80",
  "CITY:KRAKOW":
    "https://images.unsplash.com/photo-1551867633-194f125bddfa?auto=format&fit=crop&w=1200&q=80",
  "CITY:LODZ":
    "https://images.unsplash.com/photo-1578922746465-3a80a228f223?auto=format&fit=crop&w=1200&q=80",
  "CITY:WROCLAW":
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
  "CITY:POZNAN":
    "https://images.unsplash.com/photo-1596558450268-9c27524ba856?auto=format&fit=crop&w=1200&q=80",
  "CITY:GDANSK":
    "https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=1200&q=80",
  "CITY:SZCZECIN":
    "https://images.unsplash.com/photo-1584801096196-592febfc467f?auto=format&fit=crop&w=1200&q=80",
  "CITY:BYDGOSZCZ":
    "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?auto=format&fit=crop&w=1200&q=80",
  "CITY:LUBLIN":
    "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1200&q=80",
  "CITY:BIALYSTOK":
    "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80",
};

const FALLBACK_CITY_IMAGE =
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80";

export function getSuggestionTitle(description: string) {
  return description.split(",")[0]?.trim() ?? description;
}

export function getSuggestionSubtitle(description: string) {
  const [, ...rest] = description.split(",");
  return rest.join(",").trim();
}

export function getSuggestionImage(suggestion: LocationSuggestion) {
  return CITY_IMAGE_BY_PLACE_ID[suggestion.placeId] ?? FALLBACK_CITY_IMAGE;
}
