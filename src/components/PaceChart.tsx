import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { RouteData, PaceStrategy } from '../types/pace';
import { secondsToPace } from '../utils/paceCalculations';

interface PaceChartProps {
  paceData: PaceStrategy;
  route: RouteData;
}

export function PaceChart({ paceData, route }: PaceChartProps) {
  // Prepare data for chart
  const chartData = paceData.intervals.map((interval, index) => {
    const distanceKm = interval.endDistance / 1000;
    const paceMinPerKm = interval.pace / 60;
    
    return {
      index: index + 1,
      distance: distanceKm.toFixed(2),
      distanceNum: distanceKm,
      pace: paceMinPerKm,
      paceLabel: secondsToPace(interval.pace),
      elevation: interval.endPoint.elevation,
      elevationGain: interval.elevationGain,
      elevationLoss: interval.elevationLoss
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border-2 border-indigo-200 rounded-lg shadow-lg">
          <p className="text-sm text-indigo-900 mb-1">
            <strong>Intervalo {data.index}</strong>
          </p>
          <p className="text-xs text-indigo-700">
            Distancia: {data.distance} km
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

  return (
    <div className="space-y-6">
      {/* Pace Chart */}
      <div>
        <h3 className="text-sm text-indigo-700 mb-3">Ritmo por Intervalo</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
            <XAxis 
              dataKey="index" 
              stroke="#6366f1"
              tick={{ fontSize: 12 }}
              label={{ value: 'Intervalo', position: 'insideBottom', offset: -5, fill: '#6366f1' }}
            />
            <YAxis 
              stroke="#6366f1"
              tick={{ fontSize: 12 }}
              label={{ value: 'Ritmo (min/km)', angle: -90, position: 'insideLeft', fill: '#6366f1' }}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="pace" 
              stroke="#4f46e5" 
              strokeWidth={3}
              dot={{ fill: '#4f46e5', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Elevation Profile */}
      {!route.isVirtual && (
        <div>
          <h3 className="text-sm text-indigo-700 mb-3">Perfil de Altitud</h3>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
              <XAxis 
                dataKey="distanceNum" 
                stroke="#6366f1"
                tick={{ fontSize: 12 }}
                label={{ value: 'Distancia (km)', position: 'insideBottom', offset: -5, fill: '#6366f1' }}
                tickFormatter={(value) => value.toFixed(1)}
              />
              <YAxis 
                stroke="#6366f1"
                tick={{ fontSize: 12 }}
                label={{ value: 'Altitud (m)', angle: -90, position: 'insideLeft', fill: '#6366f1' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="elevation" 
                fill="#818cf8" 
                stroke="#4f46e5"
                strokeWidth={2}
              />
              <Bar 
                dataKey="elevationGain" 
                fill="#10b981" 
                opacity={0.6}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

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