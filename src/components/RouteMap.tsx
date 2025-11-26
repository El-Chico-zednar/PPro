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
}

export function RouteMap({ route, paceData, hoverPoint }: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const hoverMarkerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leafletReady, setLeafletReady] = useState(false);

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
      if (!LeafletModule || !mounted || !mapContainerRef.current) return;

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
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true,
        preferCanvas: false
      });

      // Set initial view
      map.setView(
        [route.points[0].lat, route.points[0].lng],
        13
      );

      // Define layers
      const light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        minZoom: 1,
        crossOrigin: true
      });

      const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        minZoom: 1,
        crossOrigin: true
      });

      const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      });

      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });

      // Add default
      light.addTo(map);

      // Add control
      const baseMaps = {
        "Claro": light,
        "Oscuro": dark,
        "Satélite": satellite,
        "Estándar": osm
      };

      L.control.layers(baseMaps).addTo(map);

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
        if (index === paceData.intervals.length - 1) return; // Skip finish marker (already shown)

        const digits = (index + 1).toString().length;
        const width = digits === 1 ? 20 : 30;
        const markerIcon = L.divIcon({
          html: `<div style="background-color: white; padding: 2px 4px; border-radius: 4px; border: 2px solid #6366f1; font-size: 10px; font-weight: bold; color: #4f46e5; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; min-width: ${width - 8}px; text-align: center; display: inline-block;">${index + 1}</div>`,
          className: '',
          iconSize: [width, 20],
          iconAnchor: [width / 2, 10]
        });

        const marker = L.marker([interval.endPoint.lat, interval.endPoint.lng], {
          icon: markerIcon
        }).addTo(mapRef.current);

        markersRef.current.push(marker);
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
  }, [leafletReady, route, paceData]);

  // Handle zoom levels for marker visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !paceData) return;

    const updateMarkers = () => {
      const zoom = map.getZoom();
      const markers = markersRef.current;

      // Start and Finish markers are always visible (indices 0 and 1)
      // Interval markers start at index 2
      const intervalMarkers = markers.slice(2);

      let step = 1;
      if (zoom < 13) step = 5;
      else if (zoom < 15) step = 2;

      intervalMarkers.forEach((marker, index) => {
        // Interval numbers are 1-based (index + 1)
        const intervalNumber = index + 1;
        const shouldShow = intervalNumber % step === 0;

        if (shouldShow) {
          if (!map.hasLayer(marker)) map.addLayer(marker);
        } else {
          if (map.hasLayer(marker)) map.removeLayer(marker);
        }
      });
    };

    map.on('zoomend', updateMarkers);
    // Initial update
    updateMarkers();

    return () => {
      map.off('zoomend', updateMarkers);
    };
  }, [leafletReady, paceData]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    if (hoverPoint) {
      const latlng: [number, number] = [hoverPoint.lat, hoverPoint.lng];
      if (!hoverMarkerRef.current) {
        const hoverIcon = L.divIcon({
          html: `
            <div style="
              width: 22px;
              height: 22px;
              border-radius: 50%;
              border: 3px solid #f59e0b;
              background-color: rgba(249, 115, 22, 0.85);
              box-shadow: 0 0 0 6px rgba(249, 115, 22, 0.25);
            "></div>`,
          className: '',
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        hoverMarkerRef.current = L.marker(latlng, { icon: hoverIcon }).addTo(mapRef.current);
        hoverMarkerRef.current.setZIndexOffset?.(1000);
      } else {
        hoverMarkerRef.current.setLatLng(latlng);
        hoverMarkerRef.current.setZIndexOffset?.(1000);
      }
    } else if (hoverMarkerRef.current) {
      mapRef.current.removeLayer(hoverMarkerRef.current);
      hoverMarkerRef.current = null;
    }
  }, [hoverPoint]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(hoverMarkerRef.current);
        hoverMarkerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-4 relative">
      {isLoading && (
        <div className="w-full h-[400px] rounded-xl border bg-indigo-50 flex items-center justify-center">
          <div className="text-indigo-400">Cargando mapa...</div>
        </div>
      )}

      <style>
        {`
          .leaflet-control-layers-toggle {
            width: 30px !important;
            height: 30px !important;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%234b5563' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolygon points='3 6 9 3 15 6 21 3 21 21 15 18 9 21 3 18 3 6' /%3E%3Cline x1='9' y1='3' x2='9' y2='21' /%3E%3Cline x1='15' y1='6' x2='15' y2='18' /%3E%3C/svg%3E") !important;
            background-size: 18px 18px !important;
            background-color: white;
            border-radius: 4px;
          }
          .leaflet-touch .leaflet-control-layers-toggle {
            width: 30px !important;
            height: 30px !important;
            background-size: 18px 18px !important;
          }
          /* Ensure map stays below modals */
          .leaflet-container {
            z-index: 1 !important;
          }
          .leaflet-pane {
            z-index: auto !important;
          }
          .leaflet-tile-pane {
            z-index: 200 !important;
          }
          .leaflet-overlay-pane {
            z-index: 400 !important;
          }
          .leaflet-shadow-pane {
            z-index: 500 !important;
          }
          .leaflet-marker-pane {
            z-index: 600 !important;
          }
          .leaflet-tooltip-pane {
            z-index: 650 !important;
          }
          .leaflet-popup-pane {
            z-index: 700 !important;
          }
        `}
      </style>

      <div className={`relative w-full h-[400px] ${isLoading ? 'hidden' : ''}`}>
        <div
          ref={mapContainerRef}
          className={`w-full h-full rounded-xl ${isLoading ? 'hidden' : 'block'}`}
          style={{ minHeight: '400px', height: '400px', width: '100%' }}
          id="route-map"
        />


      </div>
    </div>
  );
}
