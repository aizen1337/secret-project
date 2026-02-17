import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

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
  const background = isSelected ? "var(--map-popup-cta-bg)" : "var(--map-marker-bg)";
  const color = isSelected ? "var(--map-popup-cta-fg)" : "var(--map-marker-fg)";
  const border = isSelected ? "var(--map-popup-cta-bg)" : "var(--map-marker-border)";

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
      box-shadow: var(--shadow-lg);
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
  onOfferPress,
}: SearchMapProps) {
  const containerClasses = `${
    containerClassName ??
    "h-40 w-full rounded-xl overflow-hidden border border-border bg-card"
  } relative`;

  const center = useMemo<[number, number]>(
    () => [region.latitude, region.longitude],
    [region.latitude, region.longitude],
  );
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  useEffect(() => {
    Object.entries(markerRefs.current).forEach(([carId, marker]) => {
      if (!marker) return;
      if (selectedCarId && carId === selectedCarId) {
        marker.openPopup();
      } else {
        marker.closePopup();
      }
    });
  }, [selectedCarId]);

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
              ref={(value) => {
                markerRefs.current[car.id] = value;
              }}
              position={[car.latitude, car.longitude]}
              icon={createPriceIcon(car.pricePerDay, selectedCarId === car.id)}
              eventHandlers={{
                click: () => onMarkerPress?.(car.id),
              }}
            >
              <Popup closeButton={false} autoPan={true} className="offer-popup">
                <div
                  style={{
                    width: 220,
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "var(--map-popup-bg)",
                    boxShadow: "var(--shadow-xl)",
                  }}
                >
                  {car.imageUrl ? (
                    <img
                      src={car.imageUrl}
                      alt={car.title}
                      style={{
                        width: "100%",
                        height: 116,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 116,
                        background: "var(--surface-subtle)",
                      }}
                    />
                  )}
                  <div style={{ padding: "10px 12px 12px 12px" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--map-marker-fg)",
                        lineHeight: 1.3,
                      }}
                    >
                      {car.title}
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0 0",
                        fontSize: 12,
                        color: "var(--map-popup-muted)",
                      }}
                    >
                      {car.locationCity}, {car.locationCountry}
                    </p>
                    <p
                      style={{
                        margin: "6px 0 10px 0",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--map-marker-fg)",
                      }}
                    >
                      ${car.pricePerDay} / day
                    </p>
                    <button
                      type="button"
                      onClick={() => onOfferPress?.(car.id)}
                      style={{
                        width: "100%",
                        border: 0,
                        borderRadius: 10,
                        padding: "9px 10px",
                        background: "var(--map-popup-cta-bg)",
                        color: "var(--map-popup-cta-fg)",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      View offer
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </View>
    </View>
  );
}
