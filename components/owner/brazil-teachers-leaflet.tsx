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
 * Helper that fits the Leaflet map view to whatever pins are present.
 * If they're tightly clustered (e.g. all in one city), we add a small
 * padding so the pins aren't squashed to the edge of the viewport.
 */
function FitToMarkers({ markers }: { markers: PersonMarker[] }) {
  const map = useMap();
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
  // Default centre = geographic centre of Brazil — only used before
  // FitToMarkers kicks in on mount.
  const center = useMemo<LatLngTuple>(() => [-14.235, -51.9253], []);
  return (
    <MapContainer
      center={center}
      zoom={4}
      minZoom={3}
      maxZoom={12}
      scrollWheelZoom={false}
      // Touch gestures (pinch-zoom, drag) are on by default. tap is
      // also on by default but isn't exposed in the react-leaflet
      // typings, so we omit the explicit prop.
      touchZoom
      dragging
      style={{ width: "100%", background: "#0a0a12" }}
      className="h-[380px] sm:h-[460px] md:h-[520px]"
      attributionControl={false}
    >
      {/* CartoDB Dark Matter — free, no token required, matches the
          app's dark palette. detectRetina picks @2x tiles on high-DPI
          phones and laptops so the map never looks blurry. */}
      <TileLayer
        url="https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
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
            color: "#ecebff",
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
                  color: "#6366f1",
                  fontStyle: "italic",
                }}
              >
                {m.role}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "#6e6c86" }}>
                {m.city}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
