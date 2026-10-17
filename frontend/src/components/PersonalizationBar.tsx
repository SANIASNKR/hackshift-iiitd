import { useState, useEffect } from 'react';
import {
  Radio,
  Phone,
  Shield,
  Clock,
  MapPin,
  Ambulance,
  Building2,
  Activity,
  HeartPulse,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function PersonalizationBar({
  onOpenVoiceModal
}: {
  onOpenVoiceModal: () => void;
}) {
  const { user } = useAuth();
  const [dutyStatus, setDutyStatus] = useState<'dispatch' | 'scene' | 'transport' | 'bay'>('dispatch');
  const [shiftSeconds, setShiftSeconds] = useState(13420); // ~3h 43m

  useEffect(() => {
    const t = setInterval(() => setShiftSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const hrs = Math.floor(shiftSeconds / 3600);
  const mins = Math.floor((shiftSeconds % 3600) / 60);

  const getProfileMeta = () => {
    switch (user?.role) {
      case 'paramedic':
        return {
          title: user?.name || 'Paramedic Vikram Rathore',
          callSign: 'Rig BLS-108 (Indiranagar EMS Hub)',
          badge: 'EMS-4402',
          location: 'Station 14 · Green Corridor',
          icon: Ambulance,
          color: 'text-teal-600',
          bg: 'bg-teal-50',
          badgeColor: 'border-teal-300 bg-teal-50 text-teal-800'
        };
      case 'hospital':
        return {
          title: user?.name || 'Dr. Aditi Sen (ER Lead)',
          callSign: 'Northbridge Apollo Trauma & Resus Hub',
          badge: 'REG-MD-8821',
          location: 'Trauma Bay 1 & Resus Bay 2',
          icon: Building2,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          badgeColor: 'border-blue-300 bg-blue-50 text-blue-800'
        };
      case 'coordinator':
        return {
          title: user?.name || 'Priya Nair (Central Dispatch)',
          callSign: 'State EMS Grid Control Desk #2',
          badge: 'CTRL-09',
          location: 'Central Command · 108 Emergency Grid',
          icon: Radio,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          badgeColor: 'border-amber-300 bg-amber-50 text-amber-800'
        };
      default:
        return {
          title: user?.name || 'Dr. Amitava Ghosh',
          callSign: 'AyuStream Clinical Medical Direction',
          badge: 'DIR-01',
          location: 'Operations HQ',
          icon: Shield,
          color: 'text-indigo-600',
          bg: 'bg-indigo-50',
          badgeColor: 'border-indigo-300 bg-indigo-50 text-indigo-800'
        };
    }
  };

  const meta = getProfileMeta();

  return (
    <div className="card p-3 sm:p-4 mb-6 bg-gradient-to-r from-white via-slate-50/60 to-white border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-4">
      {/* Human Crew Identity */}
      <div className="flex items-center gap-3.5">
        <div className={`relative w-11 h-11 rounded-2xl ${meta.bg} ${meta.color} flex items-center justify-center border border-slate-200 font-extrabold text-sm shadow-sm`}>
          <meta.icon size={22} />
          <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-200" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-ink leading-tight">{meta.title}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${meta.badgeColor}`}>
              Badge #{meta.badge}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">{meta.callSign}</span>
            <span>·</span>
            <span className="flex items-center gap-1 text-slate-500">
              <MapPin size={11} className="text-teal-600" />
              {meta.location}
            </span>
          </div>
        </div>
      </div>

      {/* Duty Status Switcher & Shift Tracker */}
      <div className="flex flex-wrap items-center gap-3">
        {user?.role === 'paramedic' && (
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'dispatch', label: 'En Route' },
              { id: 'scene', label: 'On Scene' },
              { id: 'transport', label: 'Transport' },
              { id: 'bay', label: 'Bay Handover' }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setDutyStatus(s.id as unknown as typeof dutyStatus)}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                  dutyStatus === s.id
                    ? 'bg-white text-teal-800 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-ink'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 text-[11px] font-semibold text-slate-600">
          <Clock size={13} className="text-teal-700" />
          <span>Shift: {hrs}h {mins}m</span>
        </div>

        {/* Big Prominent Emergency Voice & Intercom Button */}
        <button
          onClick={onOpenVoiceModal}
          className="btn bg-gradient-to-r from-teal-700 to-teal-800 text-white hover:from-teal-600 hover:to-teal-700 shadow-md py-2 px-3.5 text-xs font-bold flex items-center gap-2 border border-teal-600 transition-transform active:scale-95"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
          <Radio size={14} />
          <span>EMS Radio & Voice Hotline</span>
          <span className="rounded bg-teal-900/60 text-[9px] px-1.5 py-0.5 text-teal-200 uppercase font-mono">
            Hinglish
          </span>
        </button>
      </div>
    </div>
  );
}
