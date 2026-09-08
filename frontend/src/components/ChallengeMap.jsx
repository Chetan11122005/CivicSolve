import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';

// Mapping table for common demo locations to realistic Indian geographic coordinates
const LOCATION_COORDINATES = {
  'rural valley': [31.1048, 77.1734],       // Himachal Pradesh / Shimla region
  'downtown': [28.6304, 77.2177],           // Connaught Place, New Delhi
  'sunnyside': [12.9716, 77.5946],          // Bengaluru
  'citywide': [19.0760, 72.8777],           // Mumbai
  'north district': [28.7041, 77.1025],     // North Delhi
  'riverside': [25.3176, 82.9739],          // Varanasi (Ganga river)
  'western province': [23.0225, 72.5714],   // Ahmedabad, Gujarat
  'industrial park': [13.0827, 80.2707],    // Chennai, Tamil Nadu
  'new delhi': [28.6139, 77.2090],
  'delhi': [28.6139, 77.2090],
  'mumbai': [19.0760, 72.8777],
  'bengaluru': [12.9716, 77.5946],
  'bangalore': [12.9716, 77.5946],
  'hyderabad': [17.3850, 78.4867],
  'chennai': [13.0827, 80.2707],
  'kolkata': [22.5726, 88.3639],
  'pune': [18.5204, 73.8567],
  'jaipur': [26.9124, 75.7873],
  'chandigarh': [30.7333, 76.7794]
};

// Deterministic fallback coordinates generator within India bounds
function getCoordinatesForLocation(locationStr, index) {
  if (!locationStr) return [20.5937, 78.9629];
  
  const cleanLoc = locationStr.toLowerCase().trim();

  // Check if string contains direct lat, lng
  const latLngMatch = cleanLoc.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
  if (latLngMatch) {
    return [parseFloat(latLngMatch[1]), parseFloat(latLngMatch[3])];
  }

  // Check matching city names
  for (const [key, coords] of Object.entries(LOCATION_COORDINATES)) {
    if (cleanLoc.includes(key)) {
      return coords;
    }
  }

  // Deterministic scatter around central India based on string hash
  let hash = 0;
  for (let i = 0; i < locationStr.length; i++) {
    hash = locationStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const latOffset = ((Math.abs(hash) % 1500) / 100) - 7.5; // -7.5 to +7.5 degrees
  const lngOffset = ((Math.abs(hash >> 3) % 1500) / 100) - 7.5;

  return [21.5 + (latOffset * 0.7), 78.5 + (lngOffset * 0.7)];
}

const CATEGORY_COLORS = {
  water: '#3B82F6',          // blue-500
  health: '#EF4444',         // red-500
  education: '#8B5CF6',      // purple-500
  infrastructure: '#F59E0B', // amber-500
  environment: '#10B981',    // emerald-500
  safety: '#DC2626',         // red-600
  other: '#6B7280'           // gray-500
};

export default function ChallengeMap({ challenges = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet Map centered on India
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [21.8, 79.5],
        zoom: 5,
        zoomControl: true,
        scrollWheelZoom: false
      });

      // High-resolution OpenStreetMap TileLayer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds();

    challenges.forEach((challenge, idx) => {
      const coords = getCoordinatesForLocation(challenge.location, idx);
      bounds.extend(coords);

      const catColor = CATEGORY_COLORS[challenge.category] || '#3B82F6';
      
      // Custom pulsing HTML Marker Pin
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
            <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: ${catColor}; opacity: 0.25; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 24px; height: 24px; border-radius: 50%; background-color: ${catColor}; border: 3px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center;">
              <div style="width: 6px; height: 6px; border-radius: 50%; background-color: #ffffff;"></div>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
      });

      const marker = L.marker(coords, { icon: customIcon }).addTo(map);

      // Popup Content Card
      const popupHtml = `
        <div style="font-family: Inter, sans-serif; min-width: 220px; max-width: 260px; padding: 2px;">
          ${challenge.image_url ? `
            <div style="width: 100%; height: 110px; border-radius: 8px; overflow: hidden; margin-bottom: 8px;">
              <img src="${challenge.image_url}" alt="${challenge.title}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          ` : ''}
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="background-color: ${catColor}15; color: ${catColor}; border: 1px solid ${catColor}40; padding: 2px 6px; border-radius: 9999px; font-size: 10px; font-weight: 700; text-transform: capitalize;">
              ${challenge.category}
            </span>
            <span style="font-size: 11px; font-weight: 600; color: #64748b;">
              📍 ${challenge.location || 'Local Area'}
            </span>
          </div>
          <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.3;">
            ${challenge.title}
          </h4>
          <p style="margin: 0 0 10px 0; font-size: 11px; color: #475569; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${challenge.description}
          </p>
          <a href="/challenge/${challenge.id}" style="display: block; width: 100%; text-align: center; background-color: #2563eb; color: #ffffff; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-decoration: none;">
            ${t('discover.viewChallenge')} Challenge →
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280, className: 'civicsolve-popup' });
      markersRef.current.push(marker);
    });

    // Auto fit bounds if multiple challenges exist
    if (challenges.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }

  }, [challenges, navigate, t]);

  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-md relative z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
