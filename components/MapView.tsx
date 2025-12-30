
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Entity, Relation } from '../types';
import { MapPin, Navigation, Crosshair, X, Radio, ArrowRight, ShieldAlert, Activity, GitCommit, LocateFixed } from 'lucide-react';

// Declare Leaflet global
declare const L: any;

interface MapViewProps {
  locations: Entity[];
  relations: Relation[];
  onLocationClick: (id: string) => void;
}

// 1. GEOCODING DICTIONARY (Simulating an API for the POC)
const KNOWN_LOCATIONS: Record<string, [number, number]> = {
    // --- ISRAEL ---
    "Eilat": [29.5581, 34.9482],
    "Metula": [33.2773, 35.5806],
    "Haifa": [32.7940, 34.9896],
    "Tel Aviv": [32.0853, 34.7818],
    "Jerusalem": [31.7683, 35.2137],
    "Tsfat": [32.9646, 35.4960],
    "צפת": [32.9646, 35.4960],
    "בית חולים זיו": [32.9780, 35.5050],
    "Ziv Medical Center": [32.9780, 35.5050],

    // --- WEST BANK & GAZA ---
    "Jenin": [32.4607, 35.2970],
    "Jordan Valley": [32.0167, 35.5333],
    "Allenby Bridge": [31.8903, 35.5458],
    "Gaza": [31.5, 34.4667],
    "Rafah": [31.287, 34.259],

    // --- LEBANON ---
    "Beirut": [33.8938, 35.5018],
    "Ayta ash Shab": [33.1333, 35.3333],
    "Southern Lebanon": [33.2000, 35.3000],
    "Litani River": [33.3300, 35.2500],
    "Sector West": [33.1500, 35.2000],

    // --- SYRIA & IRAQ ---
    "Damascus": [33.5138, 36.2765],
    "Al-Bukamal": [34.4536, 40.9166],
    "אל-בוכמאל": [34.4536, 40.9166],
    "Iraq": [33.2232, 43.6793],
    "Baghdad": [33.3152, 44.3661],

    // --- YEMEN & RED SEA ---
    "Sanaa": [15.3694, 44.1910],
    "Houthi Command": [15.3694, 44.1910],
    "Hodeidah": [14.7978, 42.9545],
    "Bab el-Mandeb": [12.5833, 43.3333],
    "Red Sea": [20.0000, 38.0000],

    // --- IRAN ---
    "Tehran": [35.6892, 51.3890],
    "Bandar Abbas": [27.1832, 56.2666]
};

// 2. FALLBACK GEOCODER (Hashing)
const getApproximateCoords = (name: string): [number, number] => {
    if (KNOWN_LOCATIONS[name]) return KNOWN_LOCATIONS[name];
    if (KNOWN_LOCATIONS[name.trim()]) return KNOWN_LOCATIONS[name.trim()];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const lat = 29 + (Math.abs(hash) % 800) / 100;
    const lon = 34 + (Math.abs(hash >> 3) % 1000) / 100;
    return [lat, lon];
};

function getBezierPoints(start: [number, number], end: [number, number], count = 50): [number, number][] {
    const lat1 = start[0], lng1 = start[1];
    const lat2 = end[0], lng2 = end[1];
    const midLat = (lat1 + lat2) / 2;
    const midLng = (lng1 + lng2) / 2;
    const dx = lat2 - lat1;
    const dy = lng2 - lng1;
    const curvature = 0.25;
    const offsetX = -dy * curvature;
    const offsetY = dx * curvature;
    const controlLat = midLat + offsetX;
    const controlLng = midLng + offsetY;
    
    const points: [number, number][] = [];
    for (let t = 0; t <= 1; t += 1/count) {
        const l1 = (1 - t) * (1 - t);
        const l2 = 2 * (1 - t) * t;
        const l3 = t * t;
        points.push([l1 * lat1 + l2 * controlLat + l3 * lat2, l1 * lng1 + l2 * controlLng + l3 * lng2]);
    }
    return points;
}

const MapView: React.FC<MapViewProps> = ({ locations, relations, onLocationClick }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const linesRef = useRef<any[]>([]);
  
  // New State for Hub Focus
  const [focusedLocationId, setFocusedLocationId] = useState<string | null>(null);

  // Derive connections for the explanation panel
  const activeConnections = useMemo(() => {
      if (!focusedLocationId) return [];
      return relations.filter(r => r.source === focusedLocationId || r.target === focusedLocationId);
  }, [focusedLocationId, relations]);

  // Handle clicking a marker
  const handleMarkerClick = (locName: string) => {
      if (focusedLocationId === locName) {
          // Deselect if clicking again
          setFocusedLocationId(null);
          onLocationClick(locName); // Still trigger parent nav
      } else {
          setFocusedLocationId(locName);
          onLocationClick(locName);
      }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    if (typeof L === 'undefined') return;

    const map = L.map(mapContainerRef.current, {
        center: [32.5, 39.0],
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
        minZoom: 3,
        maxZoom: 12
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    L.control.scale({ position: 'bottomright', imperial: false }).addTo(map);
    mapInstanceRef.current = map;

    return () => {
        map.remove();
        mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers & Arcs
  useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map) return;

      // Clear layers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      linesRef.current.forEach(l => l.remove());
      linesRef.current = [];

      const group = L.featureGroup();
      
      // Draw Connections (Logic: If focused, only show relevant arcs)
      relations.forEach(rel => {
          const sourceLoc = locations.find(l => l.name === rel.source || l.id === rel.source);
          const targetLoc = locations.find(l => l.name === rel.target || l.id === rel.target);
          
          if (sourceLoc && targetLoc) {
              const start = getApproximateCoords(sourceLoc.name);
              const end = getApproximateCoords(targetLoc.name);
              
              // Filter Logic
              const isRelevant = !focusedLocationId || (rel.source === focusedLocationId || rel.target === focusedLocationId);
              
              if (!isRelevant) return; // Skip drawing irrelevant lines in focus mode

              const dist = Math.sqrt(Math.pow(start[0]-end[0], 2) + Math.pow(start[1]-end[1], 2));
              if (dist < 0.1) return;

              const path = getBezierPoints(start, end);
              
              const polyline = L.polyline(path, {
                  color: focusedLocationId ? '#05DF9C' : '#334155', // Bright Green if focused, dark slate if global
                  weight: focusedLocationId ? 3 : 1,
                  opacity: focusedLocationId ? 1 : 0.4,
                  dashArray: focusedLocationId ? null : '5, 10',
                  lineCap: 'round',
                  className: focusedLocationId ? 'animate-pulse' : ''
              }).addTo(map);

              if (focusedLocationId) {
                polyline.bindTooltip(`${rel.type}`, { sticky: true, direction: 'center', className: 'bg-black text-[#05DF9C] border border-[#05DF9C]' });
              }

              linesRef.current.push(polyline);
          }
      });

      // Draw Markers
      locations.forEach(loc => {
          const [lat, lng] = getApproximateCoords(loc.name);
          const isFocused = loc.name === focusedLocationId;
          const isConnected = focusedLocationId && activeConnections.some(r => r.source === loc.name || r.target === loc.name);
          const isDimmed = focusedLocationId && !isFocused && !isConnected;

          // Icon Logic
          const color = isFocused ? '#05DF9C' : isConnected ? '#f59e0b' : '#10b981';
          const size = isFocused ? 20 : 14;
          const zIndex = isFocused ? 1000 : 100;
          
          const customIcon = L.divIcon({
              className: 'custom-div-icon',
              html: `
                <div style="
                    background-color: ${color}; 
                    width: ${size}px; 
                    height: ${size}px; 
                    border-radius: 50%; 
                    border: 2px solid ${isFocused ? '#fff' : '#064e3b'};
                    box-shadow: 0 0 ${isFocused ? '20px' : '10px'} ${color};
                    position: relative;
                    transition: all 0.3s;
                    opacity: ${isDimmed ? 0.2 : 1};
                ">
                    <div style="
                        position: absolute;
                        top: -24px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: rgba(0,0,0,0.85);
                        color: ${color};
                        font-size: 10px;
                        padding: 3px 6px;
                        border-radius: 4px;
                        white-space: nowrap;
                        font-family: monospace;
                        font-weight: bold;
                        border: 1px solid ${color}40;
                        pointer-events: none;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        z-index: 100;
                        opacity: ${isDimmed ? 0 : 1};
                    ">${loc.name}</div>
                </div>`,
              iconSize: [size, size],
              iconAnchor: [size/2, size/2]
          });

          const marker = L.marker([lat, lng], { icon: customIcon, zIndexOffset: zIndex })
            .addTo(map)
            .on('click', () => handleMarkerClick(loc.name));

          group.addLayer(marker);
          markersRef.current.push(marker);
      });

      if (!focusedLocationId && locations.length > 0) {
           // Only auto-fit if not focusing on a specific node to avoid jumping
           // map.fitBounds(group.getBounds(), { padding: [80, 80], maxZoom: 8 });
      }

  }, [locations, relations, onLocationClick, focusedLocationId, activeConnections]);

  return (
    <div className="w-full h-full relative group flex">
      {/* Leaflet Container */}
      <div className="flex-1 relative">
          <div ref={mapContainerRef} className="w-full h-full bg-[#121212] z-0" />
          
          {/* Overlay HUD */}
          <div className="absolute top-4 left-4 z-[400] bg-black/80 backdrop-blur border border-slate-700 p-3 rounded-lg text-[10px] font-mono text-emerald-400 pointer-events-none shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
                <Crosshair size={14} className="animate-spin-slow text-[#05DF9C]"/> 
                <span className="font-bold tracking-wider text-[#05DF9C]">SATELLITE FEED</span>
            </div>
            <div className="opacity-70 text-slate-400 flex justify-between gap-4"><span>MODE</span> <span>{focusedLocationId ? 'SECTOR FOCUS' : 'GLOBAL SCAN'}</span></div>
          </div>
      </div>

      {/* TACTICAL EXPLANATION PANEL (Slide-in) */}
      <div className={`
          absolute top-0 bottom-0 right-0 w-80 bg-[#121212]/95 backdrop-blur-xl border-l border-[#05DF9C]/30 z-[500] 
          transform transition-transform duration-300 ease-out shadow-2xl flex flex-col
          ${focusedLocationId ? 'translate-x-0' : 'translate-x-full'}
      `}>
          {/* Panel Header */}
          <div className="p-6 border-b border-slate-800 relative bg-black/40">
              <button onClick={() => setFocusedLocationId(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X size={16} /></button>
              <div className="flex items-center gap-2 text-[#05DF9C] mb-2 font-mono text-xs uppercase tracking-widest font-bold">
                  <LocateFixed size={14} className="animate-pulse" /> Sector Analysis
              </div>
              <h2 className="text-xl font-bold text-white">{focusedLocationId}</h2>
              <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-2">
                  <span>{activeConnections.length} ACTIVE LINKS</span>
                  <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                  <span>GEO-COORDS VERIFIED</span>
              </div>
          </div>

          {/* Connections List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeConnections.length === 0 ? (
                  <div className="text-center text-slate-600 text-xs mt-10 italic">No active vectors detected for this sector.</div>
              ) : (
                  activeConnections.map((rel, i) => {
                      const isOutgoing = rel.source === focusedLocationId;
                      const otherEntity = isOutgoing ? rel.target : rel.source;
                      
                      return (
                          <div key={i} className="bg-[#16181d] border border-slate-800 p-3 rounded-lg hover:border-[#05DF9C]/50 transition-colors group cursor-pointer" onClick={() => onLocationClick(otherEntity)}>
                              <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                      {isOutgoing ? <ArrowRight size={12} className="text-emerald-500" /> : <ArrowRight size={12} className="text-amber-500 rotate-180" />}
                                      {isOutgoing ? 'OUTBOUND TO' : 'INBOUND FROM'}
                                  </div>
                                  <div className="text-[9px] font-mono text-[#05DF9C] bg-[#05DF9C]/10 px-1.5 rounded border border-[#05DF9C]/20">
                                      CONF: {(rel.confidence * 100).toFixed(0)}%
                                  </div>
                              </div>
                              
                              <div className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                                  <Radio size={14} className="text-slate-500 group-hover:text-[#05DF9C] transition-colors" />
                                  {otherEntity}
                              </div>
                              
                              <div className="bg-black/40 p-2 rounded border border-slate-800/50 mt-2">
                                  <div className="text-[10px] text-slate-400 font-mono uppercase mb-0.5">RELATION TYPE</div>
                                  <div className="text-xs text-slate-200 font-medium capitalize flex items-center gap-1.5">
                                      <GitCommit size={12} className="text-slate-500" /> {rel.type.replace(/_/g, ' ')}
                                  </div>
                              </div>
                          </div>
                      );
                  })
              )}
          </div>
          
          <div className="p-4 border-t border-slate-800 bg-[#121212] text-[10px] text-slate-500 text-center font-mono">
              Use cursor to pan • Click node to re-center
          </div>
      </div>
    </div>
  );
};

export default MapView;