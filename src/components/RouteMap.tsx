import { useEffect, useRef, useState } from 'react';
import { RouteData, PaceStrategy } from '../types/pace';
import { MapPin, Navigation } from 'lucide-react';

interface RouteMapProps {
  route: RouteData;
  paceData: PaceStrategy | null;
}

export function RouteMap({ route, paceData }: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      if (!mounted || !mapContainerRef.current) return;

      // Fix Leaflet default icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Initialize map if not already initialized
      if (!mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
          attributionControl: true
        }).setView(
          [route.points[0].lat, route.points[0].lng],
          13
        );

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(mapRef.current);
        
        setIsLoading(false);
      }

      // Clear previous route and markers
      if (routeLayerRef.current) {
        mapRef.current.removeLayer(routeLayerRef.current);
      }
      markersRef.current.forEach(marker => {
        mapRef.current.removeLayer(marker);
      });
      markersRef.current = [];

      // Draw route
      const latlngs = route.points.map(p => [p.lat, p.lng] as [number, number]);
      routeLayerRef.current = L.polyline(latlngs, {
        color: '#4f46e5',
        weight: 4,
        opacity: 0.7
      }).addTo(mapRef.current);

      // Add start marker
      const startIcon = L.divIcon({
        html: '<div style="background-color: #10b981; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      const startMarker = L.marker([route.points[0].lat, route.points[0].lng], {
        icon: startIcon
      }).addTo(mapRef.current);
      startMarker.bindPopup('<strong>Salida</strong>');
      markersRef.current.push(startMarker);

      // Add finish marker
      const finishIcon = L.divIcon({
        html: '<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      const lastPoint = route.points[route.points.length - 1];
      const finishMarker = L.marker([lastPoint.lat, lastPoint.lng], {
        icon: finishIcon
      }).addTo(mapRef.current);
      finishMarker.bindPopup('<strong>Meta</strong>');
      markersRef.current.push(finishMarker);

      // Add interval markers if pace data available
      if (paceData) {
        paceData.intervals.forEach((interval, index) => {
          if (index === 0 || index === paceData.intervals.length - 1) return; // Skip start and finish
          
          const markerIcon = L.divIcon({
            html: `<div style="background-color: white; padding: 2px 6px; border-radius: 4px; border: 2px solid #6366f1; font-size: 10px; font-weight: bold; color: #4f46e5;">${index + 1}</div>`,
            className: '',
            iconSize: [30, 20],
            iconAnchor: [15, 10]
          });
          
          const marker = L.marker([interval.endPoint.lat, interval.endPoint.lng], {
            icon: markerIcon
          }).addTo(mapRef.current);
          
          markersRef.current.push(marker);
        });
      }

      // Fit bounds to show entire route
      mapRef.current.fitBounds(routeLayerRef.current.getBounds(), {
        padding: [30, 30]
      });
      
      // Force map to recalculate size
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    }).catch(err => {
      console.error('Error loading Leaflet:', err);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      // Cleanup on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [route, paceData]);

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="w-full h-[400px] rounded-lg border-2 border-indigo-100 bg-indigo-50 flex items-center justify-center">
          <div className="text-indigo-400">Cargando mapa...</div>
        </div>
      )}
      <div 
        ref={mapContainerRef}
        className={`w-full h-[400px] rounded-lg overflow-hidden border-2 border-indigo-100 ${isLoading ? 'hidden' : 'block'}`}
        style={{ zIndex: 0 }}
      />
      
      <div className="flex items-center justify-between text-sm text-indigo-600 bg-indigo-50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          <span>Salida</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
          <span>Meta</span>
        </div>
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-indigo-600" />
          <span>{(route.totalDistance / 1000).toFixed(2)} km</span>
        </div>
      </div>
    </div>
  );
}
