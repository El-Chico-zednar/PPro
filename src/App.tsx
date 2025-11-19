import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Card } from './components/ui/card';
import { FileUploader } from './components/FileUploader';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { RouteMap } from './components/RouteMap';
import { PaceChart } from './components/PaceChart';
import { PaceTable } from './components/PaceTable';
import { HomePage, PopularRace } from './components/HomePage';
import { LandingPage } from './components/LandingPage';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';

import { calculatePaceStrategy } from './utils/paceCalculations';
import { supabase, GPX_BUCKET } from './supabase/client';
import { parseGPX, parseTCX } from './utils/gpxParser';
import { RouteData, PaceStrategy, IntervalType } from './types/pace';
import { SavedStrategy } from './types/strategy';
import { Play, Save, Home as HomeIcon, RotateCcw } from 'lucide-react';
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

type HoverPoint = {
  lat: number;
  lng: number;
  distance: number;
  elevation: number;
};

export default function App() {
  const navigate = useNavigate();
  const [currentRoute, setCurrentRoute] = useState<RouteData | null>(null);
  const [strategyName, setStrategyName] = useState('');
  const [targetTime, setTargetTime] = useState('00:45:00');
  const [intervalType, setIntervalType] = useState<IntervalType>('km');
  const [pacingStrategy, setPacingStrategy] = useState(0); // -50 to 50 (negative to positive split)
  const [climbEffort, setClimbEffort] = useState(0); // -50 to 50 (easier to harder)
  const [segmentLength, setSegmentLength] = useState(0); // -50 to 50 (shorter to longer segments)
  const [paceData, setPaceData] = useState<PaceStrategy | null>(null);
  const [savedStrategies, setSavedStrategies] = useState<SavedStrategy[]>([]);
  const [editingStrategyId, setEditingStrategyId] = useState<number | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [nameError, setNameError] = useState<string>('');
  const [loadingRaceId, setLoadingRaceId] = useState<string | number | null>(null);
  const [hoverPoint, setHoverPoint] = useState<HoverPoint | null>(null);
  
  // Estado para los parámetros originales de una estrategia cargada
  const [originalParams, setOriginalParams] = useState<{
    targetTime: string;
    intervalType: IntervalType;
    pacingStrategy: number;
    climbEffort: number;
    segmentLength: number;
  } | null>(null);

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
        if (config.segmentLength !== undefined) setSegmentLength(config.segmentLength);
      } catch (e) {
        console.error('Error loading saved config', e);
      }
    }
  }, []);

  // Calcular automáticamente cuando cambien los parámetros
  useEffect(() => {
    if (!currentRoute) {
      setPaceData(null);
      return;
    }

    const strategy = calculatePaceStrategy(
      currentRoute,
      targetTime,
      intervalType,
      pacingStrategy,
      climbEffort,
      segmentLength
    );

    setPaceData(strategy);
    
    // Save to localStorage
    localStorage.setItem('pacePro_lastConfig', JSON.stringify({
      targetTime,
      intervalType,
      pacingStrategy,
      climbEffort,
      segmentLength,
      routeName: currentRoute.name
    }));
  }, [currentRoute, targetTime, intervalType, pacingStrategy, climbEffort, segmentLength]);

  useEffect(() => {
    setHoverPoint(null);
  }, [currentRoute]);

  useEffect(() => {
    if (!paceData) {
      setHoverPoint(null);
    }
  }, [paceData]);

  const handleSaveStrategy = () => {
    if (!paceData) return;
    
    if (!strategyName.trim()) {
      setNameError('Por favor, ingresa un nombre para la estrategia');
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
      segmentLength,
      paceData
    };
    
    const updatedStrategies = [...savedStrategies, newStrategy];
    localStorage.setItem('pacePro_savedStrategies', JSON.stringify(updatedStrategies));
    setSavedStrategies(updatedStrategies);
    setEditingStrategyId(newStrategy.id);
    
    // Guardar los parámetros originales después de guardar
    setOriginalParams({
      targetTime,
      intervalType,
      pacingStrategy,
      climbEffort,
      segmentLength
    });
    
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
            segmentLength,
            paceData,
            date: new Date().toISOString() // Actualizar fecha de modificación
          }
        : s
    );
    
    localStorage.setItem('pacePro_savedStrategies', JSON.stringify(updatedStrategies));
    setSavedStrategies(updatedStrategies);
    setShowUpdateDialog(false);
    toast.success(`Estrategia \"${strategyName}\" actualizada`);
    
    // Actualizar los parámetros originales después de guardar
    setOriginalParams({
      targetTime,
      intervalType,
      pacingStrategy,
      climbEffort,
      segmentLength
    });
  };
  
  // Función para restablecer cambios
  const handleResetChanges = () => {
    if (!originalParams) return;
    
    setTargetTime(originalParams.targetTime);
    setIntervalType(originalParams.intervalType);
    setPacingStrategy(originalParams.pacingStrategy);
    setClimbEffort(originalParams.climbEffort);
    setSegmentLength(originalParams.segmentLength);
    
    toast.success('Cambios restablecidos');
  };
  
  // Verificar si hay cambios en los parámetros
  const hasParameterChanges = originalParams && (
    targetTime !== originalParams.targetTime ||
    intervalType !== originalParams.intervalType ||
    pacingStrategy !== originalParams.pacingStrategy ||
    climbEffort !== originalParams.climbEffort ||
    segmentLength !== originalParams.segmentLength
  );

  const handleSelectRace = async (race: PopularRace) => {
    const gpxPath = race.gpx_storage_path?.trim();
    if (!gpxPath) {
      toast.error('Esta carrera no tiene un GPX asignado.');
      return;
    }

    if (!supabase) {
      toast.error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para usar las carreras de Supabase.');
      return;
    }

    setLoadingRaceId(race.id);

    try {
      let fileText: string | null = null;

      if (gpxPath.startsWith('http')) {
        // URL completa
        const res = await fetch(gpxPath);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        fileText = await res.text();
      } else {
        // Ruta en Storage - Optimizado para velocidad
        // Normalizar la ruta: eliminar barras iniciales y asegurar que esté bien formateada
        let objectPath = gpxPath.replace(/^\//, '').replace(/\\/g, '/');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        
        // Estrategia optimizada: Usar URL pública primero (más rápida) con la combinación más probable
        // Bucket correcto: 'race-tracks' con prefijo 'tracks/'
        const primaryBucket = 'race-tracks';
        const primaryPath = objectPath.startsWith('tracks/') ? objectPath : `tracks/${objectPath}`;
        
        if (supabaseUrl) {
          // Intentar primero la combinación más probable (URL pública, más rápida)
          const primaryUrl = `${supabaseUrl}/storage/v1/object/public/${primaryBucket}/${encodeURIComponent(primaryPath)}`;
          try {
            const res = await fetch(primaryUrl);
            if (res.ok) {
              fileText = await res.text();
            }
          } catch {
            // Continuar con fallbacks
          }
        }
        
        // Si la URL pública no funcionó, intentar otras combinaciones en paralelo
        if (!fileText && supabaseUrl) {
          const alternatives = [
            { bucket: 'race-tracks', path: objectPath },
            { bucket: 'race-tracks', path: objectPath.replace(/^tracks\//, '') },
            { bucket: 'race_tracks', path: primaryPath },
            { bucket: 'race_tracks', path: objectPath },
          ].filter(alt => !(alt.bucket === primaryBucket && alt.path === primaryPath));
          
          // Intentar todas las alternativas en paralelo y tomar la primera que funcione
          const fetchPromises = alternatives.map(alt => 
            fetch(`${supabaseUrl}/storage/v1/object/public/${alt.bucket}/${encodeURIComponent(alt.path)}`)
              .then(res => res.ok ? res.text() : null)
              .catch(() => null)
          );
          
          const results = await Promise.all(fetchPromises);
          fileText = results.find(result => result !== null) || null;
        }
        
        // Como último recurso, usar la API de Storage (más lenta)
        if (!fileText) {
          const bucketsToTry = [primaryBucket, 'race_tracks', GPX_BUCKET].filter((b, i, arr) => arr.indexOf(b) === i);
          
          for (const bucket of bucketsToTry) {
            // Intentar con la ruta más probable primero
            const pathsToTry = objectPath.startsWith('tracks/') 
              ? [objectPath, objectPath.replace(/^tracks\//, '')]
              : [`tracks/${objectPath}`, objectPath];
            
            for (const path of pathsToTry) {
              const result = await supabase.storage.from(bucket).download(path);
              if (!result.error && result.data) {
                fileText = await result.data.text();
                break;
              }
            }
            if (fileText) break;
          }
        }
        
        if (!fileText) {
          throw new Error(`No se pudo descargar el archivo GPX. Ruta: ${objectPath}`);
        }
      }

      if (!fileText) {
        throw new Error('El archivo GPX está vacío');
      }

      const isTcx = gpxPath.toLowerCase().endsWith('.tcx');
      const route = isTcx ? parseTCX(fileText, race.name) : parseGPX(fileText, race.name);

      setCurrentRoute(route);
      setPaceData(null);
      setStrategyName(race.name || '');
      setEditingStrategyId(null);
      setOriginalParams(null);
      navigate('/race-configurator');
      toast.success(`Recorrido "${race.name}" cargado`);
    } catch (error: any) {
      console.error('Error cargando GPX de Supabase', error);
      const errorMessage = error?.message || 'Error desconocido';
      toast.error(`No se pudo cargar el GPX de la carrera: ${errorMessage}`);
    } finally {
      setLoadingRaceId(null);
      setHoverPoint(null);
    }
  };

  const handleDeleteStrategy = (id: number) => {
    const updatedStrategies = savedStrategies.filter(s => s.id !== id);
    localStorage.setItem('pacePro_savedStrategies', JSON.stringify(updatedStrategies));
    setSavedStrategies(updatedStrategies);
    toast.success('Estrategia eliminada');
  };

  const renderRaceConfigurator = () => {
    const showFileUploader = editingStrategyId === null && (!currentRoute || currentRoute.isVirtual);

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
            onClick={() => navigate('/home')}
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
                  onChange={(e) => {
                    setStrategyName(e.target.value);
                    setNameError(''); // Limpiar el error cuando el usuario escribe
                  }}
                  className="mt-1.5"
                />
                {nameError && <p className="text-sm text-destructive mt-1.5">{nameError}</p>}
              </div>
              
              {showFileUploader && (
                <div className="mb-2">
                  <FileUploader 
                    onFileProcessed={(route) => setCurrentRoute(route)}
                    onRemoveRoute={() => {
                      setCurrentRoute(null);
                      setPaceData(null);
                    }}
                    isEditingStrategy={editingStrategyId !== null}
                    hasRouteLoaded={currentRoute !== null && !currentRoute.isVirtual}
                  />
                </div>
              )}

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

              {currentRoute && (
                <ConfigurationPanel
                  targetTime={targetTime}
                  onTargetTimeChange={setTargetTime}
                  intervalType={intervalType}
                  onIntervalTypeChange={setIntervalType}
                  pacingStrategy={pacingStrategy}
                  onPacingStrategyChange={setPacingStrategy}
                  climbEffort={climbEffort}
                  onClimbEffortChange={setClimbEffort}
                  segmentLength={segmentLength}
                  onSegmentLengthChange={setSegmentLength}
                />
              )}

              {paceData && (
                <Button 
                  onClick={handleSaveStrategy}
                  variant="outline"
                  className="w-full mt-[-16px] mr-[0px] mb-[0px] ml-[0px]"
                  disabled={editingStrategyId !== null && !hasParameterChanges}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {editingStrategyId ? 'Actualizar' : 'Guardar'}
                </Button>
              )}
              
              {hasParameterChanges && (
                <Button 
                  onClick={handleResetChanges}
                  variant="outline"
                  className="w-full mt-[-16px] mr-[0px] mb-[0px] ml-[0px]"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restablecer Cambios
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
                      hoverPoint={hoverPoint}
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
                        onHoverPoint={(point) => setHoverPoint(point)}
                        onHoverEnd={() => setHoverPoint(null)}
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
                      <p>Ajustando parámetros...</p>
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
      
    </div>
  );
  };

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage
              onGetStarted={() => navigate('/home')}
              onViewDemo={() => navigate('/race-configurator')}
            />
          }
        />
        <Route
          path="/home"
          element={
            <HomePage
              onCreateNew={() => {
                setEditingStrategyId(null);
                setOriginalParams(null);
                setStrategyName('');
                setCurrentRoute(null);
                setPaceData(null);
                navigate('/race-configurator');
              }}
              onLoadStrategy={(strategy) => {
                setEditingStrategyId(strategy.id);
                setStrategyName(strategy.name || '');
                setTargetTime(strategy.targetTime || '00:45:00');
                setIntervalType(strategy.intervalType || 'km');
                setPacingStrategy(strategy.pacingStrategy || 0);
                setClimbEffort(strategy.climbEffort || 0);
                setSegmentLength(strategy.segmentLength || 0);
                setPaceData(strategy.paceData);

                if (strategy.routeData) {
                  setCurrentRoute(strategy.routeData);
                }

                navigate('/race-configurator');
                toast.success(`Estrategia "${strategy.name}" cargada`);

                setOriginalParams({
                  targetTime: strategy.targetTime || '00:45:00',
                  intervalType: strategy.intervalType || 'km',
                  pacingStrategy: strategy.pacingStrategy || 0,
                  climbEffort: strategy.climbEffort || 0,
                  segmentLength: strategy.segmentLength || 0
                });
              }}
              savedStrategies={savedStrategies}
              onDeleteStrategy={handleDeleteStrategy}
              onSelectRace={handleSelectRace}
              loadingRaceId={loadingRaceId}
            />
          }
        />
        <Route path="/race-configurator" element={renderRaceConfigurator()} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}