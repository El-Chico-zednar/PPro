export type IntervalType = 'km' | 'mile' | 'elevation';

export interface RoutePoint {
  lat: number;
  lng: number;
  elevation: number;
  distance: number; // cumulative distance in meters
}

export interface RouteData {
  name: string;
  points: RoutePoint[];
  totalDistance: number; // in meters
  totalElevationGain: number;
  totalElevationLoss: number;
  isVirtual?: boolean; // Flag para indicar si es una ruta virtual (sin mapa real)
}

export interface PaceInterval {
  index: number;
  startDistance: number; // meters
  endDistance: number; // meters
  distance: number; // interval distance in meters
  elevationGain: number;
  elevationLoss: number;
  pace: number; // seconds per km
  time: number; // seconds for this interval
  cumulativeTime: number; // seconds
  startPoint: RoutePoint;
  endPoint: RoutePoint;
}

export interface PaceStrategy {
  intervals: PaceInterval[];
  totalTime: number;
  averagePace: number;
}