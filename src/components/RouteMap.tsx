import { useEffect, useRef, useState } from 'react';
import { RouteData, PaceStrategy } from '../types/pace';

interface HoverPoint {
  lat: number;
  lng: number;
  distance: number;
  elevation: number;
}

interface RouteMapProps {
  route: RouteData;
  paceData: PaceStrategy | null;
  hoverPoint?: HoverPoint | null;
  mapTileLayer?: string;
}

export function RouteMap({ route, paceData, hoverPoint, mapTileLayer = 'light' }: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const hoverMarkerRef = useRef<any>(null);
  const intervalMarkersRef = useRef<any[]>([]);
  const tileLayerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leafletReady, setLeafletReady] = useState(false);

  const tileLayerConfigs: Record<string, { url: string; attribution: string; options?: Record<string, any> }> = {
    light: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      options: { subdomains: 'abcd', maxZoom: 19, minZoom: 1, crossOrigin: true }
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      options: { subdomains: 'abcd', maxZoom: 19, minZoom: 1, crossOrigin: true }
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri',
      options: {}
    },
    terrain: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: 'Map data &copy; OpenStreetMap contributors, SRTM | Map style &copy; OpenTopoMap',
      options: { maxZoom: 17 }
    }
  };

  const updateIntervalMarkerVisibility = () => {
    if (!mapRef.current) return;

    const zoom = mapRef.current.getZoom();
    let step = 1;

    if (zoom < 11) {
      step = 6;
    } else if (zoom < 13) {
      step = 4;
    } else if (zoom < 15) {
      step = 2;
    }

    intervalMarkersRef.current.forEach((marker: any, index: number) => {
      const el = marker.getElement();
      if (!el) return;
      el.style.display = index % step === 0 ? 'block' : 'none';
    });
  };

  // Load Leaflet CSS and library
  useEffect(() => {
    let mounted = true;

    // Load Leaflet CSS first
    const loadCSS = () => {
      return new Promise<void>((resolve) => {
        if (document.querySelector('link[href*="leaflet.css"]')) {
          resolve();
          return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';

        link.onload = () => resolve();
        link.onerror = () => resolve(); // Continue even if CSS fails

        document.head.appendChild(link);

        // Fallback timeout
        setTimeout(() => resolve(), 1000);
      });
    };

    // Load CSS then Leaflet library
    loadCSS().then(() => {
      if (!mounted) return;

      // Wait a bit for CSS to be fully applied
      return new Promise(resolve => setTimeout(resolve, 100));
    }).then(() => {
      if (!mounted) return;
      return import('leaflet');
    }).then((LeafletModule) => {
      if (!mounted || !mapContainerRef.current) return;

      // Fix Leaflet default icon issue
      delete (LeafletModule.Icon.Default.prototype as any)._getIconUrl;
      LeafletModule.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Store Leaflet module globally for access
      (window as any).L = LeafletModule;

      setLeafletReady(true);
      setIsLoading(false);
    }).catch(err => {
      console.error('Error loading Leaflet:', err);
      if (mounted) {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Initialize map when Leaflet is ready
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    try {
      // Create map instance
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        attributionControl: true,
        preferCanvas: false
      });

      // Set initial view
      map.setView(
        [route.points[0].lat, route.points[0].lng],
        13
      );

      const config = tileLayerConfigs[mapTileLayer] || tileLayerConfigs.light;
      tileLayerRef.current = L.tileLayer(config.url, {
        attribution: config.attribution,
        ...(config.options || {})
      }).addTo(map);
      mapRef.current = map;

      // Force map to invalidate size after a short delay
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 200);
    } catch (err) {
      console.error('Error initializing map:', err);
    }
  }, [leafletReady, route.points]);

  // Update tile layer when tileLayer changes
  useEffect(() => {
    if (!mapRef.current || !leafletReady) return;

    const L = (window as any).L;
    if (!L) return;

    const config = tileLayerConfigs[mapTileLayer] || tileLayerConfigs.light;

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      ...(config.options || {})
    }).addTo(mapRef.current);
  }, [mapTileLayer, leafletReady]);

  // Update route and markers when data changes
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    // Clear previous route and markers
    if (routeLayerRef.current) {
      mapRef.current.removeLayer(routeLayerRef.current);
    }
    markersRef.current.forEach(marker => {
      mapRef.current.removeLayer(marker);
    });
    markersRef.current = [];
    intervalMarkersRef.current = [];
    if (hoverMarkerRef.current) {
      mapRef.current.removeLayer(hoverMarkerRef.current);
      hoverMarkerRef.current = null;
    }

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
        if (index === paceData.intervals.length - 1) return; // Skip finish (already shown)

        const markerIcon = L.divIcon({
          html: `<div style="background-color: white; padding: 2px 6px 2px 4px; border-radius: 4px; border: 2px solid #6366f1; font-size: 10px; font-weight: bold; color: #4f46e5;">${index + 1}</div>`,
          className: '',
          iconSize: [30, 20],
          iconAnchor: [15, 10]
        });

        const marker = L.marker([interval.endPoint.lat, interval.endPoint.lng], {
          icon: markerIcon
        }).addTo(mapRef.current);

        markersRef.current.push(marker);
        intervalMarkersRef.current.push(marker);
      });
    }

    // Fit bounds to show entire route
    if (routeLayerRef.current) {
      mapRef.current.fitBounds(routeLayerRef.current.getBounds(), {
        padding: [30, 30]
      });
    }

    // Force map to recalculate size
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);

    updateIntervalMarkerVisibility();
  }, [leafletReady, route, paceData]);

  useEffect(() => {
    if (!mapRef.current) return;

    const handler = () => updateIntervalMarkerVisibility();
    mapRef.current.on('zoomend', handler);

    return () => {
      if (mapRef.current) {
        mapRef.current.off('zoomend', handler);
      }
    };
  }, [leafletReady]);

  useEffect(() => {
    const L = (window as any).L;
    if (!mapRef.current || !L) return;

    if (!hoverPoint) {
      if (hoverMarkerRef.current) {
        mapRef.current.removeLayer(hoverMarkerRef.current);
        hoverMarkerRef.current = null;
      }
      return;
    }

    const latlng: [number, number] = [hoverPoint.lat, hoverPoint.lng];

    if (!hoverMarkerRef.current) {
      const icon = L.divIcon({
        html: '<div style="width: 18px; height: 18px; border-radius: 50%; border: 3px solid #0f172a; background: rgba(79,70,229,0.9); box-shadow: 0 2px 8px rgba(15,23,42,0.4);"></div>',
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      hoverMarkerRef.current = L.marker(latlng, { icon, interactive: false }).addTo(mapRef.current);
    } else {
      hoverMarkerRef.current.setLatLng(latlng);
    }
  }, [hoverPoint]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      hoverMarkerRef.current = null;
    };
  }, []);

  return (
    <div className="w-full h-full">
      {isLoading && (
        <div className="w-full h-full bg-indigo-50 flex items-center justify-center">
          <div className="text-indigo-400">Cargando mapa...</div>
        </div>
      )}
      <div
        ref={mapContainerRef}
        className={`w-full h-full ${isLoading ? 'hidden' : 'block'}`}
        style={{ minHeight: '100%', height: '100%', width: '100%' }}
        id="route-map"
      />
    </div>
  );
}
