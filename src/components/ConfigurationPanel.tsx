import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { IntervalType } from '../types/pace';
import { Clock, Route, TrendingDown, TrendingUp, Mountain } from 'lucide-react';

interface ConfigurationPanelProps {
  targetTime: string;
  onTargetTimeChange: (time: string) => void;
  intervalType: IntervalType;
  onIntervalTypeChange: (type: IntervalType) => void;
  pacingStrategy: number;
  onPacingStrategyChange: (value: number) => void;
  climbEffort: number;
  onClimbEffortChange: (value: number) => void;
}

export function ConfigurationPanel({
  targetTime,
  onTargetTimeChange,
  intervalType,
  onIntervalTypeChange,
  pacingStrategy,
  onPacingStrategyChange,
  climbEffort,
  onClimbEffortChange
}: ConfigurationPanelProps) {
  return (
    <div className="space-y-6 mt-6">
      {/* Target Time */}
      <div className="space-y-2 mt-[0px] mr-[0px] mb-[24px] ml-[0px]">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Tiempo objetivo
        </Label>
        <Input
          type="text"
          value={targetTime}
          onChange={(e) => onTargetTimeChange(e.target.value)}
          placeholder="HH:MM:SS"
        />
        <p className="text-xs text-muted-foreground">Formato: HH:MM:SS o MM:SS</p>
      </div>

      {/* Interval Type */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Route className="h-4 w-4" />
          Tipo de intervalo
        </Label>
        <Select value={intervalType} onValueChange={(value) => onIntervalTypeChange(value as IntervalType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="km">Cada kilómetro</SelectItem>
            <SelectItem value="mile">Cada milla</SelectItem>
            <SelectItem value="elevation">Segmentos por altitud</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pacing Strategy */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Estrategia de ritmo
        </Label>
        <div className="px-2">
          <Slider
            value={[pacingStrategy]}
            onValueChange={(values) => onPacingStrategyChange(values[0])}
            min={-50}
            max={50}
            step={5}
            className="w-full"
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>Positive split</span>
          </div>
          <span className={pacingStrategy === 0 ? 'font-medium text-foreground' : 'text-foreground'}>
            {pacingStrategy === 0 ? 'Ritmo uniforme' : pacingStrategy > 0 ? `+${pacingStrategy}%` : `${pacingStrategy}%`}
          </span>
          <div className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            <span>Negative split</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Negative split: empiezas más lento y terminas más rápido
        </p>
      </div>

      {/* Climb Effort */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Mountain className="h-4 w-4" />
          Esfuerzo en ascenso
        </Label>
        <div className="px-2">
          <Slider
            value={[climbEffort]}
            onValueChange={(values) => onClimbEffortChange(values[0])}
            min={-50}
            max={50}
            step={5}
            className="w-full"
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>Más fácil</span>
          <span className={climbEffort === 0 ? 'font-medium text-foreground' : 'text-foreground'}>
            {climbEffort === 0 ? 'Normal' : climbEffort > 0 ? `+${climbEffort}%` : `${climbEffort}%`}
          </span>
          <span>Más difícil</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Ajusta cuánto te ralentizas en subidas y aceleras en bajadas
        </p>
      </div>
    </div>
  );
}
