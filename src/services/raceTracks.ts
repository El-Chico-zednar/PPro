import { supabase } from '../lib/supabaseClient';

export interface RaceTrack {
  id: string;
  name: string;
  slug: string;
  location?: string;
  country?: string;
  distance_km?: number;
  elevation_gain?: number;
  description?: string;
  event_date?: string;
  surface?: string;
  gpx_storage_path: string;
  cover_image_url?: string;
}

const TABLE_NAME = 'race_tracks';
const STORAGE_BUCKET = 'race-tracks';

export async function fetchRaceTracks(): Promise<RaceTrack[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('event_date', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function downloadTrackFile(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(storagePath);

  if (error) {
    throw error;
  }

  const blob = data;
  return await blob.text();
}


