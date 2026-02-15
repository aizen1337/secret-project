import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

import type { SearchMapProps } from "./SearchMap";

function FitToCars({
  cars,
  region,
}: Pick<SearchMapProps, "cars" | "region">) {
  const map = useMap();

  useEffect(() => {
    if (!cars.length) {
      map.setView([region.latitude, region.longitude], 10);
      return;
    }

    const bounds = L.latLngBounds(
      cars.map((car) => [car.latitude, car.longitude] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [cars, map, region.latitude, region.longitude]);

  return null;
}

function createPriceIcon(pricePerDay: number, isSelected: boolean) {
  const background = isSelected ? "#0f172a" : "#ffffff";
  const color = isSelected ? "#ffffff" : "#111827";
  const border = isSelected ? "#0f172a" : "#e5e7eb";

  return L.divIcon({
    className: "",
    html: `<div style="
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 36px;
      padding: 7px 11px;
      border-radius: 9999px;
      border: 1px solid ${border};
      background: ${background};
      color: ${color};
      font-size: 12px;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0.01em;
      box-shadow: 0 8px 22px rgba(15,23,42,0.24);
      white-space: nowrap;
      transform: translateY(-10px);
      transition: all 120ms ease;
    ">$${pricePerDay}
      <div style="
        position: absolute;
        left: 50%;
        bottom: -7px;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 7px solid ${background};
      "></div>
    </div>`,
    iconAnchor: [22, 29],
  });
}

export function SearchMap({
  region,
  cars,
  containerClassName,
  interactive = true,
  selectedCarId,
  onMarkerPress,
}: SearchMapProps) {
  const containerClasses = `${
    containerClassName ??
    "h-40 w-full rounded-xl overflow-hidden border border-border bg-card"
  } relative`;

  const center = useMemo<[number, number]>(
    () => [region.latitude, region.longitude],
    [region.latitude, region.longitude],
  );

  return (
    <View className={containerClasses}>
      <View className="flex-1 overflow-hidden rounded-xl">
        <MapContainer
          center={center}
          zoom={11}
          style={{ width: "100%", height: "100%" }}
          dragging={interactive}
          scrollWheelZoom={interactive}
          doubleClickZoom={interactive}
          touchZoom={interactive}
          zoomControl={interactive}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            subdomains={["a", "b", "c"]}
          />
          <FitToCars cars={cars} region={region} />
          {cars.map((car) => (
            <Marker
              key={car.id}
              position={[car.latitude, car.longitude]}
              icon={createPriceIcon(car.pricePerDay, selectedCarId === car.id)}
              eventHandlers={{
                click: () => onMarkerPress?.(car.id),
              }}
            />
          ))}
        </MapContainer>
      </View>
    </View>
  );
}
