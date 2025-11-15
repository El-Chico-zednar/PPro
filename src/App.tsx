import { useState, useEffect } from 'react';
import { Card } from './components/ui/card';
import { FileUploader } from './components/FileUploader';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { RouteMap } from './components/RouteMap';
import { PaceChart } from './components/PaceChart';
import { PaceTable } from './components/PaceTable';
import { HomePage } from './components/HomePage';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';

import { calculatePaceStrategy } from './utils/paceCalculations';
import { RouteData, PaceStrategy, IntervalType } from './types/pace';
import { Play, Save, Share2, Home as HomeIcon } from 'lucide-react';
import { Button } from './components/ui/button';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './components/ui/alert-dialog';

export default function App() {
  const [viewMode, setViewMode] = useState<'home' | 'planner'>('home');
  const [currentRoute, setCurrentRoute] = useState<RouteData | null>(null);
  const [strategyName, setStrategyName] = useState('');
  const [targetTime, setTargetTime] = useState('00:45:00');
  const [intervalType, setIntervalType] = useState<IntervalType>('km');
  const [pacingStrategy, setPacingStrategy] = useState(0); // -50 to 50 (negative to positive split)
  const [climbEffort, setClimbEffort] = useState(0); // -50 to 50 (easier to harder)
  const [paceData, setPaceData] = useState<PaceStrategy | null>(null);
  const [savedStrategies, setSavedStrategies] = useState<any[]>([]);
  const [editingStrategyId, setEditingStrategyId] = useState<number | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  useEffect(() => {
    // Load saved strategies from localStorage
    const strategies = JSON.parse(localStorage.getItem('pacePro_savedStrategies') || '[]');
    setSavedStrategies(strategies);

    // Load from localStorage on mount
    const saved = localStorage.getItem('pacePro_lastConfig');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.targetTime) setTargetTime(config.targetTime);
        if (config.intervalType) setIntervalType(config.intervalType);
        if (config.pacingStrategy !== undefined) setPacingStrategy(config.pacingStrategy);
        if (config.climbEffort !== undefined) setClimbEffort(config.climbEffort);
      } catch (e) {
        console.error('Error loading saved config', e);
      }
    }
  }, []);

  const handleCalculate = () => {
    if (!currentRoute) {
      toast.error('Por favor, sube un archivo GPX o TCX');
      return;
    }

    const strategy = calculatePaceStrategy(
      currentRoute,
      targetTime,
      intervalType,
      pacingStrategy,
      climbEffort
    );

    setPaceData(strategy);
    
    // Save to localStorage
    localStorage.setItem('pacePro_lastConfig', JSON.stringify({
      targetTime,
      intervalType,
      pacingStrategy,
      climbEffort,
      routeName: currentRoute.name
    }));

    toast.success('Estrategia de ritmo calculada');
  };

  const handleSaveStrategy = () => {
    if (!paceData) return;
    
    if (!strategyName.trim()) {
      toast.error('Por favor, ingresa un nombre para la estrategia');
      return;
    }
    
    // Si estamos editando, mostrar el diálogo de confirmación
    if (editingStrategyId) {
      setShowUpdateDialog(true);
      return;
    }
    
    // Si es nueva, guardar directamente
    const newStrategy = {
      id: Date.now(),
      date: new Date().toISOString(),
      name: strategyName,
      route: currentRoute?.name,
      routeData: currentRoute,
      targetTime,
      intervalType,
      pacingStrategy,
      climbEffort,
      paceData
    };
    
    const updatedStrategies = [...savedStrategies, newStrategy];
    localStorage.setItem('pacePro_savedStrategies', JSON.stringify(updatedStrategies));
    setSavedStrategies(updatedStrategies);
    setEditingStrategyId(newStrategy.id);
    toast.success(`Estrategia "${strategyName}" guardada`);
  };

  const handleUpdateStrategy = () => {
    if (!paceData || !editingStrategyId) return;
    
    const updatedStrategies = savedStrategies.map(s => 
      s.id === editingStrategyId 
        ? {
            ...s,
            name: strategyName,
            route: currentRoute?.name,
            routeData: currentRoute,
            targetTime,
            intervalType,
            pacingStrategy,
            climbEffort,
            paceData,
            date: new Date().toISOString() // Actualizar fecha de modificación
          }
        : s
    );
    
    localStorage.setItem('pacePro_savedStrategies', JSON.stringify(updatedStrategies));
    setSavedStrategies(updatedStrategies);
    setShowUpdateDialog(false);
    toast.success(`Estrategia "${strategyName}" actualizada`);
  };

  const handleDeleteStrategy = (id: number) => {
    const updatedStrategies = savedStrategies.filter(s => s.id !== id);
    localStorage.setItem('pacePro_savedStrategies', JSON.stringify(updatedStrategies));
    setSavedStrategies(updatedStrategies);
    toast.success('Estrategia eliminada');
  };

  const handleShare = () => {
    if (!paceData) return;
    
    const shareData = {
      route: currentRoute?.name,
      targetTime,
      intervalType,
      pacingStrategy,
      climbEffort
    };
    const encoded = btoa(JSON.stringify(shareData));
    const url = `${window.location.origin}${window.location.pathname}?plan=${encoded}`;
    
    // Fallback copy method that works even when Clipboard API is blocked
    const copyToClipboard = (text: string) => {
      // Try modern API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => {
            toast.success('Enlace copiado al portapapeles');
          })
          .catch(() => {
            // If modern API fails, use fallback
            fallbackCopy(text);
          });
      } else {
        // Use fallback if modern API not available
        fallbackCopy(text);
      }
    };
    
    const fallbackCopy = (text: string) => {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        toast.success('Enlace copiado al portapapeles');
      } catch (err) {
        console.error('Error al copiar:', err);
        toast.error('No se pudo copiar. Enlace: ' + text);
      }
      
      document.body.removeChild(textArea);
    };
    
    copyToClipboard(url);
  };

  // Show HomePage or Planner based on viewMode
  if (viewMode === 'home') {
    return (
      <HomePage 
        onCreateNew={() => {
          // Reset al crear nueva estrategia
          setEditingStrategyId(null);
          setStrategyName('');
          setCurrentRoute(null);
          setPaceData(null);
          setViewMode('planner');
        }}
        onLoadStrategy={(strategy) => {
          // Cargar todos los datos de la estrategia
          setEditingStrategyId(strategy.id);
          setStrategyName(strategy.name || '');
          setTargetTime(strategy.targetTime || '00:45:00');
          setIntervalType(strategy.intervalType || 'km');
          setPacingStrategy(strategy.pacingStrategy || 0);
          setClimbEffort(strategy.climbEffort || 0);
          setPaceData(strategy.paceData);
          
          // Cargar la ruta si existe
          if (strategy.routeData) {
            setCurrentRoute(strategy.routeData);
          }
          
          setViewMode('planner');
          toast.success(`Estrategia "${strategy.name}" cargada`);
        }}
        savedStrategies={savedStrategies}
        onDeleteStrategy={handleDeleteStrategy}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2">PacePro Running Planner</h1>
            <p className="text-muted-foreground">Planifica tu estrategia de ritmo perfecta para tu próxima carrera</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setViewMode('home')}
          >
            <HomeIcon className="mr-2 h-4 w-4" />
            Inicio
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              
              <div className="m-[0px]">
                <Label htmlFor="strategy-name">Nombre de la Estrategia</Label>
                <Input
                  id="strategy-name"
                  type="text"
                  placeholder="Ej: Maratón Valencia 2025"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              
              <div className="mb-2">
      
                <FileUploader 
                  onFileProcessed={(route) => setCurrentRoute(route)}
                />
              </div>

              {currentRoute && (
                <div className="mb-[-16px] bg-muted rounded-lg border mt-[0px] mr-[0px] ml-[0px] p-[16px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{currentRoute.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Distancia: {(currentRoute.totalDistance / 1000).toFixed(2)} km</div>
                    <div>Desnivel +: {currentRoute.totalElevationGain.toFixed(0)} m</div>
                  </div>
                </div>
              )}

              <ConfigurationPanel
                targetTime={targetTime}
                onTargetTimeChange={setTargetTime}
                intervalType={intervalType}
                onIntervalTypeChange={setIntervalType}
                pacingStrategy={pacingStrategy}
                onPacingStrategyChange={setPacingStrategy}
                climbEffort={climbEffort}
                onClimbEffortChange={setClimbEffort}
              />

              <Button 
                onClick={handleCalculate}
                className="w-full mt-[8px] mr-[0px] mb-[0px] ml-[0px]"
                disabled={!currentRoute}
              >
                <Play className="mr-2 h-4 w-4" />
                Calcular Estrategia
              </Button>

              {paceData && (
                <Button 
                  onClick={handleSaveStrategy}
                  variant="outline"
                  className="w-full mt-[-16px] mr-[0px] mb-[0px] ml-[0px]"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {editingStrategyId ? 'Actualizar' : 'Guardar'}
                </Button>
              )}
            </Card>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-2 space-y-6">
            {currentRoute && (
              <>
                {/* Solo mostrar el mapa si NO es una ruta virtual */}
                {!currentRoute.isVirtual && (
                  <Card className="p-6">
                    <h2 className="mb-4">Mapa del Recorrido</h2>
                    <RouteMap 
                      route={currentRoute}
                      paceData={paceData}
                    />
                  </Card>
                )}

                {paceData && (
                  <>
                    <Card className="p-6">
                      <h2 className="mb-4">Perfil de Ritmo y Altitud</h2>
                      <PaceChart 
                        paceData={paceData}
                        route={currentRoute}
                      />
                    </Card>

                    <Card className="p-6">
                      <h2 className="mb-4">Tabla de Ritmos</h2>
                      <PaceTable 
                        paceData={paceData}
                        intervalType={intervalType}
                      />
                    </Card>
                  </>
                )}

                {!paceData && (
                  <Card className="p-12">
                    <div className="text-center text-muted-foreground">
                      <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>Configura los parámetros y haz clic en "Calcular Estrategia" para ver tu plan de ritmo personalizado</p>
                    </div>
                  </Card>
                )}
              </>
            )}

            {!currentRoute && (
              <Card className="p-12">
                <div className="text-center text-muted-foreground">
                  <p>Sube un archivo GPX o TCX, o selecciona una distancia para comenzar</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal de confirmación para actualizar estrategia */}
      <AlertDialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Actualizar Estrategia</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres actualizar la estrategia "{strategyName}"? Los cambios reemplazarán la estrategia guardada anteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateStrategy}>
              Actualizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Toaster />
    </div>
  );
}