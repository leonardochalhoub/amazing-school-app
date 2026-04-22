"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import type { LatLngBoundsExpression, LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "next-themes";

interface PersonMarker {
  lat: number;
  lng: number;
  color: string;
  name: string;
  role: string;
  city: string;
}

interface Props {
  markers: PersonMarker[];
}

/**
 * Helper that fits the map to the pins AND forces Leaflet to
 * invalidate its size. The invalidateSize call fixes the common
 * "grey squares only" / "tiles don't appear" symptom caused by
 * Leaflet calculating its layout before the container finishes
 * laying out (flex/grid parents, tailwind responsive classes,
 * Next.js dynamic-import mount).
 */
function FitToMarkers({ markers }: { markers: PersonMarker[] }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const raf = requestAnimationFrame(() => map.invalidateSize());
    return () => cancelAnimationFrame(raf);
  }, [map]);
  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 7);
      return;
    }
    const bounds: LatLngBoundsExpression = markers.map(
      (m) => [m.lat, m.lng] as LatLngTuple,
    );
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 9 });
  }, [map, markers]);
  return null;
}

export default function BrazilTeachersLeaflet({ markers }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Default centre = geographic centre of Brazil — only used before
  // FitToMarkers kicks in on mount.
  const center = useMemo<LatLngTuple>(() => [-14.235, -51.9253], []);

  // CartoDB palettes flip with the app theme. `light_all` and
  // `dark_all` are the free no-token endpoints; Leaflet swaps the
  // TileLayer when the `key` changes, so it doesn't try to mutate
  // tiles in place.
  const tileUrl = isDark
    ? "https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
    : "https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png";
  const bg = isDark ? "#0a0a12" : "#f5f3ff";
  const popupMuted = isDark ? "#6e6c86" : "#6b7280";
  const popupAccent = isDark ? "#a78bfa" : "#6366f1";

  return (
    <MapContainer
      center={center}
      zoom={4}
      minZoom={3}
      maxZoom={12}
      scrollWheelZoom={false}
      touchZoom
      dragging
      style={{ height: 380, width: "100%", background: bg }}
      className="!h-[380px] sm:!h-[460px] md:!h-[520px]"
      attributionControl={false}
    >
      <TileLayer
        key={isDark ? "dark" : "light"}
        url={tileUrl}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        detectRetina
      />
      <FitToMarkers markers={markers} />
      {markers.map((m, i) => (
        <CircleMarker
          key={`${m.name}-${i}`}
          center={[m.lat, m.lng]}
          radius={9}
          pathOptions={{
            color: isDark ? "#ecebff" : "#1f1b2d",
            weight: 1.5,
            fillColor: m.color,
            fillOpacity: 0.95,
          }}
        >
          <Popup closeButton={false} autoPan={false}>
            <div style={{ minWidth: 180, fontFamily: "system-ui, sans-serif" }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>
                {m.name}
              </p>
              <p
                style={{
                  margin: "2px 0 6px",
                  fontSize: 12,
                  color: popupAccent,
                  fontStyle: "italic",
                }}
              >
                {m.role}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: popupMuted }}>
                {m.city}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
