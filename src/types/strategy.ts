import { IntervalType, PaceStrategy, RouteData } from './pace';

export interface SavedStrategy {
  id: number;
  date: string;
  name?: string;
  route?: string;
  routeData?: RouteData | null;
  targetTime: string;
  intervalType: IntervalType;
  pacingStrategy: number;
  climbEffort: number;
  segmentLength: number;
  paceData: PaceStrategy;
}

