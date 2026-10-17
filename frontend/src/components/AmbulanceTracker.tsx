import { useEffect, useRef, useState } from 'react';
import { Crosshair, MapPin, Navigation, Pause, Play, Radio, TriangleAlert } from 'lucide-react';
import { AmbulanceLocation, post, pretty } from '../lib/api';

type Props={caseId:string;canTrack:boolean;location:AmbulanceLocation|null;onUpdated:()=>void};

function mapUrl(location:AmbulanceLocation){
  const delta=0.012;
  const left=location.longitude-delta,right=location.longitude+delta,bottom=location.latitude-delta,top=location.latitude+delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`;
}

export default function AmbulanceTracker({caseId,canTrack,location,onUpdated}:Props){
  const watchId=useRef<number|null>(null);
  const lastSent=useRef(0);
  const [tracking,setTracking]=useState(false);
  const [status,setStatus]=useState('Location sharing is off.');
  const [error,setError]=useState('');

  useEffect(()=>()=>{if(watchId.current!==null)navigator.geolocation.clearWatch(watchId.current)},[]);
  const stop=()=>{if(watchId.current!==null)navigator.geolocation.clearWatch(watchId.current);watchId.current=null;setTracking(false);setStatus('Location sharing paused.');};
  const send=async(position:GeolocationPosition)=>{
    // Keep GPS traffic bounded while still providing genuinely live operational updates.
    if(Date.now()-lastSent.current<8000)return;
    lastSent.current=Date.now();
    const c=position.coords;
    try{
      await post(`/cases/${caseId}/ambulance-location`,{latitude:c.latitude,longitude:c.longitude,accuracy_meters:c.accuracy,speed_mps:c.speed===null?null:c.speed,heading_degrees:c.heading===null?null:c.heading});
      setError('');setStatus(`Live GPS shared (accuracy ${Math.round(c.accuracy)} m).`);onUpdated();
    }catch(e){setError((e as Error).message);stop();}
  };
  const start=()=>{
    if(!navigator.geolocation){setError('This browser does not support GPS.');return;}
    setError('');setStatus('Requesting your device location…');
    watchId.current=navigator.geolocation.watchPosition(send,e=>{setError(e.code===1?'Location permission was denied.':'Unable to obtain a location fix.');setTracking(false);},{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
    setTracking(true);
  };
  return <section className="card overflow-hidden border-surface-border">
    <div className="p-4 flex flex-wrap justify-between gap-3 border-b border-surface-border">
      <div><div className="flex items-center gap-2 font-bold text-charcoal"><Navigation size={16} className="text-brand"/>Ambulance live location</div><p className="text-xs text-slateText mt-1">GPS is shared only while the crew explicitly enables it. It is not route guidance.</p></div>
      {canTrack&&<button onClick={tracking?stop:start} className={tracking?'btn btn-secondary text-xs':'btn btn-primary text-xs'}>{tracking?<><Pause size={14}/>Pause sharing</>:<><Play size={14}/>Share live GPS</>}</button>}
    </div>
    {location?<><iframe title="Ambulance location on OpenStreetMap" className="w-full h-64 border-0 bg-slate-100" src={mapUrl(location)} loading="lazy" referrerPolicy="no-referrer"/><div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs"><div><span className="text-slateText">Updated</span><strong className="block text-charcoal">{pretty(location.reported_at)}</strong></div><div><span className="text-slateText">Accuracy</span><strong className="block text-charcoal">{location.accuracy_meters!==null?`${Math.round(location.accuracy_meters)} m`:'Unknown'}</strong></div><div><span className="text-slateText">Speed</span><strong className="block text-charcoal">{location.speed_mps!==null?`${(location.speed_mps*3.6).toFixed(0)} km/h`:'Unknown'}</strong></div><a className="text-brand font-semibold inline-flex items-center gap-1 self-end" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`}><MapPin size={14}/>Open map</a></div></>:<div className="p-6 text-sm text-slateText flex items-center gap-2"><Radio size={16}/>No live location has been shared for this case.</div>}
    <div className="px-4 pb-3 text-[11px] text-slateText flex gap-1.5 items-start"><TriangleAlert size={13} className="shrink-0 mt-0.5"/><span>{error||status} Map data © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>.</span></div>
  </section>;
}
