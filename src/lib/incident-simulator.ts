export type IncidentType = "accident" | "anomaly" | "normal";
export type IncidentStatus = "active" | "resolved";

export interface Incident {
  id: string;
  type: IncidentType;
  street: string;
  time: Date;
  status: IncidentStatus;
  confidence: number; // 0-100
  // Geographic coordinates (real Jaén)
  lat: number;
  lng: number;
  // Legacy % position kept for any consumer that still wants it
  x: number;
  y: number;
  camera: string;
}

// Real points around Jaén city center
const LOCATIONS: { street: string; lat: number; lng: number }[] = [
  { street: "Av. de Madrid", lat: 37.7795, lng: -3.7895 },
  { street: "C/ Bernabé Soriano", lat: 37.7665, lng: -3.7905 },
  { street: "Paseo de la Estación", lat: 37.7745, lng: -3.7885 },
  { street: "Av. de Andalucía", lat: 37.7820, lng: -3.7860 },
  { street: "C/ Roldán y Marín", lat: 37.7672, lng: -3.7892 },
  { street: "Av. de Granada", lat: 37.7610, lng: -3.7820 },
  { street: "Pl. de las Batallas", lat: 37.7710, lng: -3.7895 },
  { street: "C/ Virgen de la Capilla", lat: 37.7680, lng: -3.7880 },
  { street: "Av. de Barcelona", lat: 37.7855, lng: -3.7905 },
  { street: "C/ Millán de Priego", lat: 37.7695, lng: -3.7935 },
  { street: "Ronda Sur", lat: 37.7585, lng: -3.7860 },
  { street: "C/ Navas de Tolosa", lat: 37.7688, lng: -3.7918 },
];

// Approximate map bounds used to derive % coords (for legacy components)
export const JAEN_CENTER: [number, number] = [37.7720, -3.7890];
const BOUNDS = { minLat: 37.755, maxLat: 37.790, minLng: -3.800, maxLng: -3.778 };

const CAMERAS = ["CAM-01", "CAM-02", "CAM-03", "CAM-04", "CAM-05", "CAM-06", "CAM-07", "CAM-08"];

let counter = 0;
function uid() {
  counter += 1;
  return `INC-${Date.now().toString(36)}-${counter}`;
}

export function randomIncident(): Incident {
  const r = Math.random();
  let type: IncidentType;
  if (r < 0.18) type = "accident";
  else if (r < 0.55) type = "anomaly";
  else type = "normal";

  const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  // Add a small random jitter (~50-80m) so markers don't perfectly overlap
  const lat = loc.lat + (Math.random() - 0.5) * 0.0015;
  const lng = loc.lng + (Math.random() - 0.5) * 0.0018;

  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
  const y = (1 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;

  return {
    id: uid(),
    type,
    street: loc.street,
    time: new Date(),
    status: "active",
    confidence: Math.round(78 + Math.random() * 21),
    lat,
    lng,
    x: Math.max(4, Math.min(96, x)),
    y: Math.max(4, Math.min(96, y)),
    camera: CAMERAS[Math.floor(Math.random() * CAMERAS.length)],
  };
}

export function seedIncidents(n: number): Incident[] {
  return Array.from({ length: n }, () => {
    const i = randomIncident();
    i.time = new Date(Date.now() - Math.random() * 1000 * 60 * 30);
    if (Math.random() < 0.3) i.status = "resolved";
    return i;
  }).sort((a, b) => b.time.getTime() - a.time.getTime());
}

export const TYPE_LABEL: Record<IncidentType, string> = {
  accident: "Colisión",
  anomaly: "Anomalía",
  normal: "Tráfico normal",
};

export const TYPE_ACTION: Record<IncidentType, string> = {
  accident: "Avisar a emergencias 112",
  anomaly: "Despachar patrulla local",
  normal: "Sin acción requerida",
};
