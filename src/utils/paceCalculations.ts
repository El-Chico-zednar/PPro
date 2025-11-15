import { RouteData, PaceStrategy, PaceInterval, IntervalType, RoutePoint } from '../types/pace';

// Convert time string (HH:MM:SS) to seconds
export function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0];
}

// Convert seconds to time string (HH:MM:SS or MM:SS)
export function secondsToTime(seconds: number, includeHours: boolean = true): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (includeHours && h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Convert pace (min/km) to seconds per km
export function paceToSeconds(paceStr: string): number {
  const parts = paceStr.split(':').map(Number);
  return parts[0] * 60 + (parts[1] || 0);
}

// Convert seconds per km to pace string
export function secondsToPace(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Create intervals based on interval type
function createIntervals(route: RouteData, intervalType: IntervalType): Omit<PaceInterval, 'pace' | 'time' | 'cumulativeTime'>[] {
  const intervals: Omit<PaceInterval, 'pace' | 'time' | 'cumulativeTime'>[] = [];
  
  if (intervalType === 'km' || intervalType === 'mile') {
    const intervalDistance = intervalType === 'km' ? 1000 : 1609.34; // meters
    const numIntervals = Math.ceil(route.totalDistance / intervalDistance);
    
    for (let i = 0; i < numIntervals; i++) {
      const startDistance = i * intervalDistance;
      const endDistance = Math.min((i + 1) * intervalDistance, route.totalDistance);
      
      // Find start and end points
      const startPoint = findPointAtDistance(route.points, startDistance);
      const endPoint = findPointAtDistance(route.points, endDistance);
      
      // Calculate elevation changes
      const { gain, loss } = calculateElevationChange(route.points, startDistance, endDistance);
      
      intervals.push({
        index: i,
        startDistance,
        endDistance,
        distance: endDistance - startDistance,
        elevationGain: gain,
        elevationLoss: loss,
        startPoint,
        endPoint
      });
    }
  } else if (intervalType === 'elevation') {
    // Create segments based on significant elevation changes
    intervals.push(...createElevationBasedIntervals(route));
  }
  
  return intervals;
}

// Find point at a specific distance
function findPointAtDistance(points: RoutePoint[], targetDistance: number): RoutePoint {
  for (let i = 0; i < points.length - 1; i++) {
    if (points[i].distance <= targetDistance && points[i + 1].distance >= targetDistance) {
      // Interpolate
      const ratio = (targetDistance - points[i].distance) / (points[i + 1].distance - points[i].distance);
      return {
        lat: points[i].lat + (points[i + 1].lat - points[i].lat) * ratio,
        lng: points[i].lng + (points[i + 1].lng - points[i].lng) * ratio,
        elevation: points[i].elevation + (points[i + 1].elevation - points[i].elevation) * ratio,
        distance: targetDistance
      };
    }
  }
  return points[points.length - 1];
}

// Calculate elevation change in a distance range
function calculateElevationChange(points: RoutePoint[], startDist: number, endDist: number): { gain: number; loss: number } {
  let gain = 0;
  let loss = 0;
  
  for (let i = 1; i < points.length; i++) {
    if (points[i - 1].distance >= startDist && points[i].distance <= endDist) {
      const diff = points[i].elevation - points[i - 1].elevation;
      if (diff > 0) {
        gain += diff;
      } else {
        loss += Math.abs(diff);
      }
    }
  }
  
  return { gain, loss };
}

// Create intervals based on elevation changes
function createElevationBasedIntervals(route: RouteData): Omit<PaceInterval, 'pace' | 'time' | 'cumulativeTime'>[] {
  const intervals: Omit<PaceInterval, 'pace' | 'time' | 'cumulativeTime'>[] = [];
  const minSegmentLength = 500; // minimum 500m per segment
  
  let segmentStart = 0;
  let currentType: 'climb' | 'descent' | 'flat' = 'flat';
  
  for (let i = 1; i < route.points.length; i++) {
    const elevDiff = route.points[i].elevation - route.points[i - 1].elevation;
    const distDiff = route.points[i].distance - route.points[i - 1].distance;
    const grade = distDiff > 0 ? (elevDiff / distDiff) * 100 : 0;
    
    let newType: 'climb' | 'descent' | 'flat';
    if (grade > 2) newType = 'climb';
    else if (grade < -2) newType = 'descent';
    else newType = 'flat';
    
    // If type changed and segment is long enough, create interval
    if (newType !== currentType && route.points[i].distance - segmentStart >= minSegmentLength) {
      const startPoint = findPointAtDistance(route.points, segmentStart);
      const endPoint = route.points[i - 1];
      const { gain, loss } = calculateElevationChange(route.points, segmentStart, endPoint.distance);
      
      intervals.push({
        index: intervals.length,
        startDistance: segmentStart,
        endDistance: endPoint.distance,
        distance: endPoint.distance - segmentStart,
        elevationGain: gain,
        elevationLoss: loss,
        startPoint,
        endPoint
      });
      
      segmentStart = route.points[i - 1].distance;
      currentType = newType;
    }
  }
  
  // Add final segment
  if (route.totalDistance - segmentStart >= minSegmentLength) {
    const startPoint = findPointAtDistance(route.points, segmentStart);
    const endPoint = route.points[route.points.length - 1];
    const { gain, loss } = calculateElevationChange(route.points, segmentStart, route.totalDistance);
    
    intervals.push({
      index: intervals.length,
      startDistance: segmentStart,
      endDistance: route.totalDistance,
      distance: route.totalDistance - segmentStart,
      elevationGain: gain,
      elevationLoss: loss,
      startPoint,
      endPoint
    });
  }
  
  return intervals.length > 0 ? intervals : createIntervals(route, 'km');
}

// Calculate pace adjustment based on elevation and effort setting
function calculatePaceAdjustment(
  elevationGain: number,
  elevationLoss: number,
  distance: number,
  climbEffort: number // -50 to 50
): number {
  // Normalize climb effort: -50 = easier (slower on climbs), +50 = harder (faster on climbs)
  const effortFactor = 1 + (climbEffort / 100); // 0.5 to 1.5
  
  // Calculate grade
  const netElevation = elevationGain - elevationLoss;
  const grade = distance > 0 ? (netElevation / distance) * 100 : 0;
  
  // Pace adjustment in seconds per km based on grade
  // Roughly: 10-15 seconds per km per 1% grade on climbs, 5-8 seconds faster on descents
  let adjustment = 0;
  
  if (grade > 0) {
    // Climbing: slower
    adjustment = grade * 12 / effortFactor; // More effort = less slowdown
  } else if (grade < 0) {
    // Descending: faster
    adjustment = grade * 6 * effortFactor; // More effort = more speedup
  }
  
  return adjustment;
}

// Apply pacing strategy (negative/positive split)
function applyPacingStrategy(
  intervals: PaceInterval[],
  strategy: number, // -50 to 50 (negative to positive split)
  targetTime: number
): void {
  if (strategy === 0 || intervals.length === 0) return;
  
  const strategyFactor = strategy / 100; // -0.5 to 0.5
  
  // Calculate current total time
  let totalTime = intervals.reduce((sum, interval) => sum + interval.time, 0);
  
  // Adjust paces for each interval based on position in race
  intervals.forEach((interval, index) => {
    const progress = index / (intervals.length - 1); // 0 to 1
    
    // Negative split: start slower, finish faster
    // Positive split: start faster, finish slower
    const adjustmentFactor = strategyFactor * (progress - 0.5) * 0.4; // Max ±20% adjustment
    
    const oldPace = interval.pace;
    interval.pace = oldPace * (1 - adjustmentFactor);
    interval.time = (interval.distance / 1000) * interval.pace;
  });
  
  // Recalculate to match target time
  totalTime = intervals.reduce((sum, interval) => sum + interval.time, 0);
  const scaleFactor = targetTime / totalTime;
  
  intervals.forEach(interval => {
    interval.pace *= scaleFactor;
    interval.time *= scaleFactor;
  });
}

// Main calculation function
export function calculatePaceStrategy(
  route: RouteData,
  targetTimeStr: string,
  intervalType: IntervalType,
  pacingStrategy: number,
  climbEffort: number
): PaceStrategy {
  const targetTime = timeToSeconds(targetTimeStr);
  
  // Create intervals
  const baseIntervals = createIntervals(route, intervalType);
  
  // Calculate base pace (even pace for entire distance)
  const basePace = targetTime / (route.totalDistance / 1000); // seconds per km
  
  // Calculate pace for each interval with elevation adjustments
  const intervals: PaceInterval[] = baseIntervals.map(interval => {
    const adjustment = calculatePaceAdjustment(
      interval.elevationGain,
      interval.elevationLoss,
      interval.distance,
      climbEffort
    );
    
    const adjustedPace = basePace + adjustment;
    const time = (interval.distance / 1000) * adjustedPace;
    
    return {
      ...interval,
      pace: adjustedPace,
      time,
      cumulativeTime: 0 // Will be calculated next
    };
  });
  
  // Normalize to match target time before applying strategy
  let totalTime = intervals.reduce((sum, interval) => sum + interval.time, 0);
  const normalizationFactor = targetTime / totalTime;
  
  intervals.forEach(interval => {
    interval.pace *= normalizationFactor;
    interval.time *= normalizationFactor;
  });
  
  // Apply pacing strategy (negative/positive split)
  applyPacingStrategy(intervals, pacingStrategy, targetTime);
  
  // Calculate cumulative times
  let cumTime = 0;
  intervals.forEach(interval => {
    cumTime += interval.time;
    interval.cumulativeTime = cumTime;
  });
  
  // Calculate average pace
  const actualTotalTime = intervals.reduce((sum, interval) => sum + interval.time, 0);
  const averagePace = actualTotalTime / (route.totalDistance / 1000);
  
  return {
    intervals,
    totalTime: actualTotalTime,
    averagePace
  };
}
