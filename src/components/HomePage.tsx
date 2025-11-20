import { useEffect, useMemo, useState } from 'react';
import { Plus, Clock, Calendar, Trash2, Play } from 'lucide-react';
import { supabase } from '../supabase/client';
import { Card } from './ui/card';
import { Button } from './ui/button';
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
import { SavedStrategy } from '../types/strategy';

export interface PopularRace {
  id: number | string;
  name: string;
  distance: string;
  location: string;
  date: string;
  elevation?: string | number | null;
  gpx_storage_path?: string | null;
}

interface HomePageProps {
  onCreateNew: () => void;
  onLoadStrategy?: (strategy: SavedStrategy) => void;
  savedStrategies: SavedStrategy[];
  onDeleteStrategy: (id: number) => void;
  onSelectRace?: (race: PopularRace) => void;
  loadingRaceId?: string | number | null;
}

export function HomePage({ onCreateNew, onLoadStrategy, savedStrategies, onDeleteStrategy, onSelectRace, loadingRaceId }: HomePageProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const [popularRaces, setPopularRaces] = useState<PopularRace[]>([]);
  const [racesError, setRacesError] = useState<string | null>(null);
  const [isLoadingRaces, setIsLoadingRaces] = useState(false);

  useEffect(() => {
    const loadRaces = async () => {
      if (!supabase) {
        setRacesError('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para cargar las carreras desde Supabase.');
        return;
      }

      setIsLoadingRaces(true);
      const { data, error } = await supabase
        .from('race_tracks')
        .select('id, name, distance_km, elevation_gain, location, event_date, gpx_storage_path')
        .order('event_date', { ascending: true });

      if (error) {
        console.error('Error cargando carreras populares:', error);
        setRacesError('No se pudieron cargar las carreras populares desde Supabase.');
        setIsLoadingRaces(false);
        return;
      }

      if (data && data.length > 0) {
        setPopularRaces(
          data.map((race) => ({
            ...race,
            name: race.name || 'Sin nombre',
            distance: race.distance_km ? `${race.distance_km} km` : 'Sin distancia',
            elevation: race.elevation_gain !== null && race.elevation_gain !== undefined ? `+${race.elevation_gain}m` : 'Sin desnivel',
            location: race.location || 'Sin ubicación',
            date: race.event_date ? formatDate(race.event_date) : 'Sin fecha',
          }))
        );
      }
      setIsLoadingRaces(false);
    };

    loadRaces();
  }, []);

  const strategiesForList = useMemo(() => [...savedStrategies].reverse(), [savedStrategies]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2">PacePro Running Planner</h1>
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
                  {strategiesForList.map((strategy) => (
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
                  <Card key={race.id} className="p-4 hover:border-primary/50 transition-colors">
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

                      <Button
                        size="sm"
                        className="w-full"
                        disabled={isLoadingRaces || !onSelectRace}
                        onClick={() => onSelectRace?.(race)}
                      >
                        {loadingRaceId === race.id ? 'Cargando GPX...' : 'Cargar en el planificador'}
                      </Button>
                    </div>
                  </Card>
                ))}

                {racesError && (
                  <Card className="p-4 border-dashed border-secondary text-sm text-muted-foreground">
                    {racesError}
                  </Card>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
