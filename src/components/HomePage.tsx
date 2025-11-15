import { Card } from './ui/card';
import { Button } from './ui/button';
import { Plus, Clock, Calendar, Trash2, Play } from 'lucide-react';
import { Badge } from './ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

interface SavedStrategy {
  id: number;
  date: string;
  name?: string;
  route: string;
  targetTime: string;
  paceData: any;
}

interface HomePageProps {
  onCreateNew: () => void;
  onLoadStrategy?: (strategy: SavedStrategy) => void;
  savedStrategies: SavedStrategy[];
  onDeleteStrategy: (id: number) => void;
}

export function HomePage({ onCreateNew, onLoadStrategy, savedStrategies, onDeleteStrategy }: HomePageProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Carreras populares (sin GPX por ahora)
  // TODO: En el futuro, implementar un CMS para gestionar carreras populares con:
  // - Crear/editar/eliminar carreras
  // - Subir archivos GPX/TCX
  // - Gestionar información de las carreras (nombre, fecha, ubicación, etc.)
  const popularRaces = [
    {
      id: 1,
      name: "Maratón de Valencia",
      distance: "42.195 km",
      location: "Valencia, España",
      date: "1 Dic 2025",
      elevation: "+50m"
    },
    {
      id: 2,
      name: "10K Valencia Trinidad Alfonso",
      distance: "10 km",
      location: "Valencia, España",
      date: "12 Ene 2026",
      elevation: "+20m"
    },
    {
      id: 3,
      name: "Behobia-San Sebastián",
      distance: "20 km",
      location: "Gipuzkoa, España",
      date: "9 Nov 2025",
      elevation: "+180m"
    },
    {
      id: 4,
      name: "Media Maratón de Madrid",
      distance: "21.097 km",
      location: "Madrid, España",
      date: "27 Abr 2025",
      elevation: "+120m"
    },
    {
      id: 5,
      name: "Carrera de la Mujer Madrid",
      distance: "6.5 km",
      location: "Madrid, España",
      date: "11 May 2025",
      elevation: "+40m"
    },
    {
      id: 6,
      name: "San Silvestre Vallecana",
      distance: "10 km",
      location: "Madrid, España",
      date: "31 Dic 2025",
      elevation: "+150m"
    }
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2">Running Pace Strategy</h1>
          <p className="text-muted-foreground">
            Planifica tu estrategia de ritmo perfecta para tu próxima carrera
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Mis Estrategias */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2>Mis Estrategias</h2>
                <Badge variant="secondary">{savedStrategies.length}</Badge>
              </div>

              <Button onClick={onCreateNew} className="w-full mb-4">
                <Plus className="mr-2 h-4 w-4" />
                Crear Nueva Estrategia
              </Button>

              {savedStrategies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No tienes estrategias guardadas</p>
                  <p className="text-xs mt-1">Crea tu primera estrategia de ritmo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedStrategies.reverse().map((strategy) => (
                    <Card key={strategy.id} className="p-4 hover:border-primary/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-sm mb-1">{strategy.name || strategy.route || 'Sin nombre'}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(strategy.date)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 mb-3">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Objetivo: {strategy.targetTime}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        {onLoadStrategy && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => onLoadStrategy(strategy)}
                          >
                            <Play className="mr-1 h-3 w-3" />
                            Ver
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar Estrategia</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estás seguro de que quieres eliminar "{strategy.name || strategy.route || 'esta estrategia'}"? Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => onDeleteStrategy(strategy.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Panel - Carreras Populares */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="mb-1">Carreras Populares</h2>
                  <p className="text-sm text-muted-foreground">
                    Próximamente podrás planificar con estos recorridos oficiales
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {popularRaces.map((race) => (
                  <Card key={race.id} className="p-4 hover:border-primary/50 transition-colors opacity-60">
                    <div>
                      <h3 className="mb-1">{race.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        {race.location}
                      </p>
                      <div className="flex items-center gap-1 mb-3">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{race.date}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          {race.distance}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {race.elevation}
                        </Badge>
                      </div>

                      <Button size="sm" variant="outline" disabled className="w-full">
                        Próximamente
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}