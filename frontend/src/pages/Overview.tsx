import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Ambulance,
  Building2,
  CheckCircle2,
  Radio,
  PlusCircle,
  ArrowRight,
  Route,
  Activity,
  AlertTriangle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { api, Case, Hospital, short } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useLive } from '../lib/live';
import { PageHeader, MetricCard, Panel, StatusBadge, EmptyState, Loading } from '../components/UI';

export default function Overview() {
  const { user } = useAuth();
  const live = useLive();
  const { openVoiceModal } = (useOutletContext<{ openVoiceModal?: () => void }>() || {});

  const [cases, setCases] = useState<Case[] | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [err, setErr] = useState('');

  const refresh = () => {
    api<{ items: Case[] }>('/cases')
      .then(r => setCases(r.items))
      .catch(e => setErr(e.message));
    api<Hospital[]>('/hospitals')
      .then(setHospitals)
      .catch(() => {});
  };

  useEffect(refresh, [live.events[0]?.sequence]);

  const activeCases = cases?.filter(c => c.status === 'active') || [];
  const awaitingHospital = cases?.filter(c => c.status === 'waiting_hospital' || !c.confirmed_hospital_id) || [];
  const readyHospitals = hospitals.filter(h => h.readiness === 'ready' && !h.stale);

  return (
    <div className="space-y-6">
      {/* Real-Time Operational Fleet Banner */}
      <div className="card p-4 sm:p-5 bg-gradient-to-r from-navy via-navy-light to-navy text-white border-0 shadow-elevated relative overflow-hidden">
        {/* Subtle background ambient mesh */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-brand/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -top-10 w-40 h-40 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand/25 border border-brand/40 flex items-center justify-center text-brand-light shrink-0 shadow-inner">
              <Activity size={22} className="text-teal-300 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-bold text-base sm:text-lg text-white">
                  AyuStream Emergency Dispatch Mesh
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-success/20 text-emerald-300 border border-success/30 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ONLINE · 154.280 MHz
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Welcome, <strong>{user?.name}</strong>. Connected to Regional Emergency Medical Services. Live AI clinical transcription, Hinglish voice telemetry, and hospital destination routing are active.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
            {openVoiceModal && (
              <button
                onClick={openVoiceModal}
                className="btn text-xs bg-brand hover:bg-brand-600 text-white font-bold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-2 border border-brand-light/30 transition-transform active:scale-95"
              >
                <Radio size={14} className="animate-pulse" />
                <span>Radio Intercom</span>
              </button>
            )}
            {['paramedic', 'coordinator', 'admin'].includes(user?.role || '') && (
              <Link
                to="/new"
                className="btn text-xs bg-white text-charcoal hover:bg-slate-100 font-bold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <PlusCircle size={14} className="text-brand" />
                <span>New Case</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-[#F8D7D7] bg-[#FAEDED] p-3 text-xs text-[#C84848]">
          {err}
        </div>
      )}

      {/* Operational Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Active Cases"
          value={activeCases.length}
          subtext="Under pre-hospital management"
          icon={Ambulance}
          variant="brand"
        />
        <MetricCard
          label="Awaiting Hospital"
          value={awaitingHospital.length}
          subtext="Requires acceptance / confirmation"
          icon={Clock}
          variant={awaitingHospital.length > 0 ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Emergency Hospitals Ready"
          value={`${readyHospitals.length} / ${hospitals.length}`}
          subtext="Verified readiness"
          icon={Building2}
          variant="success"
        />
        <MetricCard
          label="Live Grid Sequence"
          value={live.events.length}
          subtext="Persistent events logged"
          icon={Radio}
          variant="neutral"
        />
      </div>

      {/* Operational Grid */}
      <div className="grid xl:grid-cols-[1.55fr_1fr] gap-6">
        {/* Left Column: Active Cases */}
        <Panel
          title="Active Emergency Cases"
          sub="Patients currently en route or in pre-hospital coordination"
          action={
            <Link to="/cases" className="text-xs font-semibold text-brand hover:underline flex items-center gap-1">
              View all cases <ArrowRight size={13} />
            </Link>
          }
        >
          {cases === null ? (
            <Loading />
          ) : cases.length === 0 ? (
            <EmptyState
              title="No emergency cases"
              message="There are no active cases in the grid right now. New paramedic intakes will appear here immediately."
              action={
                ['paramedic', 'coordinator', 'admin'].includes(user?.role || '') ? (
                  <Link to="/new" className="btn btn-primary text-xs">
                    <PlusCircle size={14} /> Create Case
                  </Link>
                ) : null
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Case Reference</th>
                    <th>Reported Complaint</th>
                    <th>Destination</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cases.slice(0, 6).map(c => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/cases/${c.id}`} className="font-semibold text-brand hover:underline">
                          {c.id}
                        </Link>
                        <div className="text-[11px] text-slateText mt-0.5">
                          {c.patient_code} · {c.team || 'Rig BLS-108'}
                        </div>
                      </td>
                      <td className="max-w-[240px] truncate text-charcoal font-medium">
                        {c.complaint}
                      </td>
                      <td>
                        <div className="text-xs font-medium text-charcoal">
                          {c.confirmed_hospital_id
                            ? hospitals.find(h => h.id === c.confirmed_hospital_id)?.name || c.confirmed_hospital_id
                            : c.intended_hospital_id
                            ? hospitals.find(h => h.id === c.intended_hospital_id)?.name || c.intended_hospital_id
                            : 'Unassigned'}
                        </div>
                        <div className="text-[11px] text-slateText">
                          {c.confirmed_hospital_id ? 'Confirmed' : 'Intended'}
                        </div>
                      </td>
                      <td>
                        <StatusBadge value={c.status} />
                      </td>
                      <td className="text-right">
                        <Link
                          to={`/cases/${c.id}`}
                          className="btn btn-secondary text-xs py-1 px-2.5"
                          aria-label={`Open case ${c.id}`}
                        >
                          Open <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Right Column: Hospital Readiness & Live Events */}
        <div className="space-y-6">
          {/* Hospital Readiness */}
          <Panel
            title="Hospital Department Readiness"
            sub="Self-reported receiving capacity; verify before destination confirmation"
          >
            {hospitals.length === 0 ? (
              <EmptyState message="No hospital records available" />
            ) : (
              <div className="divide-y divide-surface-border">
                {hospitals.map(h => (
                  <div key={h.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-charcoal truncate">{h.name}</div>
                      <div className="text-[11px] text-slateText truncate mt-0.5">{h.area}</div>
                    </div>
                    <StatusBadge value={h.stale ? 'stale' : h.readiness} />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Recent Live Events */}
          <Panel title="Live Activity Stream" sub="Chronological event sequence from the grid">
            <div className="divide-y divide-surface-border">
              {live.events.length === 0 ? (
                <div className="p-6 text-center text-xs text-slateText">
                  Listening for incoming coordination events…
                </div>
              ) : (
                live.events.slice(0, 5).map(e => (
                  <div key={e.id} className="p-3 flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-brand-light text-brand flex items-center justify-center shrink-0 mt-0.5">
                      <Activity size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-charcoal capitalize truncate">
                        {e.event_type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[11px] text-slateText mt-0.5">
                        {e.case_id || e.hospital_id || 'System'} · {short(e.occurred_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="card p-4 bg-brand-50/50 border-brand/20 flex items-start gap-3">
        <ShieldCheck size={18} className="text-brand shrink-0 mt-0.5" />
        <div className="text-xs text-brand-dark leading-relaxed">
          <strong>Clinical Safety Guideline:</strong> AyuStream AI provides coordination decision support and structures verbal clinical reports. It does not perform autonomous diagnosis, automated dispatch, or clinical triage. An explicit human confirmation is required for all patient destinations.
        </div>
      </div>
    </div>
  );
}
