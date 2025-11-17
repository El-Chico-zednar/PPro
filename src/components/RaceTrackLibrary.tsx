import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { MapPin, Calendar, ArrowRight, Activity } from 'lucide-react';
import { RaceTrack, fetchRaceTracks } from '../services/raceTracks';

interface RaceTrackLibraryProps {
  onSelect: (track: RaceTrack) => Promise<void> | void;
}

export function RaceTrackLibrary({ onSelect }: RaceTrackLibraryProps) {
  const [tracks, setTracks] = useState<RaceTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadTracks() {
      try {
        setLoading(true);
        const data = await fetchRaceTracks();
        if (mounted) {
          setTracks(data);
        }
      } catch (err) {
        console.error('Error fetching tracks:', err);
        if (mounted) {
          setError('No se pudieron cargar las carreras. Intenta de nuevo más tarde.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadTracks();

    return () => {
      mounted = false;
    };
  }, []);

  const renderSkeletons = () =>
    Array.from({ length: 3 }).map((_, index) => (
      <Card key={`skeleton-${index}`} className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-10 w-full" />
      </Card>
    ));

  const renderEmptyState = () => (
    <Card className="p-8 text-center space-y-3">
      <Activity className="h-10 w-10 mx-auto text-muted-foreground" />
      <p className="text-muted-foreground">
        Aún no hay carreras disponibles. Súbelas desde Supabase añadiendo filas a la tabla{' '}
        <span className="font-semibold">race_tracks</span>.
      </p>
    </Card>
  );

  const handleSelect = async (track: RaceTrack) => {
    if (!track.gpx_storage_path) return;

    try {
      setLoadingTrackId(track.id);
      await onSelect(track);
    } catch (err) {
      console.error('Error al seleccionar la carrera', err);
    } finally {
      setLoadingTrackId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Biblioteca de Carreras</h2>
          <p className="text-sm text-muted-foreground">
            Carga directamente recorridos oficiales almacenados en Supabase.
          </p>
        </div>
        <Badge variant="secondary">{tracks.length}</Badge>
      </div>

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
          {error}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && renderSkeletons()}

        {!loading && tracks.length === 0 && renderEmptyState()}

        {tracks.map((track) => (
          <Card key={track.id} className="p-4 space-y-4 hover:border-primary/40 transition-colors">
            <div>
              <h3 className="text-lg font-semibold">{track.name}</h3>
            </div>

            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {track.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {track.location}
                </span>
              )}
              {track.event_date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(track.event_date).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {track.distance_km && (
                <Badge variant="outline">{track.distance_km.toFixed(1)} km</Badge>
              )}
              {typeof track.elevation_gain === 'number' && (
                <Badge variant="outline">+{track.elevation_gain} m</Badge>
              )}
              {track.surface && <Badge variant="secondary">{track.surface}</Badge>}
            </div>

            <Button
              className="w-full"
              onClick={() => handleSelect(track)}
              disabled={!track.gpx_storage_path || loadingTrackId === track.id}
            >
              {loadingTrackId === track.id ? 'Cargando...' : 'Cargar en el planificador'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}


