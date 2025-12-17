import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { FileUploader } from './FileUploader';
import { ConfigurationPanel } from './ConfigurationPanel';
import { RouteMap } from './RouteMap';
import { PaceChart } from './PaceChart';
import { PaceTable } from './PaceTable';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RouteData, PaceStrategy, IntervalType } from '../types/pace';
import { Save, RotateCcw, Home, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Button } from './ui/button';

interface MobileRacePlannerProps {
    currentRoute: RouteData | null;
    setCurrentRoute: (route: RouteData | null) => void;
    strategyName: string;
    setStrategyName: (name: string) => void;
    targetTime: string;
    setTargetTime: (time: string) => void;
    intervalType: IntervalType;
    setIntervalType: (type: IntervalType) => void;
    pacingStrategy: number;
    setPacingStrategy: (value: number) => void;
    climbEffort: number;
    setClimbEffort: (value: number) => void;
    segmentLength: number;
    setSegmentLength: (value: number) => void;
    paceData: PaceStrategy | null;
    setPaceData: (data: PaceStrategy | null) => void;
    isPopularRaceLoaded: boolean;
    setIsPopularRaceLoaded: (loaded: boolean) => void;
    editingStrategyId: number | null;
    setEditingStrategyId: (id: number | null) => void;
    originalParams: any | null;
    setOriginalParams: (params: any) => void;
    handleSaveStrategy: () => void;
    handleResetChanges: () => void;
    hasParameterChanges: boolean | null;
    nameError: string;
    setNameError: (error: string) => void;
}

export function MobileRacePlanner({
    currentRoute,
    setCurrentRoute,
    strategyName,
    setStrategyName,
    targetTime,
    setTargetTime,
    intervalType,
    setIntervalType,
    pacingStrategy,
    setPacingStrategy,
    climbEffort,
    setClimbEffort,
    segmentLength,
    setSegmentLength,
    paceData,
    setPaceData,
    isPopularRaceLoaded,
    setIsPopularRaceLoaded,
    editingStrategyId,
    handleSaveStrategy,
    handleResetChanges,
    hasParameterChanges,
    nameError,
    setNameError,
}: MobileRacePlannerProps) {
    const navigate = useNavigate();
    const [showConfig, setShowConfig] = useState(true);
    const [showResults, setShowResults] = useState(true);
    const [mapTileLayer, setMapTileLayer] = useState<string>('light');

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white border-b">
                <div className="flex items-center justify-between p-4">
                    <button
                        type="button"
                        onClick={() => navigate('/home')}
                        className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                    >
                        <Home className="h-5 w-5" />
                        <span className="font-medium">Inicio</span>
                    </button>
                    <svg width="120" height="25" viewBox="0 0 250 53" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M33.527 0H250L216.473 53H0L33.527 0Z" fill="#000000" />
                    </svg>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Strategy Name */}
                <Card className="p-4 gap-4">
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
                    />
                    {nameError && <p className="text-sm text-destructive mt-0">{nameError}</p>}
                </Card>

                {/* Route Info */}
                {currentRoute && (
                    <Card className="p-4 gap-2">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">{currentRoute.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                            <div>Distancia: {(currentRoute.totalDistance / 1000).toFixed(2)} km</div>
                            <div>Desnivel +: {currentRoute.totalElevationGain.toFixed(0)} m</div>
                        </div>
                    </Card>
                )}

                {/* Map Section */}
                {currentRoute && !currentRoute.isVirtual && (
                    <Card className="overflow-hidden gap-0">
                        {/* Floating button to change map style */}
                        <button
                            onClick={() => {
                                const styles = ['light', 'satellite', 'terrain'];
                                const currentIndex = styles.indexOf(mapTileLayer);
                                const nextIndex = (currentIndex + 1) % styles.length;
                                setMapTileLayer(styles[nextIndex]);
                            }}
                            className="absolute top-2 right-2 bg-white hover:bg-gray-100 rounded-lg shadow-lg p-2 transition-colors z-20 mr-4 mt-2"
                            title={`Cambiar estilo (actual: ${mapTileLayer === 'light' ? 'Claro' : mapTileLayer === 'satellite' ? 'Satélite' : 'Terreno'})`}
                        >
                            <Layers className="h-5 w-5 text-gray-700" />
                        </button>
                        <div className="h-96 w-full relative z-10">
                            <RouteMap
                                route={currentRoute}
                                paceData={paceData}
                                hoverPoint={null}
                                mapTileLayer={mapTileLayer}
                            />

                        </div>
                    </Card>
                )}

                {/* File Uploader */}
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

                {/* Configuration Panel - Collapsible */}
                <Card className="overflow-hidden gap-0">
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
                    >
                        <span className="font-medium">Configuración</span>
                        {showConfig ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                    {showConfig && (
                        <div className="p-4">
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

                            {/* Action Buttons */}
                            <div className="space-y-2 mt-4">
                                {paceData && (
                                    <Button
                                        onClick={handleSaveStrategy}
                                        variant="outline"
                                        className="w-full"
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
                                        className="w-full"
                                    >
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Restablecer Cambios
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </Card>

                {/* Results - Collapsible */}
                {paceData && (
                    <Card className="overflow-hidden gap-0">
                        <button
                            onClick={() => setShowResults(!showResults)}
                            className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
                        >
                            <span className="font-medium">Resultados</span>
                            {showResults ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                        {showResults && (
                            <div className="space-y-4">
                                <div className="p-4">
                                    <PaceChart
                                        paceData={paceData}
                                        route={currentRoute!}
                                        onHoverPoint={() => { }}
                                        onHoverEnd={() => { }}
                                    />
                                </div>

                                <div>
                                    <PaceTable
                                        paceData={paceData}
                                        intervalType={intervalType}
                                    />
                                </div>
                            </div>
                        )}
                    </Card>
                )}

                {/* Empty State */}
                {!currentRoute && (
                    <Card className="p-12">
                        <div className="text-center text-muted-foreground">
                            <p>Sube un archivo GPX o TCX para comenzar</p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
