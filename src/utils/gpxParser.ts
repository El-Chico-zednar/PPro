import { RoutePoint, RouteData } from '../types/pace';

// Haversine formula to calculate distance between two GPS points
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Calculate elevation gain and loss
function calculateElevationStats(points: RoutePoint[]): {
  gain: number;
  loss: number;
} {
  let gain = 0;
  let loss = 0;

  for (let i = 1; i < points.length; i++) {
    const diff = points[i].elevation - points[i - 1].elevation;
    if (diff > 0) {
      gain += diff;
    } else {
      loss += Math.abs(diff);
    }
  }

  return { gain, loss };
}

// Parse GPX XML string to RouteData
export function parseGPX(gpxContent: string, name: string): RouteData {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');

  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Error parsing GPX file');
  }

  // Extract track points
  const trkpts = xmlDoc.querySelectorAll('trkpt');
  const points: RoutePoint[] = [];
  let cumulativeDistance = 0;

  trkpts.forEach((trkpt, index) => {
    const lat = parseFloat(trkpt.getAttribute('lat') || '0');
    const lon = parseFloat(trkpt.getAttribute('lon') || '0');
    const eleElement = trkpt.querySelector('ele');
    const elevation = eleElement ? parseFloat(eleElement.textContent || '0') : 0;

    // Calculate cumulative distance
    if (index > 0) {
      const prevPoint = points[index - 1];
      const distance = haversineDistance(prevPoint.lat, prevPoint.lng, lat, lon);
      cumulativeDistance += distance;
    }

    points.push({
      lat,
      lng: lon,
      elevation,
      distance: cumulativeDistance,
    });
  });

  if (points.length === 0) {
    throw new Error('No track points found in GPX file');
  }

  // Calculate elevation stats
  const { gain, loss } = calculateElevationStats(points);

  return {
    name,
    points,
    totalDistance: cumulativeDistance,
    totalElevationGain: gain,
    totalElevationLoss: loss,
  };
}

// Parse TCX XML string to RouteData
export function parseTCX(tcxContent: string, name: string): RouteData {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(tcxContent, 'text/xml');

  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Error parsing TCX file');
  }

  // Extract track points
  const trackpoints = xmlDoc.querySelectorAll('Trackpoint');
  const points: RoutePoint[] = [];
  let cumulativeDistance = 0;

  trackpoints.forEach((trackpoint, index) => {
    const positionElement = trackpoint.querySelector('Position');
    if (!positionElement) return;

    const latElement = positionElement.querySelector('LatitudeDegrees');
    const lonElement = positionElement.querySelector('LongitudeDegrees');
    const eleElement = trackpoint.querySelector('AltitudeMeters');

    if (!latElement || !lonElement) return;

    const lat = parseFloat(latElement.textContent || '0');
    const lon = parseFloat(lonElement.textContent || '0');
    const elevation = eleElement ? parseFloat(eleElement.textContent || '0') : 0;

    // Calculate cumulative distance
    if (index > 0 && points.length > 0) {
      const prevPoint = points[points.length - 1];
      const distance = haversineDistance(prevPoint.lat, prevPoint.lng, lat, lon);
      cumulativeDistance += distance;
    }

    points.push({
      lat,
      lng: lon,
      elevation,
      distance: cumulativeDistance,
    });
  });

  if (points.length === 0) {
    throw new Error('No track points found in TCX file');
  }

  // Calculate elevation stats
  const { gain, loss } = calculateElevationStats(points);

  return {
    name,
    points,
    totalDistance: cumulativeDistance,
    totalElevationGain: gain,
    totalElevationLoss: loss,
  };
}


