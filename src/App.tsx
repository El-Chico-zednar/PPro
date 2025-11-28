import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Card } from './components/ui/card';
import { FileUploader } from './components/FileUploader';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { RouteMap } from './components/RouteMap';
import { PaceChart } from './components/PaceChart';
import { PaceTable } from './components/PaceTable';
import { HomePage, PopularRace } from './components/HomePage';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';

import { supabase, GPX_BUCKET } from './supabase/client';
import { parseGPX, parseTCX } from './utils/gpxParser';
import { calculatePaceStrategy } from './utils/paceCalculations';
import { RouteData, PaceStrategy, IntervalType } from './types/pace';
import { Play, Save, Share2, RotateCcw } from 'lucide-react';
import { Button } from './components/ui/button';
import { toast } from 'sonner';
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
  const navigate = useNavigate();
  const [currentRoute, setCurrentRoute] = useState<RouteData | null>(null);
  const [strategyName, setStrategyName] = useState('');
  const [targetTime, setTargetTime] = useState('00:45:00');
  const [intervalType, setIntervalType] = useState<IntervalType>('km');
  const [pacingStrategy, setPacingStrategy] = useState(0); // -50 to 50 (negative to positive split)
  const [climbEffort, setClimbEffort] = useState(0); // -50 to 50 (easier to harder)
  const [segmentLength, setSegmentLength] = useState(0); // -50 to 50 (shorter to longer segments)
  const [paceData, setPaceData] = useState<PaceStrategy | null>(null);
  const [savedStrategies, setSavedStrategies] = useState<any[]>([]);
  const [editingStrategyId, setEditingStrategyId] = useState<number | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [nameError, setNameError] = useState<string>('');
  const [loadingRaceId, setLoadingRaceId] = useState<string | number | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{
    lat: number;
    lng: number;
    distance: number;
    elevation: number;
  } | null>(null);
  const [isPopularRaceLoaded, setIsPopularRaceLoaded] = useState(false);
  const [mapTileLayer, setMapTileLayer] = useState<string>('light');

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
      setIsPopularRaceLoaded(false);
      setHoverPoint(null);
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
  }, [currentRoute, paceData]);

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

    toast.success('Estrategia de ritmo calculada');
  };

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

  const handleDeleteStrategy = (id: number) => {
    const updatedStrategies = savedStrategies.filter(s => s.id !== id);
    localStorage.setItem('pacePro_savedStrategies', JSON.stringify(updatedStrategies));
    setSavedStrategies(updatedStrategies);
    toast.success('Estrategia eliminada');
  };

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
        let objectPath = gpxPath.replace(/^\//, '').replace(/\\/g, '/');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        const primaryBucket = 'race-tracks';
        const primaryPath = objectPath.startsWith('tracks/') ? objectPath : `tracks/${objectPath}`;

        if (supabaseUrl) {
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

        if (!fileText && supabaseUrl) {
          const alternatives = [
            { bucket: 'race-tracks', path: objectPath },
            { bucket: 'race-tracks', path: objectPath.replace(/^tracks\//, '') },
            { bucket: 'race_tracks', path: primaryPath },
            { bucket: 'race_tracks', path: objectPath },
          ].filter(alt => !(alt.bucket === primaryBucket && alt.path === primaryPath));

          const fetchPromises = alternatives.map(alt =>
            fetch(`${supabaseUrl}/storage/v1/object/public/${alt.bucket}/${encodeURIComponent(alt.path)}`)
              .then(res => res.ok ? res.text() : null)
              .catch(() => null)
          );

          const results = await Promise.all(fetchPromises);
          fileText = results.find(result => result !== null) || null;
        }

        if (!fileText) {
          const bucketsToTry = [primaryBucket, 'race_tracks', GPX_BUCKET].filter((b, i, arr) => arr.indexOf(b) === i);

          for (const bucket of bucketsToTry) {
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
      setIsPopularRaceLoaded(true);
      setStrategyName(race.name || '');
      setEditingStrategyId(null);
      setOriginalParams(null);
      navigate('/race-planner');
      toast.success(`Recorrido "${race.name}" cargado`);
    } catch (error: any) {
      console.error('Error cargando GPX de Supabase', error);
      const errorMessage = error?.message || 'Error desconocido';
      toast.error(`No se pudo cargar el GPX de la carrera: ${errorMessage}`);
    } finally {
      setLoadingRaceId(null);
    }
  };

  const handleShare = () => {
    if (!paceData) return;

    const shareData = {
      route: currentRoute?.name,
      targetTime,
      intervalType,
      pacingStrategy,
      climbEffort,
      segmentLength
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

  const homePageElement = (
    <HomePage
      onCreateNew={() => {
        // Reset al crear nueva estrategia
        setEditingStrategyId(null);
        setOriginalParams(null);
        setStrategyName('');
        setCurrentRoute(null);
        setPaceData(null);
        setIsPopularRaceLoaded(false);
        navigate('/race-planner');
      }}
      onLoadStrategy={(strategy) => {
        // Cargar todos los datos de la estrategia
        setEditingStrategyId(strategy.id);
        setStrategyName(strategy.name || '');
        setTargetTime(strategy.targetTime || '00:45:00');
        setIntervalType(strategy.intervalType || 'km');
        setPacingStrategy(strategy.pacingStrategy || 0);
        setClimbEffort(strategy.climbEffort || 0);
        setSegmentLength(strategy.segmentLength || 0);
        setPaceData(strategy.paceData);

        // Cargar la ruta si existe
        if (strategy.routeData) {
          setCurrentRoute(strategy.routeData);
        }
        setIsPopularRaceLoaded(false);

        navigate('/race-planner');
        toast.success(`Estrategia "${strategy.name}" cargada`);

        // Guardar los parámetros originales
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
  );

  const plannerPageElement = (
    <div className="min-h-screen h-screen bg-background overflow-hidden relative">
      {/* Mapa de fondo */}
      {currentRoute && !currentRoute.isVirtual && (
        <div className="absolute inset-0 z-0">
          <RouteMap
            route={currentRoute}
            paceData={paceData}
            hoverPoint={hoverPoint}
            mapTileLayer={mapTileLayer}
          />
        </div>
      )}

      {/* Overlay oscuro para mejorar legibilidad */}
      {currentRoute && !currentRoute.isVirtual && (
        <div className="absolute inset-0 bg-black/10 z-10 pointer-events-none"></div>
      )}

      {/* Header flotante */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/05 to-transparent p-4 md:p-6">
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="flex items-center gap-3 text-white hover:opacity-90 transition mr-40"
          >
            <svg width="250" height="53" viewBox="0 0 250 53" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M33.527 0H250L216.473 53H0L33.527 0Z" fill="#ffffff" />
            </svg>
          </button>
        </div>
      </div>

      {/* Contenedor de paneles laterales */}
      <div className="absolute inset-0 z-20 pointer-events-none flex justify-between items-start">
        {/* Panel izquierdo - Configuración */}
        <div className="w-84 max-w-88 max-h-[calc(100vh-24px)] pointer-events-auto ml-6 pt-8 flex flex-col">
          <Card className="flex flex-col h-full bg-white/50 backdrop-blur-sm overflow-hidden">
            {/* Fixed Header Section */}
            <div className="px-4 pt-4 pb-0 shrink-0">
              <div className="m-[2px]">
                <Label htmlFor="strategy-name">Nombre de la Estrategia</Label>
                <Input
                  id="strategy-name"
                  type="text"
                  placeholder="Ej: Maratón Valencia 2025"
                  value={strategyName}
                  onChange={(e) => {
                    setStrategyName(e.target.value);
                    setNameError('');
                  }}
                  className="mt-2 bg-white/50 border border-gray-300"
                />
                {nameError && <p className="text-sm text-destructive mt-1.5">{nameError}</p>}
              </div>
            </div>

            {/* Scrollable Content Section */}
            <div className="px-4 pb-4 pt-0 overflow-y-auto custom-scrollbar">
              {!isPopularRaceLoaded && (
                <div className="mb-0">
                  <FileUploader
                    onFileProcessed={(route) => {
                      setCurrentRoute(route);
                      setIsPopularRaceLoaded(false);
                    }}
                    onRemoveRoute={() => {
                      setCurrentRoute(null);
                      setPaceData(null);
                      setIsPopularRaceLoaded(false);
                    }}
                    isEditingStrategy={editingStrategyId !== null}
                  />
                </div>
              )}

              {currentRoute && (
                <div className="mb-4 bg-card rounded-lg border mt-[0px] mr-[0px] ml-[0px] p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">{currentRoute.name}</span>
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
                segmentLength={segmentLength}
                onSegmentLengthChange={setSegmentLength}
              />

              {paceData && (
                <Button
                  onClick={handleSaveStrategy}
                  variant="outline"
                  className="w-full mt-4"
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
                  className="w-full mt-0 mt-2"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restablecer Cambios
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Espacio central para ver el track */}
        <div className="flex-1"></div>

        {/* Panel derecho - Resultados */}
        <div className="w-fit min-w-96 max-w-128 h-full overflow-y-auto pointer-events-auto space-y-4 mr-6 mt-[-16px] pt-12">
          {paceData && (
            <>
              <Card className="p-4 bg-white/50 backdrop-blur-sm">
                <PaceChart
                  paceData={paceData}
                  route={currentRoute!}
                  onHoverPoint={(point) => setHoverPoint(point)}
                  onHoverEnd={() => setHoverPoint(null)}
                />
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm p-0">
                <PaceTable
                  paceData={paceData}
                  intervalType={intervalType}
                />
              </Card>
            </>
          )}

          {!paceData && currentRoute && (
            <Card className="p-12 bg-white/95 backdrop-blur-sm shadow-2xl">
              <div className="text-center text-muted-foreground">
                <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Ajustando parámetros...</p>
              </div>
            </Card>
          )}

          {!currentRoute && (
            <Card className="p-12 bg-white/95 backdrop-blur-sm">
              <div className="text-center text-muted-foreground">
                <p>Sube un archivo GPX o TCX, o selecciona una distancia para comenzar</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Map Texture Selector - Bottom Center */}
      {currentRoute && !currentRoute.isVirtual && (
        <div className="bottom-centered z-30 flex justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <Select value={mapTileLayer} onValueChange={setMapTileLayer}>
              <SelectTrigger className="w-44 h-8 text-sm bg-white/90 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                {/* <SelectItem value="dark">Oscuro</SelectItem> */}
                <SelectItem value="satellite">Satélite</SelectItem>
                <SelectItem value="terrain">Terreno</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

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

  return (
    <>
      <Routes>
        <Route path="/home" element={homePageElement} />
        <Route path="/race-planner" element={plannerPageElement} />
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
