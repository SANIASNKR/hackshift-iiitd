import { useEffect, useRef, useState } from 'react';
import { Crosshair, MapPin, Navigation, Pause, Play, Radio, Route, TriangleAlert, ExternalLink, Compass } from 'lucide-react';
import { AmbulanceLocation, OpenRouteData, api, post, pretty } from '../lib/api';

type Props = {
  caseId: string;
  canTrack: boolean;
  location: AmbulanceLocation | null;
  onUpdated: () => void;
};

function mapUrl(location: AmbulanceLocation) {
  const delta = 0.012;
  const left = location.longitude - delta;
  const right = location.longitude + delta;
  const bottom = location.latitude - delta;
  const top = location.latitude + delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`;
}

export default function AmbulanceTracker({ caseId, canTrack, location, onUpdated }: Props) {
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState('Location sharing is off.');
  const [error, setError] = useState('');
  const [routeData, setRouteData] = useState<OpenRouteData | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  // Fetch Open Route API data for this case
  useEffect(() => {
    if (!caseId) return;
    setLoadingRoute(true);
    api<OpenRouteData>(`/cases/${caseId}/open-route`)
      .then(data => {
        setRouteData(data);
        setLoadingRoute(false);
      })
      .catch(() => {
        setLoadingRoute(false);
      });
  }, [caseId, location?.reported_at]);

  const stop = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setTracking(false);
    setStatus('Location sharing paused.');
  };

  const send = async (position: GeolocationPosition) => {
    // Keep GPS traffic bounded while still providing genuinely live operational updates.
    if (Date.now() - lastSent.current < 8000) return;
    lastSent.current = Date.now();
    const c = position.coords;
    try {
      await post(`/cases/${caseId}/ambulance-location`, {
        latitude: c.latitude,
        longitude: c.longitude,
        accuracy_meters: c.accuracy,
        speed_mps: c.speed === null ? null : c.speed,
        heading_degrees: c.heading === null ? null : c.heading,
      });
      setError('');
      setStatus(`Live GPS shared (accuracy ${Math.round(c.accuracy)} m).`);
      onUpdated();
    } catch (e) {
      setError((e as Error).message);
      stop();
    }
  };

  const start = () => {
    if (!navigator.geolocation) {
      setError('This browser does not support GPS.');
      return;
    }
    setError('');
    setStatus('Requesting your device location…');
    watchId.current = navigator.geolocation.watchPosition(
      send,
      e => {
        setError(e.code === 1 ? 'Location permission was denied.' : 'Unable to obtain a location fix.');
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    setTracking(true);
  };

  const directionsUrl =
    routeData?.external_directions_url ||
    (location
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${location.latitude}%2C${location.longitude}%3B12.9784%2C77.6408`
      : 'https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=12.9716%2C77.5946%3B12.9784%2C77.6408');

  return (
    <section className="card overflow-hidden border-surface-border">
      <div className="p-4 flex flex-wrap justify-between items-center gap-3 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 font-bold text-charcoal">
            <Navigation size={17} className="text-brand" />
            <span>Ambulance Live Location & Route</span>
          </div>
          <p className="text-xs text-slateText mt-0.5">
            Real-time GPS sharing and OpenRoute telemetry for emergency transfer
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canTrack && (
            <button
              onClick={tracking ? stop : start}
              className={tracking ? 'btn btn-secondary text-xs' : 'btn btn-primary text-xs'}
            >
              {tracking ? (
                <>
                  <Pause size={14} /> Pause GPS
                </>
              ) : (
                <>
                  <Play size={14} /> Share live GPS
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {location ? (
        <>
          <iframe
            title="Ambulance location on OpenStreetMap"
            className="w-full h-64 border-0 bg-slate-100"
            src={mapUrl(location)}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <div className="p-3.5 bg-slate-50/60 border-t border-surface-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slateText block text-[11px]">Updated</span>
              <strong className="block text-charcoal font-semibold">{pretty(location.reported_at)}</strong>
            </div>
            <div>
              <span className="text-slateText block text-[11px]">Accuracy</span>
              <strong className="block text-charcoal font-semibold">
                {location.accuracy_meters !== null ? `${Math.round(location.accuracy_meters)} m` : 'Unknown'}
              </strong>
            </div>
            <div>
              <span className="text-slateText block text-[11px]">Current Speed</span>
              <strong className="block text-charcoal font-semibold">
                {location.speed_mps !== null ? `${(location.speed_mps * 3.6).toFixed(0)} km/h` : '0 km/h'}
              </strong>
            </div>
            <div className="flex flex-col justify-end">
              <a
                className="text-brand hover:underline font-semibold inline-flex items-center gap-1 text-xs"
                target="_blank"
                rel="noreferrer"
                href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`}
              >
                <MapPin size={13} />
                <span>Open Full Map</span>
              </a>
            </div>
          </div>
        </>
      ) : (
        <div className="p-6 text-sm text-slateText flex items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-slate-400" />
            <span>No live GPS shared yet for this ambulance crew.</span>
          </div>
        </div>
      )}

      {/* Open Route API Telemetry & External Routing Guidance */}
      <div className="px-4 py-3 bg-white border-t border-surface-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
            <Route size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-charcoal">
                OpenRoute Engine: {routeData ? `${routeData.distance_km} km · ~${routeData.duration_minutes} mins` : 'Live Routing Active'}
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                OSRM
              </span>
            </div>
            <p className="text-[11px] text-slateText mt-0.5">
              Target: {routeData?.hospital_name || 'Destination Trauma Center'}
            </p>
          </div>
        </div>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 font-semibold text-teal-900 border-teal-300/60 bg-teal-50/80 hover:bg-teal-100 transition"
        >
          <Compass size={14} className="text-teal-700" />
          <span>Open Route Navigation</span>
          <ExternalLink size={12} className="text-slate-400" />
        </a>
      </div>

      <div className="px-4 py-2.5 bg-slate-50 text-[11px] text-slateText flex gap-1.5 items-start border-t border-surface-border">
        <TriangleAlert size={13} className="shrink-0 mt-0.5 text-slate-400" />
        <span>
          {error || status} Powered by OpenRouteService & <a className="underline text-brand" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>.
        </span>
      </div>
    </section>
  );
}
