import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { PaceStrategy, IntervalType } from '../types/pace';
import { secondsToPace, secondsToTime } from '../utils/paceCalculations';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PaceTableProps {
  paceData: PaceStrategy;
  intervalType: IntervalType;
}

export function PaceTable({ paceData, intervalType }: PaceTableProps) {
  const getIntervalLabel = (index: number, distance: number): string => {
    if (intervalType === 'km') {
      return `${index + 1} km`;
    } else if (intervalType === 'mile') {
      return `${index + 1} mi`;
    } else {
      return `Seg. ${index + 1}`;
    }
  };

  const getElevationIcon = (gain: number, loss: number) => {
    const net = gain - loss;
    if (net > 5) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (net < -5) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getElevationClass = (gain: number, loss: number): string => {
    const net = gain - loss;
    if (net > 5) return 'text-green-700 bg-green-50';
    if (net < -5) return 'text-red-700 bg-red-50';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-4">
      {/* Summary Row */}
      <div className="bg-indigo-100 p-4 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xs text-indigo-600 mb-1">Tiempo Total</div>
            <div className="text-indigo-900">{secondsToTime(paceData.totalTime)}</div>
          </div>
          <div>
            <div className="text-xs text-indigo-600 mb-1">Ritmo Promedio</div>
            <div className="text-indigo-900">{secondsToPace(paceData.averagePace)} /km</div>
          </div>
          <div>
            <div className="text-xs text-indigo-600 mb-1">Distancia Total</div>
            <div className="text-indigo-900">
              {(paceData.intervals.reduce((sum, i) => sum + i.distance, 0) / 1000).toFixed(2)} km
            </div>
          </div>
          <div>
            <div className="text-xs text-indigo-600 mb-1">Intervalos</div>
            <div className="text-indigo-900">{paceData.intervals.length}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-indigo-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-indigo-50">
                <TableHead className="text-indigo-900">Intervalo</TableHead>
                <TableHead className="text-indigo-900 text-right">Distancia</TableHead>
                <TableHead className="text-indigo-900 text-right">Dist. acumulada</TableHead>
                <TableHead className="text-indigo-900 text-right">Ritmo</TableHead>
                <TableHead className="text-indigo-900 text-right">Tiempo</TableHead>
                <TableHead className="text-indigo-900 text-right">Acumulado</TableHead>
                <TableHead className="text-indigo-900 text-center">Altitud</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paceData.intervals.map((interval, index) => {
                const distanceKm = interval.distance / 1000;
                const cumulativeDistanceKm = interval.endDistance / 1000;
                const netElevation = interval.elevationGain - interval.elevationLoss;
                
                return (
                  <TableRow 
                    key={index}
                    className="hover:bg-indigo-50 transition-colors"
                  >
                    <TableCell className="text-indigo-900">
                      {getIntervalLabel(index, interval.endDistance)}
                    </TableCell>
                    <TableCell className="text-right text-indigo-700">
                      {distanceKm.toFixed(2)} km
                    </TableCell>
                    <TableCell className="text-right text-indigo-900">
                      {cumulativeDistanceKm.toFixed(2)} km
                    </TableCell>
                    <TableCell className="text-right text-indigo-900">
                      {secondsToPace(interval.pace)} /km
                    </TableCell>
                    <TableCell className="text-right text-indigo-700">
                      {secondsToTime(interval.time, false)}
                    </TableCell>
                    <TableCell className="text-right text-indigo-900">
                      {secondsToTime(interval.cumulativeTime)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        {getElevationIcon(interval.elevationGain, interval.elevationLoss)}
                        <span className={`text-xs px-2 py-1 rounded ${getElevationClass(interval.elevationGain, interval.elevationLoss)}`}>
                          {netElevation > 0 ? '+' : ''}{netElevation.toFixed(0)} m
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Export/Print Button */}
      <div className="text-xs text-indigo-600 text-center pt-2">
        Usa esta tabla como guía durante tu carrera. Puedes tomar captura de pantalla o imprimirla.
      </div>
    </div>
  );
}
