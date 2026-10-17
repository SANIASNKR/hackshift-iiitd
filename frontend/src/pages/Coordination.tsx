import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Clock,
  RefreshCcw,
  Route,
  Activity,
  Bed,
  Layers,
  PhoneCall,
  UserCheck,
  UserX,
  Stethoscope,
  Info,
  Calendar,
  Sparkles,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Send,
  XCircle,
  FileText
} from 'lucide-react';
import {
  api,
  post,
  patch,
  Case,
  CaseDetails,
  Hospital,
  Acceptance,
  Resource,
  pretty,
  short
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { useLive } from '../lib/live';
import {
  EmptyState,
  LoadingSkeleton,
  Notice,
  PageHeader,
  Panel,
  StatusBadge,
  MetricCard,
  Modal,
  VitalSignCard,
  MissingInformationPanel,
  ClinicalConflictAlert
} from '../components/UI';

type Match = {
  hospital: Hospital;
  eligible: boolean;
  requires_confirmation: boolean;
  acceptance_status: string;
  reasons: string[];
  score: number;
};

/* =====================================================================
   1. SmartRoute Coordination Workspace (Emergency Coordinator)
   ===================================================================== */
export function SmartRoute() {
  const [query, setQuery] = useSearchParams();
  const { user } = useAuth();
  const live = useLive();

  const [cases, setCases] = useState<Case[]>([]);
  const [data, setData] = useState<CaseDetails | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const id = query.get('case') || '';
  const canCoordinate = user !== null && ['coordinator', 'admin'].includes(user.role);

  const refresh = () => {
    api<{ items: Case[] }>('/cases')
      .then(r => setCases(r.items))
      .catch(e => setError(e.message));

    if (id) {
      api<CaseDetails>('/cases/' + id)
        .then(setData)
        .catch(e => setError(e.message));
      api<{ matches: Match[] }>('/cases/' + id + '/matches')
        .then(r => setMatches(r.matches))
        .catch(e => setError(e.message));
    }
  };

  useEffect(refresh, [id, live.events[0]?.sequence]);

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      await fn();
      setSuccess(message);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const selectedCase = cases.find(c => c.id === id);
  const intendedHospital = matches.find(m => m.hospital.id === data?.case.intended_hospital_id)?.hospital;
  const confirmedHospital = matches.find(m => m.hospital.id === data?.case.confirmed_hospital_id)?.hospital;

  return (
    <>
      <PageHeader
        tag="Triage & Decision Support"
        title="SmartRoute Coordination"
        description="Review verified hospital capabilities, real-time readiness status, and explicit clinician acceptances. Transparent coordination without automatic rerouting or simulated travel times."
      >
        <Link to="/hospital" className="btn btn-secondary flex items-center gap-2">
          <Building2 size={16} className="text-brand" />
          <span>Hospital Command Center</span>
        </Link>
      </PageHeader>

      <Notice error={error} success={success} />

      {/* Case Selector Bar */}
      <div className="card p-4 sm:p-5 mb-6 bg-white border border-surface-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slateText mb-1.5 block">
              Active Emergency Case to Coordinate
            </label>
            <div className="relative">
              <select
                className="field w-full max-w-2xl font-medium text-sm pr-10"
                value={id}
                onChange={e => setQuery(e.target.value ? { case: e.target.value } : {})}
              >
                <option value="">Select an active case to evaluate routing…</option>
                {cases.map(c => (
                  <option value={c.id} key={c.id}>
                    {c.id} · {c.complaint.slice(0, 75)} ({c.status.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedCase && (
            <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-surface-border">
              <StatusBadge value={selectedCase.status} />
              <Link
                to={`/cases/${selectedCase.id}`}
                className="btn btn-secondary text-xs flex items-center gap-1.5"
              >
                <span>Full Handover</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {!id ? (
        <div className="card p-12 text-center text-slateText border-dashed border-2 border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-brand-light text-brand flex items-center justify-center mx-auto mb-4">
            <Route size={28} />
          </div>
          <h3 className="text-base font-bold text-charcoal">Select an emergency case to begin</h3>
          <p className="text-xs text-slateText mt-1.5 max-w-md mx-auto leading-relaxed">
            Choose an ongoing paramedic incident from the dropdown above to view capability-screened receiving hospitals, check acceptance status, and confirm destinations.
          </p>
        </div>
      ) : (
        /* Split-Screen Coordinator Workspace */
        <div className="grid xl:grid-cols-[1.1fr_1.3fr] gap-6">
          {/* LEFT PANEL: Case Clinical & Operational Context */}
          <div className="space-y-6">
            {/* Case Snapshot */}
            <div className="card p-5">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-surface-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand bg-brand-light px-2 py-0.5 rounded">
                      {data?.case.id}
                    </span>
                    <span className="text-xs text-slateText">
                      Logged {data?.case.created_at ? pretty(data.case.created_at) : 'recently'}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-charcoal mt-2">
                    {data?.case.complaint || 'Loading complaint details…'}
                  </h2>
                </div>
                {data && <StatusBadge value={data.case.status} />}
              </div>

              {/* Patient Identity */}
              <div className="py-3.5 border-b border-surface-border flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    data?.case.identity_mode !== 'unknown'
                      ? 'bg-success-light text-success'
                      : 'bg-warning-light text-warning'
                  }`}
                >
                  {data?.case.identity_mode !== 'unknown' ? <UserCheck size={18} /> : <UserX size={18} />}
                </div>
                <div>
                  <div className="text-xs font-semibold text-charcoal">
                    {data?.case.identity_mode !== 'unknown'
                      ? `${data?.case.identity_name || 'Patient'} · Age ${data?.case.age || '—'} · ${data?.case.sex || '—'}`
                      : 'Unknown Patient (Unidentified)'}
                  </div>
                  <div className="text-[11.5px] text-slateText">
                    {data?.case.identity_mode !== 'unknown'
                      ? 'Identity established by paramedic crew'
                      : 'Case proceeding with temporary anonymous identifier'}
                  </div>
                </div>
              </div>

              {/* Paramedic Crew Callsign */}
              <div className="pt-3 text-xs text-slateText flex items-center justify-between">
                <span>Field Crew Callsign</span>
                <span className="font-semibold text-charcoal">{data?.case.team || data?.case.created_by || 'Ambulance Unit'}</span>
              </div>
            </div>

            {/* Structured Handover Snapshot */}
            {(() => {
              const latestReport = data?.reports?.[0];
              const vitals = latestReport?.summary?.vitals || {};
              const missingFields = latestReport?.summary?.missing_fields || [];
              const conflicts = data?.conflicts || [];
              const events = data?.events || [];

              return (
                <>
                  <Panel
                    title="Clinical Handover Synopsis"
                    sub="Extracted from paramedic report · Clinician review required"
                  >
                    <div className="p-5 space-y-4">
                      {/* Vitals Grid */}
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slateText mb-2">
                          Field Vital Signs
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          <div className="bg-slate-50 border border-surface-border p-2.5 rounded-lg">
                            <div className="text-[10.5px] font-semibold text-slateText uppercase">Blood Pressure</div>
                            <div className="font-mono text-sm font-bold text-charcoal mt-0.5">
                              {vitals['blood_pressure'] || vitals['bp'] || 'Not recorded'}
                            </div>
                          </div>
                          <div className="bg-slate-50 border border-surface-border p-2.5 rounded-lg">
                            <div className="text-[10.5px] font-semibold text-slateText uppercase">Heart Rate</div>
                            <div className="font-mono text-sm font-bold text-charcoal mt-0.5">
                              {vitals['heart_rate'] || vitals['pulse'] ? `${vitals['heart_rate'] || vitals['pulse']} bpm` : 'Not recorded'}
                            </div>
                          </div>
                          <div className="bg-slate-50 border border-surface-border p-2.5 rounded-lg">
                            <div className="text-[10.5px] font-semibold text-slateText uppercase">SpO2 Oxygen</div>
                            <div className="font-mono text-sm font-bold text-charcoal mt-0.5">
                              {vitals['spo2'] || vitals['oxygen_saturation'] ? `${vitals['spo2'] || vitals['oxygen_saturation']}%` : 'Not recorded'}
                            </div>
                          </div>
                          <div className="bg-slate-50 border border-surface-border p-2.5 rounded-lg">
                            <div className="text-[10.5px] font-semibold text-slateText uppercase">Temperature</div>
                            <div className="font-mono text-sm font-bold text-charcoal mt-0.5">
                              {vitals['temperature'] || vitals['temp'] ? `${vitals['temperature'] || vitals['temp']} °F` : 'Not recorded'}
                            </div>
                          </div>
                          <div className="bg-slate-50 border border-surface-border p-2.5 rounded-lg">
                            <div className="text-[10.5px] font-semibold text-slateText uppercase">Resp Rate</div>
                            <div className="font-mono text-sm font-bold text-charcoal mt-0.5">
                              {vitals['respiratory_rate'] || vitals['rr'] ? `${vitals['respiratory_rate'] || vitals['rr']} /min` : 'Not recorded'}
                            </div>
                          </div>
                          <div className="bg-slate-50 border border-surface-border p-2.5 rounded-lg">
                            <div className="text-[10.5px] font-semibold text-slateText uppercase">GCS</div>
                            <div className="font-mono text-sm font-bold text-charcoal mt-0.5">
                              {vitals['gcs'] || 'Not recorded'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Missing Information Warning */}
                      {missingFields.length > 0 && (
                        <MissingInformationPanel missing={missingFields} />
                      )}

                      {/* Conflict Alert */}
                      {conflicts.length > 0 && (
                        <div className="space-y-2">
                          {conflicts.map((c) => (
                            <ClinicalConflictAlert
                              key={c.id}
                              field={c.field}
                              leftValue={c.left_value}
                              leftSource={c.left_source}
                              rightValue={c.right_value}
                              rightSource={c.right_source}
                            />
                          ))}
                        </div>
                      )}

                      {/* Clinical Notes Summary */}
                      {latestReport?.summary?.chief_complaint && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-surface-border">
                          <div className="text-[11px] font-semibold uppercase text-slateText mb-1">
                            Reported Clinical Complaint
                          </div>
                          <p className="text-xs text-charcoal leading-relaxed">
                            {latestReport.summary.chief_complaint}
                          </p>
                        </div>
                      )}
                    </div>
                  </Panel>

                  {/* Case Event Timeline */}
                  <Panel title="Coordination Audit History" sub="Verified events for this incident">
                    <div className="p-4 divide-y divide-slate-100 max-h-72 overflow-y-auto">
                      {events.length > 0 ? (
                        events.map((event) => (
                          <div key={event.id || event.sequence} className="py-2.5 flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
                            <div className="flex-1 text-xs">
                              <div className="font-semibold text-charcoal">
                                {event.event_type.replace(/\./g, ' · ').replace(/_/g, ' ')}
                              </div>
                              <div className="text-[11px] text-slateText mt-0.5">
                                {pretty(event.occurred_at)}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slateText py-4 text-center">
                          No timeline records yet
                        </div>
                      )}
                    </div>
                  </Panel>
                </>
              );
            })()}
          </div>

          {/* RIGHT PANEL: Destination Status & Potential Receiving Hospitals */}
          <div className="space-y-6">
            {/* Destination Status Header Box */}
            <div className="card p-5 bg-gradient-to-br from-white to-slate-50 border border-surface-border">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slateText">
                  Destination Authorization Status
                </span>
                <span className="text-xs text-slateText">
                  Incident ID: <strong className="text-charcoal">{id}</strong>
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Intended Hospital */}
                <div className="bg-white p-3.5 rounded-xl border border-surface-border">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slateText">
                    Initial Intended Hospital
                  </div>
                  <div className="text-sm font-bold text-charcoal mt-1 flex items-center gap-1.5">
                    <Building2 size={16} className="text-slateText" />
                    <span>{intendedHospital?.name || 'None Assigned'}</span>
                  </div>
                  <div className="text-[11px] text-slateText mt-1">
                    {intendedHospital ? intendedHospital.area : 'Awaiting coordination'}
                  </div>
                </div>

                {/* Confirmed Destination */}
                <div
                  className={`p-3.5 rounded-xl border ${
                    confirmedHospital
                      ? 'bg-success-light/40 border-success/30'
                      : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slateText">
                    Confirmed Destination
                  </div>
                  <div className="text-sm font-bold text-charcoal mt-1 flex items-center gap-1.5">
                    {confirmedHospital ? (
                      <CheckCircle2 size={16} className="text-success" />
                    ) : (
                      <ShieldAlert size={16} className="text-warning" />
                    )}
                    <span>{confirmedHospital ? confirmedHospital.name : 'Destination not confirmed yet'}</span>
                  </div>
                  <div className="text-[11px] text-slateText mt-1">
                    {confirmedHospital
                      ? 'Explicitly confirmed by coordinator · Broadcast live'
                      : 'Pending hospital acceptance'}
                  </div>
                </div>
              </div>

              {!data?.case.confirmed_hospital_id && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50/80 border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Coordination Rule:</strong> A hospital marked “ready” or listed as an alternative is <em>not</em> an accepted destination. An ambulance destination can only be confirmed after an explicit acceptance is received from the receiving facility.
                  </p>
                </div>
              )}
            </div>

            {/* SmartRoute Alternatives (Potential Receiving Hospitals) */}
            <Panel
              title="Potential receiving hospitals"
              sub="Screened using reported clinical needs, verified hospital capabilities, and data freshness"
              action={
                <button
                  onClick={refresh}
                  className="btn btn-secondary text-xs flex items-center gap-1.5 py-1 px-2.5"
                >
                  <RefreshCcw size={13} />
                  <span>Refresh Screen</span>
                </button>
              }
            >
              {matches.length === 0 ? (
                <div className="p-8">
                  <LoadingSkeleton lines={3} />
                </div>
              ) : (
                <div className="divide-y divide-surface-border">
                  {matches.map((m, index) => {
                    const isConfirmed = data?.case.confirmed_hospital_id === m.hospital.id;
                    const isIntended = data?.case.intended_hospital_id === m.hospital.id;
                    const acceptance = data?.acceptances.find(a => a.hospital_id === m.hospital.id);
                    const acceptanceStatus = acceptance?.status || 'none';

                    return (
                      <div
                        key={m.hospital.id}
                        className={`p-5 transition-colors ${
                          isConfirmed
                            ? 'bg-success-light/20'
                            : !m.eligible
                            ? 'bg-slate-50/60 opacity-80'
                            : 'hover:bg-slate-50/40'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Rank badge */}
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isConfirmed
                                ? 'bg-success text-white'
                                : m.eligible
                                ? 'bg-brand text-white'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {String(index + 1).padStart(2, '0')}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Hospital Header & Status */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <h3 className="text-sm font-bold text-charcoal flex items-center gap-1.5">
                                  <span>{m.hospital.name}</span>
                                  {isConfirmed && (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-success text-white">
                                      Confirmed
                                    </span>
                                  )}
                                  {isIntended && !isConfirmed && (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                      Initial choice
                                    </span>
                                  )}
                                </h3>
                                <div className="text-xs text-slateText mt-0.5">
                                  {m.hospital.area} · Code: {m.hospital.id}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10.5px] font-bold text-brand bg-brand-50 px-2 py-0.5 rounded border border-brand/20">
                                  Match Score: {m.score}
                                </span>
                                <StatusBadge value={m.hospital.stale ? 'stale' : m.hospital.readiness} />
                              </div>
                            </div>

                            {/* Capabilities */}
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {m.hospital.capabilities.map(cap => (
                                <span
                                  key={cap}
                                  className="text-[11px] font-semibold px-2 py-0.5 rounded bg-brand-50/70 text-brand-dark border border-brand/15 capitalize"
                                >
                                  {cap.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>

                            {/* Matching Explanation / Criteria */}
                            <div className="mt-3 bg-white p-3 rounded-lg border border-surface-border text-xs space-y-1">
                              {m.reasons.map((reason, j) => (
                                <div
                                  key={j}
                                  className={`flex items-start gap-2 ${
                                    m.eligible ? 'text-slate-700' : 'text-critical'
                                  }`}
                                >
                                  <span className="font-bold">•</span>
                                  <span>{reason}</span>
                                </div>
                              ))}
                            </div>

                            {/* Acceptance Status & Primary Action */}
                            <div className="mt-4 pt-3 border-t border-surface-border flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slateText">Acceptance:</span>
                                <StatusBadge value={acceptanceStatus} />
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Case 1: Needs acceptance request */}
                                {canCoordinate &&
                                  m.eligible &&
                                  acceptanceStatus === 'none' && (
                                    <button
                                      disabled={busy}
                                      onClick={() =>
                                        run(
                                          () =>
                                            post(`/cases/${id}/acceptances`, {
                                              hospital_id: m.hospital.id
                                            }),
                                          `Acceptance request sent to ${m.hospital.name}`
                                        )
                                      }
                                      className="btn btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
                                    >
                                      <span>Request acceptance</span>
                                      <Send size={13} />
                                    </button>
                                  )}

                                {/* Case 2: Pending response - Escalate action */}
                                {canCoordinate &&
                                  acceptanceStatus === 'pending' &&
                                  acceptance && (
                                    <button
                                      disabled={busy}
                                      onClick={() =>
                                        run(
                                          () => post(`/acceptances/${acceptance.id}/escalate`, {}),
                                          `Escalated unanswered request for ${m.hospital.name}`
                                        )
                                      }
                                      className="btn btn-secondary text-xs text-warning flex items-center gap-1.5 py-1.5 px-3"
                                    >
                                      <Clock size={13} />
                                      <span>Escalate Unanswered</span>
                                    </button>
                                  )}

                                {/* Case 3: Accepted by Hospital - Confirm Destination action */}
                                {canCoordinate &&
                                  acceptanceStatus === 'accepted' &&
                                  acceptance &&
                                  data?.case.confirmed_hospital_id !== m.hospital.id && (
                                    <button
                                      disabled={busy}
                                      onClick={() =>
                                        run(
                                          () =>
                                            post(`/cases/${id}/destination`, {
                                              acceptance_id: acceptance.id,
                                              reason: `Coordinator confirmed destination to accepted hospital: ${m.hospital.name}`
                                            }),
                                          `Destination confirmed to ${m.hospital.name}. Live broadcast sent to paramedic crew.`
                                        )
                                      }
                                      className="btn btn-primary text-xs bg-success hover:bg-success/90 flex items-center gap-1.5 py-1.5 px-3.5 shadow-sm"
                                    >
                                      <CheckCircle2 size={14} />
                                      <span>Confirm Destination</span>
                                    </button>
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            {/* Safety & Protocol Card */}
            <div className="card p-5 bg-slate-50 border border-surface-border">
              <div className="flex items-start gap-3">
                <ShieldCheck className="text-brand shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="text-sm font-bold text-charcoal">
                    Coordinator Protocol & Destination Integrity
                  </h4>
                  <p className="text-xs text-slateText leading-relaxed mt-1">
                    SmartRoute screens hospitals using explicitly declared clinical capabilities and hospital-reported readiness. To prevent misdirected transfers, AyuStream AI requires mutual agreement: the hospital clinician must explicitly accept the transfer before a coordinator can confirm destination for the ambulance crew.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =====================================================================
   2. Hospital Command Center (Receiving Desk)
   ===================================================================== */
export function HospitalCommand() {
  const { user } = useAuth();
  const live = useLive();

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [requests, setRequests] = useState<Acceptance[]>([]);
  const [selected, setSelected] = useState('');
  const [readiness, setReadiness] = useState('ready');
  const [constraint, setConstraint] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  // Decline Dialog state
  const [declineTarget, setDeclineTarget] = useState<Acceptance | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const refresh = async () => {
    try {
      const [hs, cs] = await Promise.all([
        api<Hospital[]>('/hospitals'),
        api<{ items: Case[] }>('/cases')
      ]);
      setHospitals(hs);
      setCases(cs.items);

      const hId = user!.role === 'hospital' ? user!.hospital_id : selected || hs[0]?.id;
      if (hId && (!selected || user!.role === 'hospital')) {
        setSelected(hId);
        const h = hs.find(x => x.id === hId);
        setReadiness(h?.readiness || 'ready');
        setConstraint(h?.constraint || '');
      }

      const details = await Promise.all(
        cs.items.map(c => api<CaseDetails>('/cases/' + c.id).catch(() => null))
      );

      const allAcceptances = details
        .filter(Boolean)
        .flatMap(d => d!.acceptances)
        .filter(a => user!.role !== 'hospital' || a.hospital_id === user!.hospital_id);

      setRequests(allAcceptances);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    refresh();
  }, [live.events[0]?.sequence, user?.id]);

  const canEdit =
    user!.role === 'admin' || (user!.role === 'hospital' && selected === user!.hospital_id);

  const run = async (action: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await action();
      setSuccess(msg);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeclineSubmit = () => {
    if (!declineTarget || !declineReason.trim()) return;
    const req = declineTarget;
    setDeclineTarget(null);
    run(
      () =>
        post(`/acceptances/${req.id}/respond`, {
          status: 'declined',
          note: declineReason.trim()
        }),
      'Decline recorded with operational reason'
    );
    setDeclineReason('');
  };

  const currentHospital = hospitals.find(h => h.id === selected);
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const acceptedRequests = requests.filter(r => r.status === 'accepted');

  return (
    <>
      <PageHeader
        tag="Receiving Emergency Desk"
        title="Hospital Command Center"
        description="Review incoming emergency transfer requests, manage clinical department readiness, and record explicit acceptance or decline decisions."
      >
        <Link to="/resources" className="btn btn-secondary flex items-center gap-2">
          <Bed size={16} className="text-brand" />
          <span>Simulated Resource Inventory</span>
        </Link>
      </PageHeader>

      <Notice error={error} success={success} />

      {/* Operational Counters Derived from Live Data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Awaiting Response"
          value={pendingRequests.length}
          subtext="Pending clinician review"
          icon={Clock}
          variant={pendingRequests.length > 0 ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Accepted Transfers"
          value={acceptedRequests.length}
          subtext="En route or admitted"
          icon={CheckCircle2}
          variant="success"
        />
        <MetricCard
          label="Current Readiness"
          value={currentHospital?.stale ? 'Stale' : currentHospital?.readiness || 'Ready'}
          subtext={currentHospital?.name || 'Selected ED'}
          icon={Building2}
          variant={
            currentHospital?.readiness === 'ready'
              ? 'success'
              : currentHospital?.readiness === 'limited'
              ? 'warning'
              : 'critical'
          }
        />
        <MetricCard
          label="Assigned Hospital"
          value={currentHospital?.id || '—'}
          subtext={currentHospital?.area || 'Regional Sector'}
          icon={Activity}
          variant="brand"
        />
      </div>

      {/* Main Two-Column Receiving Layout */}
      <div className="grid xl:grid-cols-[1fr_1.6fr] gap-6">
        {/* LEFT COLUMN: Readiness & Status Management */}
        <div className="space-y-6">
          <Panel
            title="Emergency Department Readiness"
            sub="Self-reported operational status · Broadcast to coordinators"
          >
            <div className="p-5 space-y-4">
              {/* Hospital Selection (admin only) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slateText mb-1.5 block">
                  Hospital Facility
                </label>
                <select
                  className="field w-full"
                  disabled={user?.role === 'hospital'}
                  value={selected}
                  onChange={e => {
                    const h = hospitals.find(x => x.id === e.target.value);
                    setSelected(e.target.value);
                    setReadiness(h?.readiness || 'ready');
                    setConstraint(h?.constraint || '');
                  }}
                >
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.area})
                    </option>
                  ))}
                </select>
                {user?.role === 'hospital' && (
                  <p className="text-[11px] text-slateText mt-1">
                    Locked to your authenticated hospital credential ({user.hospital_id}).
                  </p>
                )}
              </div>

              {/* Readiness State Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slateText mb-1.5 block">
                  Readiness Status
                </label>
                <select
                  className="field w-full"
                  disabled={!canEdit}
                  value={readiness}
                  onChange={e => setReadiness(e.target.value)}
                >
                  <option value="ready">Ready — Receiving all medical emergencies</option>
                  <option value="limited">Limited — Reduced bed capacity or specific diversion</option>
                  <option value="unable">Unable — Department diversion / No admissions</option>
                  <option value="awaiting">Awaiting — Status pending shift assessment</option>
                  <option value="unreachable">Unreachable — Communication downtime</option>
                </select>
              </div>

              {/* Operational Constraint Note */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slateText mb-1.5 block">
                  Operational Constraint / Shift Notes
                </label>
                <textarea
                  rows={3}
                  className="field w-full text-xs"
                  placeholder="e.g. CT scanner undergoing scheduled maintenance; Resuscitation Bay 2 occupied."
                  disabled={!canEdit}
                  value={constraint}
                  onChange={e => setConstraint(e.target.value)}
                />
              </div>

              {/* Stale Warning Banner if applicable */}
              {currentHospital?.stale && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-warning shrink-0" />
                  <span>
                    <strong>Stale Status:</strong> Last update was more than 2 hours ago. Coordinators are notified that readiness needs re-confirmation.
                  </span>
                </div>
              )}

              {canEdit && (
                <button
                  disabled={busy}
                  className="btn btn-primary w-full flex items-center justify-center gap-2 py-2.5"
                  onClick={() =>
                    run(
                      () =>
                        patch(`/hospitals/${selected}/readiness`, {
                          readiness,
                          constraint: constraint || null
                        }),
                      'Readiness report published and broadcast to coordination network'
                    )
                  }
                >
                  <Building2 size={16} />
                  <span>Publish Readiness Update</span>
                </button>
              )}
            </div>
          </Panel>

          {/* Simulated Capacity Disclaimer */}
          <div className="card p-5 bg-slate-50 border border-surface-border">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-slateText shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-charcoal">Operational Training Notice</h4>
                <p className="text-[11.5px] text-slateText leading-relaxed mt-1">
                  Readiness reports and resource counts in this environment are simulation tools. AyuStream AI never modifies internal hospital EHR beds or hospital information systems automatically.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Incoming Transfer Requests & Case List */}
        <div className="space-y-6">
          {/* Requests Awaiting Hospital Response */}
          <Panel
            title="Requests Awaiting Hospital Response"
            sub="Explicit clinician review required · Accept or decline"
          >
            {pendingRequests.length === 0 ? (
              <EmptyState message="No pending transfer requests for this facility. When a coordinator or paramedic requests admission, it will appear here in real time." />
            ) : (
              <div className="divide-y divide-surface-border">
                {pendingRequests.map(a => {
                  const matchingCase = cases.find(c => c.id === a.case_id);

                  return (
                    <div key={a.id} className="p-5 bg-amber-50/20 hover:bg-amber-50/40 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-brand bg-brand-light px-2 py-0.5 rounded">
                              {a.case_id}
                            </span>
                            <StatusBadge value={a.status} />
                            <span className="text-xs text-slateText">
                              Requested {pretty(a.created_at)}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-charcoal mt-2">
                            {matchingCase?.complaint || 'Emergency patient transfer requested'}
                          </h3>

                          {matchingCase && (
                            <div className="text-xs text-slateText mt-1 flex items-center gap-3">
                              <span>
                                Patient:{' '}
                                <strong className="text-charcoal">
                                  {matchingCase.identity_mode !== 'unknown'
                                    ? matchingCase.identity_name || 'Identified'
                                    : 'Unknown / Unidentified'}
                                </strong>
                              </span>
                              <span>·</span>
                              <span>Unit: {matchingCase.team || matchingCase.created_by}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            to={`/cases/${a.case_id}`}
                            className="btn btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
                          >
                            <FileText size={13} />
                            <span>Clinical Handover</span>
                          </Link>

                          {['hospital', 'admin'].includes(user!.role) &&
                            (user!.role === 'admin' || a.hospital_id === user!.hospital_id) && (
                              <>
                                <button
                                  disabled={busy}
                                  onClick={() =>
                                    run(
                                      () =>
                                        post(`/acceptances/${a.id}/respond`, {
                                          status: 'accepted',
                                          note: 'Emergency Department accepted patient transfer'
                                        }),
                                      `Accepted case ${a.case_id}. Destination confirmation enabled for coordinator.`
                                    )
                                  }
                                  className="btn btn-primary text-xs bg-success hover:bg-success/90 flex items-center gap-1.5 py-1.5 px-3"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Accept</span>
                                </button>

                                <button
                                  disabled={busy}
                                  onClick={() => {
                                    setDeclineTarget(a);
                                    setDeclineReason('');
                                  }}
                                  className="btn btn-secondary text-xs text-critical hover:bg-red-50 flex items-center gap-1.5 py-1.5 px-3"
                                >
                                  <XCircle size={13} />
                                  <span>Decline</span>
                                </button>
                              </>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Incoming Emergency Cases List */}
          <Panel
            title="Hospital Emergency Case Registry"
            sub="All cases assigned, requested, or confirmed for this receiving department"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-surface-border bg-slate-50 text-slateText font-semibold">
                    <th className="py-3 px-4">Case ID</th>
                    <th className="py-3 px-4">Patient / Chief Complaint</th>
                    <th className="py-3 px-4">Transfer Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {cases
                    .filter(
                      c =>
                        user!.role !== 'hospital' ||
                        c.intended_hospital_id === user!.hospital_id ||
                        c.confirmed_hospital_id === user!.hospital_id ||
                        requests.some(a => a.case_id === c.id)
                    )
                    .map(c => {
                      const isConfirmed = c.confirmed_hospital_id === selected;

                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-charcoal">
                            {c.id}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-charcoal">
                            {c.complaint}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <StatusBadge value={c.status} />
                              {isConfirmed && (
                                <span className="text-[10.5px] font-semibold text-success bg-success-light px-1.5 py-0.5 rounded">
                                  Destination
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              to={`/cases/${c.id}`}
                              className="text-brand hover:text-brand-dark font-bold text-xs inline-flex items-center gap-1"
                            >
                              <span>Handover</span>
                              <ChevronRight size={13} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {cases.length === 0 && (
                <div className="p-8">
                  <EmptyState message="No cases registered in this facility's queue." />
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* Accessible Decline Reason Modal */}
      <Modal
        isOpen={declineTarget !== null}
        onClose={() => setDeclineTarget(null)}
        title="Decline Emergency Transfer Request"
        description={`Provide a mandatory operational reason for declining case ${declineTarget?.case_id}. Coordinators will be notified to review alternative hospitals.`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slateText mb-1.5 block">
              Reason for Decline (Required)
            </label>
            <textarea
              rows={3}
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              placeholder="e.g. Critical care capacity saturated; Adult trauma bays currently full."
              className="field w-full text-xs"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              onClick={() => setDeclineTarget(null)}
              className="btn btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              disabled={!declineReason.trim() || busy}
              onClick={handleDeclineSubmit}
              className="btn btn-primary text-xs bg-critical hover:bg-critical/90"
            >
              Confirm Decline
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* =====================================================================
   3. Simulated Resource Inventory (CAS Concurrency Protection)
   ===================================================================== */
export function Resources() {
  const { user } = useAuth();
  const live = useLive();

  const [resources, setResources] = useState<Resource[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    api<Resource[]>('/resources')
      .then(setResources)
      .catch(e => setError(e.message));

    api<{ items: Case[] }>('/cases').then(r => {
      setCases(r.items);
      if (!selected && r.items.length) setSelected(r.items[0].id);
    });
  };

  useEffect(refresh, [live.events[0]?.sequence]);

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      await fn();
      setSuccess(msg);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const availableCount = resources.filter(r => r.state === 'available').length;
  const reservedCount = resources.filter(r => r.state === 'reserved').length;
  const occupiedCount = resources.filter(r => r.state === 'occupied').length;

  return (
    <>
      <PageHeader
        tag="Simulated Clinical Capacity"
        title="Hospital Resource Inventory"
        description="Simulated emergency department beds, ICU ventilators, and resuscitation bays. Protected by Compare-and-Swap (CAS) optimistic concurrency to prevent duplicate reservations."
      />

      <Notice error={error} success={success} />

      {/* Resource Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Tracked Assets"
          value={resources.length}
          subtext="Simulated inventory"
          icon={Layers}
          variant="brand"
        />
        <MetricCard
          label="Available"
          value={availableCount}
          subtext="Ready for reservation"
          icon={CheckCircle2}
          variant="success"
        />
        <MetricCard
          label="Reserved"
          value={reservedCount}
          subtext="Assigned to en-route case"
          icon={Clock}
          variant="warning"
        />
        <MetricCard
          label="Occupied"
          value={occupiedCount}
          subtext="In clinical use"
          icon={Bed}
          variant="neutral"
        />
      </div>

      {/* Target Case Selector */}
      <div className="card p-5 mb-6 bg-white border border-surface-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slateText mb-1.5 block">
              Active Case to Associate with Resource Reservation
            </label>
            <select
              className="field w-full max-w-xl text-sm"
              value={selected}
              onChange={e => setSelected(e.target.value)}
            >
              <option value="">Select a case…</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.complaint.slice(0, 60)}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slateText max-w-sm leading-relaxed">
            Reservations require an active emergency case reference. Resources must be explicitly released when no longer needed.
          </p>
        </div>
      </div>

      {/* Resource Table / Grid */}
      <Panel
        title="Simulated Registered Assets"
        sub={`${resources.length} mock items tracked across participating hospital centers`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-surface-border bg-slate-50 text-slateText font-semibold">
                <th className="py-3 px-4">Asset ID</th>
                <th className="py-3 px-4">Resource Type</th>
                <th className="py-3 px-4">Hospital Facility</th>
                <th className="py-3 px-4">Current State</th>
                <th className="py-3 px-4">Assigned Case</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {resources.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-charcoal">{r.id}</td>
                  <td className="py-3 px-4 capitalize font-medium text-charcoal">
                    {r.type.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 px-4 text-slateText font-medium">{r.hospital_id}</td>
                  <td className="py-3 px-4">
                    <StatusBadge value={r.state} />
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slateText">
                    {r.case_id ? (
                      <Link
                        to={`/cases/${r.case_id}`}
                        className="text-brand hover:underline font-bold"
                      >
                        {r.case_id}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {['hospital', 'admin'].includes(user!.role) ? (
                      r.state === 'available' ? (
                        <button
                          className="btn btn-secondary text-xs py-1 px-3"
                          disabled={busy || !selected}
                          onClick={() =>
                            run(
                              () => post(`/resources/${r.id}/reserve`, { case_id: selected }),
                              `Reserved ${r.id} for case ${selected}`
                            )
                          }
                        >
                          Reserve
                        </button>
                      ) : r.state === 'reserved' || r.state === 'occupied' ? (
                        <button
                          className="btn btn-secondary text-xs py-1 px-3"
                          disabled={busy}
                          onClick={() =>
                            run(
                              () => post(`/resources/${r.id}/release`, {}),
                              `Released ${r.id} back to inventory`
                            )
                          }
                        >
                          Release
                        </button>
                      ) : (
                        '—'
                      )
                    ) : (
                      <span className="text-slateText text-xs">View only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {resources.length === 0 && (
            <div className="p-8">
              <EmptyState message="No simulated resources registered in the database." />
            </div>
          )}
        </div>
      </Panel>

      {/* Concurrency Info Box */}
      <div className="card p-5 mt-6 bg-slate-50 border border-surface-border flex items-start gap-3">
        <ShieldCheck size={20} className="text-brand shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-charcoal">
            Compare-and-Swap (CAS) Concurrency Guarantee
          </h4>
          <p className="text-xs text-slateText leading-relaxed mt-1">
            Simultaneous reservation attempts on the same asset are arbitrated via atomic CAS version checks. If two coordinators or hospitals submit reservations concurrently, only the first request succeeds; subsequent requests return an HTTP 409 Conflict with an updated state payload.
          </p>
        </div>
      </div>
    </>
  );
}
