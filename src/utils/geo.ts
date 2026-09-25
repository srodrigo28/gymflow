import type { GeoPoint } from '@/src/types/gym-checkin';

// Raio médio da Terra em metros (WGS 84). Nas centenas de metros de um check-in o erro é desprezível.
const EARTH_RADIUS_M = 6_371_008.8;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/**
 * Distância em metros entre dois pontos pela fórmula de haversine. Este módulo não depende de nada
 * do React Native de propósito: dá para conferir o cálculo em Node puro.
 */
export function distanceInMeters(a: GeoPoint, b: GeoPoint) {
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  // O min(1, …) segura o arredondamento em ponto flutuante nos antípodas, onde h passaria de 1.
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}
