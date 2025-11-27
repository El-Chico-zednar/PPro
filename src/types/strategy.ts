import { IntervalType, PaceStrategy, RouteData } from './pace';

export interface SavedStrategy {
  id: number;
  user_id?: string;
  date: string;
  created_at?: string;
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

