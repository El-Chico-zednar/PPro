import { useState, useRef } from 'react';
import { Upload, FileText, Check, Route, X } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RouteData } from '../types/pace';
import { toast } from 'sonner@2.0.3';
import { parseGPX, parseTCX } from '../utils/gpxParser';

interface FileUploaderProps {
  onFileProcessed: (route: RouteData) => void;
  onRemoveRoute: () => void;
  isEditingStrategy?: boolean; // Nueva prop para deshabilitar cuando se edita una estrategia
  hasRouteLoaded?: boolean; // Prop para ocultar cuando ya hay una ruta cargada (por ejemplo, desde una carrera popular)
}

export function FileUploader({ onFileProcessed, onRemoveRoute, isEditingStrategy = false, hasRouteLoaded = false }: FileUploaderProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDistance, setSelectedDistance] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Distancias estándar disponibles
  const standardDistances = [
    { value: '5', label: '5K' },
    { value: '10', label: '10K' },
    { value: '15', label: '15K' },
    { value: '21.097', label: 'Media Maratón (21.097 km)' },
    { value: '42.195', label: 'Maratón (42.195 km)' },
    { value: '50', label: '50K' },
    { value: '100', label: '100K' },
  ];

  // Crear ruta virtual basada en distancia
  const createVirtualRoute = (distanceKm: number): RouteData => {
    const points = [];
    const totalPoints = Math.max(100, Math.floor(distanceKm * 10)); // Al menos 100 puntos
    
    // Crear puntos equidistantes con elevación completamente plana
    for (let i = 0; i <= totalPoints; i++) {
      const progress = i / totalPoints;
      const distance = distanceKm * 1000 * progress; // en metros
      
      // Coordenadas simuladas (centradas en Valencia, España)
      const lat = 39.4699 + (progress * 0.01);
      const lng = -0.3763 + (progress * 0.01);
      
      // Elevación completamente plana
      const elevation = 10;
      
      points.push({
        lat,
        lng,
        elevation,
        distance
      });
    }
    
    return {
      name: `Recorrido ${distanceKm}K`,
      points,
      totalDistance: distanceKm * 1000,
      totalElevationGain: 0,
      totalElevationLoss: 0,
      isVirtual: true // Marcar como ruta virtual
    };
  };

  const handleDistanceSelect = (value: string) => {
    setSelectedDistance(value);
    const distanceKm = parseFloat(value);
    const virtualRoute = createVirtualRoute(distanceKm);
    onFileProcessed(virtualRoute);
    setFileName(null); // Limpiar archivo si había uno
    toast.success(`Recorrido de ${distanceKm}K creado`);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFileName(file.name);
    setSelectedDistance(''); // Limpiar distancia seleccionada

    try {
      const text = await file.text();
      const fileExtension = file.name.toLowerCase().split('.').pop();
      
      let route: RouteData | null = null;
      
      if (fileExtension === 'gpx') {
        route = parseGPX(text, file.name.replace('.gpx', ''));
      } else if (fileExtension === 'tcx') {
        route = parseTCX(text, file.name.replace('.tcx', ''));
      } else {
        toast.error('Formato de archivo no soportado. Por favor, usa .gpx o .tcx');
      }
      
      if (route) {
        onFileProcessed(route);
        toast.success('Archivo procesado correctamente');
      }
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Error al leer el archivo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveRoute = () => {
    setFileName(null);
    setSelectedDistance('');
    onRemoveRoute();
    toast.success('Recorrido eliminado');
  };

  return (
    <>
      {!isEditingStrategy && !hasRouteLoaded && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg text-center hover:border-primary transition-colors pt-[16px] pr-[32px] pb-[12px] pl-[32px] m-[0px]">
            <input
              ref={fileInputRef}
              type="file"
              accept=".gpx,.tcx"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-3">
              {fileName ? (
                <>
                  <Check className="h-12 w-12 text-green-500" />
                  <div className="text-sm">{fileName}</div>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    Sube un recorrido
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
            <p>• Formatos soportados: .gpx y .tcx</p>
          </div>
                </>
              )}
              
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  variant="outline"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {isProcessing ? 'Procesando...' : fileName ? 'Cambiar archivo' : 'Seleccionar archivo'}
                </Button>
                
                {fileName && (
                  <Button
                    onClick={handleRemoveRoute}
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {!fileName && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase mt-[8px] mr-[0px] mb-[0px] ml-[0px]">
                  <span className="bg-background px-2 text-muted-foreground">O</span>
                </div>
              </div>

              <div className="space-y-2 mt-[0px] mr-[0px] mb-[-16px] ml-[0px]">
                <Label htmlFor="distance">Crear recorrido virtual por distancia:</Label>
                <Select
                  value={selectedDistance}
                  onValueChange={handleDistanceSelect}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona una distancia estándar" />
                  </SelectTrigger>
                  <SelectContent>
                    {standardDistances.map((distance) => (
                      <SelectItem key={distance.value} value={distance.value}>
                        <div className="flex items-center gap-2">
                          <Route className="h-4 w-4" />
                          {distance.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Crea un recorrido plano virtual.</p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}