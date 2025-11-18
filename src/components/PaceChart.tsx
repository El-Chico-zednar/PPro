import { Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { RouteData, PaceStrategy } from '../types/pace';
import { secondsToPace } from '../utils/paceCalculations';

interface HoverPoint {
  lat: number;
  lng: number;
  distance: number;
  elevation: number;
}

interface PaceChartProps {
  paceData: PaceStrategy;
  route: RouteData;
  onHoverPoint?: (point: HoverPoint) => void;
  onHoverEnd?: () => void;
}

export function PaceChart({ paceData, route, onHoverPoint, onHoverEnd }: PaceChartProps) {
  // Data por intervalo (para métricas y referencias)
  const intervalChartData = paceData.intervals.map((interval, index) => {
    const distanceKm = interval.endDistance / 1000;
    const paceMinPerKm = interval.pace / 60;
    
    return {
      index: index + 1,
      intervalIndex: index + 1,
      distance: distanceKm.toFixed(2),
      distanceNum: distanceKm,
      pace: paceMinPerKm,
      paceLabel: secondsToPace(interval.pace),
      elevation: interval.endPoint.elevation,
      elevationGain: interval.elevationGain,
      elevationLoss: interval.elevationLoss
    };
  });

  // Data completa de altimetría proveniente del GPX
  const combinedChartData = (() => {
    if (!route.points?.length) {
      return intervalChartData;
    }

    const points = route.points;
    const intervals = paceData.intervals;
    let intervalIndex = 0;

    return points.map((point) => {
      while (
        intervalIndex < intervals.length - 1 &&
        point.distance > intervals[intervalIndex].endDistance
      ) {
        intervalIndex++;
      }

      const currentInterval = intervals[intervalIndex];
      const paceMinutes = currentInterval ? currentInterval.pace / 60 : null;

      return {
        distanceNum: point.distance / 1000,
        distance: (point.distance / 1000).toFixed(2),
        lat: point.lat,
        lng: point.lng,
        elevation: point.elevation,
        pace: paceMinutes,
        paceLabel: currentInterval ? secondsToPace(currentInterval.pace) : 'N/A',
        intervalIndex: currentInterval?.index ?? null,
        elevationGain: currentInterval?.elevationGain ?? 0,
        elevationLoss: currentInterval?.elevationLoss ?? 0
      };
    });
  })();

  const formatMinutesToPace = (minutes: number) => {
    const totalSeconds = Math.round(minutes * 60);
    const paceMinutes = Math.floor(totalSeconds / 60);
    const paceSeconds = totalSeconds % 60;
    return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const hasIntervalInfo = data.intervalIndex !== undefined && data.intervalIndex !== null;
      return (
        <div className="bg-white p-3 border-2 border-indigo-200 rounded-lg shadow-lg">
          {hasIntervalInfo && (
            <p className="text-sm text-indigo-900 mb-1">
              <strong>Intervalo {data.intervalIndex}</strong>
            </p>
          )}
          {data.distance && (
            <p className="text-xs text-indigo-700">
              Distancia: {data.distance} km
            </p>
          )}
          <p className="text-xs text-indigo-700">
            Distancia acumulada: {data.distanceNum?.toFixed(2)} km
          </p>
          <p className="text-xs text-indigo-700">
            Ritmo: {data.paceLabel} min/km
          </p>
          <p className="text-xs text-indigo-700">
            Altitud: {data.elevation.toFixed(0)} m
          </p>
          {data.elevationGain > 0 && (
            <p className="text-xs text-green-600">
              Ascenso: +{data.elevationGain.toFixed(0)} m
            </p>
          )}
          {data.elevationLoss > 0 && (
            <p className="text-xs text-red-600">
              Descenso: -{data.elevationLoss.toFixed(0)} m
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const handleMouseMove = (state: any) => {
    if (!onHoverPoint) return;
    const index = state?.activeTooltipIndex;
    if (index === undefined || index === null || index < 0) return;
    const payload = combinedChartData[index];
    if (payload?.lat === undefined || payload?.lng === undefined) return;
    onHoverPoint({
      lat: payload.lat,
      lng: payload.lng,
      distance: payload.distanceNum,
      elevation: payload.elevation
    });
  };

  const handleMouseLeave = () => {
    onHoverEnd?.();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm text-indigo-700 mb-3">Ritmo y Altitud por Distancia</h3>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart 
            data={combinedChartData}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
            <XAxis
              dataKey="distanceNum"
              stroke="#6366f1"
              tick={{ fontSize: 12 }}
              label={{ value: 'Distancia (km)', position: 'insideBottom', offset: -5, fill: '#6366f1' }}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <YAxis
              yAxisId="elevation"
              stroke="#6366f1"
              tick={{ fontSize: 12 }}
              label={{ value: 'Altitud (m)', angle: -90, position: 'insideLeft', fill: '#6366f1' }}
              hide={route.isVirtual}
            />
            <YAxis
              yAxisId="pace"
              orientation="right"
              stroke="#111827"
              tick={{ fontSize: 12, fill: '#111827' }}
              label={{ value: 'Ritmo (min/km)', angle: 90, position: 'insideRight', fill: '#111827' }}
              domain={['auto', 'auto']}
              tickFormatter={formatMinutesToPace}
            />
            <Tooltip content={<CustomTooltip />} />
            {!route.isVirtual && (
              <Area
                yAxisId="elevation"
                type="monotone"
                dataKey="elevation"
                fill="rgba(129,140,248,0.6)"
                stroke="#4f46e5"
                strokeWidth={2}
                name="Altitud"
              />
            )}
            <Line
              yAxisId="pace"
              type="stepAfter"
              dataKey="pace"
              stroke="#111827"
              strokeWidth={3}
              dot={false}
              activeDot={false}
              name="Ritmo"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="bg-indigo-50 p-3 rounded-lg">
          <div className="text-xs text-indigo-600 mb-1">Ritmo Promedio</div>
          <div className="text-indigo-900">{secondsToPace(paceData.averagePace)} /km</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-xs text-green-600 mb-1">Ritmo Más Rápido</div>
          <div className="text-green-900">
            {secondsToPace(Math.min(...paceData.intervals.map(i => i.pace)))} /km
          </div>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg">
          <div className="text-xs text-orange-600 mb-1">Ritmo Más Lento</div>
          <div className="text-orange-900">
            {secondsToPace(Math.max(...paceData.intervals.map(i => i.pace)))} /km
          </div>
        </div>
      </div>
    </div>
  );
}
