import { Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { RouteData, PaceStrategy } from '../types/pace';
import { secondsToPace, secondsToTime } from '../utils/paceCalculations';

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
  const formatMinutesToPace = (minutes: number) => {
    const totalSeconds = Math.round(minutes * 60);
    const paceMinutes = Math.floor(totalSeconds / 60);
    const paceSeconds = totalSeconds % 60;
    return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`;
  };

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
      elevationLoss: interval.elevationLoss,
      lat: interval.endPoint.lat,
      lng: interval.endPoint.lng
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
    let lastPaceMinutes: number | null = null;

    return points.map((point) => {
      while (
        intervalIndex < intervals.length - 1 &&
        point.distance > intervals[intervalIndex].endDistance
      ) {
        intervalIndex++;
      }

      const currentInterval = intervals[intervalIndex];
      const paceMinutes = currentInterval ? currentInterval.pace / 60 : lastPaceMinutes;
      if (paceMinutes !== null) {
        lastPaceMinutes = paceMinutes;
      }

      const displayIntervalIndex = currentInterval
        ? currentInterval.index !== undefined
          ? currentInterval.index + 1
          : intervalIndex + 1
        : null;

      return {
        distanceNum: point.distance / 1000,
        distance: (point.distance / 1000).toFixed(2),
        lat: point.lat,
        lng: point.lng,
        elevation: point.elevation,
        pace: paceMinutes,
        paceLabel: paceMinutes !== null ? formatMinutesToPace(paceMinutes) : 'N/A',
        intervalIndex: displayIntervalIndex,
        elevationGain: currentInterval?.elevationGain ?? 0,
        elevationLoss: currentInterval?.elevationLoss ?? 0
      };
    });
  })();

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const hasIntervalInfo = data.intervalIndex !== undefined && data.intervalIndex !== null;
      const ascent = data.elevationGain ?? 0;
      const descent = data.elevationLoss ?? 0;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg min-w-[180px]" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
          <p className="text-xs text-indigo-700">
            Distancia: {data.distance} km
          </p>
          <p className="text-xs text-indigo-700">
            Altitud: {data.elevation.toFixed(0)} m
          </p>
          {hasIntervalInfo && (
            <p className="text-sm text-indigo-900 mb-1 font-semibold">
              Intervalo {data.intervalIndex}
            </p>
          )}
          <p className="text-xs text-indigo-900">
            Ritmo: {data.paceLabel} min/km
          </p>
          <p className="text-xs text-green-600">
            Ascenso: {ascent > 0 ? `+${ascent.toFixed(0)}` : `${ascent.toFixed(0)}`} m
          </p>
          <p className="text-xs text-red-600">
            Descenso: {descent > 0 ? `-${descent.toFixed(0)}` : `${(-descent).toFixed(0)}`} m
          </p>
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
    <div className="space-y-2">
      <div>

        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart
            data={combinedChartData}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            margin={{ top: 10, right: 0, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
            <XAxis
              dataKey="distanceNum"
              stroke="#6366f1"
              tick={{ fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
              ticks={Array.from({ length: Math.floor(route.totalDistance / 1000) + 1 }, (_, i) => i)}
              tickFormatter={(value) => value.toFixed(0)}
              domain={[0, 'dataMax']}
              type="number"
            />
            <YAxis
              yAxisId="elevation"
              stroke="#6366f1"
              tick={{ fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
              hide={route.isVirtual}
              width={40}
            />
            <YAxis
              yAxisId="pace"
              orientation="right"
              stroke="#111827"
              tick={{ fontSize: 11, fill: '#111827', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
              domain={['auto', 'auto']}
              tickFormatter={formatMinutesToPace}
              width={40}
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
                animationDuration={500}
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
              connectNulls
              name="Ritmo"
              animationDuration={500}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Row */}
      <div className="bg-white/50 border p-4 rounded-lg mt-4" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
        <div className="flex flex-wrap justify-between gap-4 text-center">
          <div>
            <div className="text-xs text-indigo-600 mb-1">Tiempo Total</div>
            <div className="text-indigo-900">{secondsToTime(paceData.totalTime)}</div>
          </div>
          <div>
            <div className="text-xs text-indigo-600 mb-1">Distancia Total</div>
            <div className="text-indigo-900">
              {(paceData.intervals.reduce((sum, i) => sum + i.distance, 0) / 1000).toFixed(2)} km
            </div>
          </div>
          <div>
            <div className="text-xs text-indigo-600 mb-1">Ritmo Promedio</div>
            <div className="text-indigo-900">{secondsToPace(paceData.averagePace)} /km</div>
          </div>
          <div>
            <div className="text-xs text-green-600 mb-1">Ritmo Más Rápido</div>
            <div className="text-green-900">
              {secondsToPace(Math.min(...paceData.intervals.map(i => i.pace)))} /km
            </div>
          </div>
          <div>
            <div className="text-xs text-orange-600 mb-1">Ritmo Más Lento</div>
            <div className="text-orange-900">
              {secondsToPace(Math.max(...paceData.intervals.map(i => i.pace)))} /km
            </div>
          </div>
          <div>
            <div className="text-xs text-indigo-600 mb-1">Intervalos</div>
            <div className="text-indigo-900">{paceData.intervals.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
