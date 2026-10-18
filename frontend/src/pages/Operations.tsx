import React, { useEffect, useState } from 'react';
import {
  Activity,
  RefreshCcw,
  WifiOff,
  ShieldAlert,
  FlaskConical,
  CheckCircle2,
  Clock,
  Radio,
  AlertTriangle,
  BarChart3,
  Users,
  Building2,
  ShieldCheck,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  Server,
  Zap,
  Info,
  KeyRound,
  Trash2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { api, post, EventData, Hospital, User, pretty, short } from '../lib/api';
import { useLive } from '../lib/live';
import {
  EmptyState,
  LoadingSkeleton,
  Notice,
  PageHeader,
  Panel,
  StatusBadge,
  MetricCard,
  Modal
} from '../components/UI';

/* =====================================================================
   1. Real-Time Event Monitor (LiveMonitor)
   ===================================================================== */
export function LiveMonitor() {
  const live = useLive();
  const [serverEvents, setServerEvents] = useState<EventData[]>([]);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = () =>
    api<{ events: EventData[] }>('/events?limit=100')
      .then(r => setServerEvents(r.events.reverse()))
      .catch(e => setError(e.message));

  useEffect(() => {
    void load();
  }, [live.events[0]?.sequence]);

  const all = [...live.events, ...serverEvents]
    .filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i)
    .sort((a, b) => b.sequence - a.sequence);

  const filtered = all.filter(ev => {
    if (filterType === 'all') return true;
    if (filterType === 'case') return ev.event_type.startsWith('case.');
    if (filterType === 'acceptance') return ev.event_type.startsWith('acceptance.');
    if (filterType === 'readiness') return ev.event_type.startsWith('hospital.');
    if (filterType === 'resource') return ev.event_type.startsWith('resource.');
    if (filterType === 'system') return !ev.case_id;
    return true;
  });

  return (
    <>
      <PageHeader
        tag="WebSocket Protocol & Persistence"
        title="Real-Time Event Monitor"
        description="Stream of database-persisted events delivered via role-filtered WebSocket connections. Includes transport acknowledgements and sequence-based reconnection replay."
      >
        <button
          className="btn btn-secondary flex items-center gap-2 text-xs"
          onClick={() => {
            live.reload();
            load();
          }}
        >
          <RefreshCcw size={14} />
          <span>Force Reconnect & Sync</span>
        </button>
      </PageHeader>

      <Notice error={error} />

      {/* Connection & Persistence Status Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <MetricCard
          label="Transport Connection"
          value={live.status === 'connected' ? 'Live Stream' : live.status === 'reconnecting' ? 'Reconnecting' : 'Offline'}
          subtext="WebSocket client pipeline"
          icon={live.status === 'connected' ? Activity : WifiOff}
          variant={live.status === 'connected' ? 'success' : live.status === 'reconnecting' ? 'warning' : 'critical'}
        />
        <MetricCard
          label="Last Synchronization"
          value={live.lastSync ? pretty(live.lastSync) : 'Waiting sync'}
          subtext="Client transport receipt"
          icon={Clock}
          variant="brand"
        />
        <MetricCard
          label="Persisted Event Sequence"
          value={all.length > 0 ? `#${all[0].sequence}` : '0'}
          subtext={`${all.length} visible local events`}
          icon={Server}
          variant="neutral"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {[
          { id: 'all', label: 'All Events' },
          { id: 'case', label: 'Case Incidents' },
          { id: 'acceptance', label: 'Hospital Responses' },
          { id: 'readiness', label: 'ED Readiness' },
          { id: 'resource', label: 'Asset Locks' },
          { id: 'system', label: 'System Audit' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterType === tab.id
                ? 'bg-brand text-white shadow-xs'
                : 'bg-white text-slateText border border-surface-border hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chronological Event Feed */}
      <Panel
        title="Persisted Event Stream"
        sub="Strictly ordered by server database sequence number (not client local time)"
        action={
          <div className="text-xs text-slateText flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                live.status === 'connected' ? 'bg-success animate-pulse' : 'bg-critical'
              }`}
            />
            <span>{live.status === 'connected' ? 'Live push active' : 'Replay queued upon reconnect'}</span>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState message="No events match the selected filter. Run a scenario in the Failure Simulator or create a new case to observe real-time events." />
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {filtered.slice(0, 75).map(ev => {
              const isExpanded = expandedId === ev.sequence;
              const hasPayload = ev.payload && Object.keys(ev.payload).length > 0;

              return (
                <div
                  key={ev.id || ev.sequence}
                  className="p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-brand-light text-brand flex items-center justify-center shrink-0 mt-0.5">
                      <Activity size={17} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-slateText bg-slate-100 px-1.5 py-0.5 rounded">
                            #{ev.sequence}
                          </span>
                          <h4 className="text-sm font-bold text-charcoal">
                            {ev.event_type.replace(/\./g, ' · ').replace(/_/g, ' ')}
                          </h4>
                        </div>
                        <span className="text-xs text-slateText">{pretty(ev.occurred_at)}</span>
                      </div>

                      <div className="text-xs text-slateText mt-1 flex flex-wrap items-center gap-2.5">
                        {ev.case_id && (
                          <span>
                            Case: <strong className="text-charcoal font-mono">{ev.case_id}</strong>
                          </span>
                        )}
                        {ev.hospital_id && (
                          <span>
                            Hospital:{' '}
                            <strong className="text-charcoal">{ev.hospital_id}</strong>
                          </span>
                        )}
                        <span>UUID: {ev.id.slice(0, 8)}…</span>
                      </div>

                      {/* Expandable Payload */}
                      {hasPayload && (
                        <div className="mt-2.5">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : ev.sequence)}
                            className="text-[11.5px] font-medium text-brand hover:underline inline-flex items-center gap-1"
                          >
                            <span>{isExpanded ? 'Hide Payload' : 'Inspect Event Payload'}</span>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>

                          {isExpanded && (
                            <pre className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed">
                              {JSON.stringify(ev.payload, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Transport-Level Disclaimer Card */}
      <div className="card p-5 mt-6 bg-slate-50 border border-surface-border flex items-start gap-3.5">
        <ShieldAlert size={20} className="text-warning shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-charcoal">
            Transport-Level Event Acknowledgement Notice
          </h4>
          <p className="text-xs text-slateText leading-relaxed mt-1">
            WebSocket ACK confirmation verifies that the client socket successfully received and unpacked the JSON event envelope. It does <em>not</em> represent clinical review or medical approval. In disconnected environments, paramedics and hospital staff must use verified backup channels (e.g., VHF radio or telephone) for immediate life safety coordination.
          </p>
        </div>
      </div>
    </>
  );
}

/* =====================================================================
   2. Restrained Coordination Analytics
   ===================================================================== */
type Metrics = {
  case_count: number;
  case_status: Record<string, number>;
  acceptances: {
    accepted: number;
    declined: number;
    pending: number;
  };
  mean_hospital_response_seconds: number | null;
  destination_changes: number;
  open_conflicts: number;
  resource_actions: number;
  reported_missing_fields: number;
  events_persisted: number;
};

export function Analytics() {
  const live = useLive();
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Metrics>('/analytics')
      .then(setData)
      .catch(e => setError(e.message));
  }, [live.events[0]?.sequence]);

  const acceptanceChartData = data
    ? [
        { name: 'Accepted', value: data.acceptances.accepted, color: '#16875D' },
        { name: 'Declined', value: data.acceptances.declined, color: '#C84848' },
        { name: 'Pending Review', value: data.acceptances.pending, color: '#D28A21' }
      ]
    : [];

  return (
    <>
      <PageHeader
        tag="Persisted Operational Metrics"
        title="Coordination Analytics"
        description="Measures derived strictly from stored synthetic records in the local database. No fabricated clinical outcomes, survival claims, or artificial percentage improvements."
      />

      <Notice error={error} />

      {!data ? (
        <LoadingSkeleton lines={4} />
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              label="Total Emergency Cases"
              value={data.case_count}
              subtext="Stored incidents"
              icon={Activity}
              variant="brand"
            />
            <MetricCard
              label="Mean Hospital Response"
              value={
                data.mean_hospital_response_seconds === null
                  ? 'No responses'
                  : `${data.mean_hospital_response_seconds}s`
              }
              subtext="From request to decision"
              icon={Clock}
              variant="neutral"
            />
            <MetricCard
              label="Destination Changes"
              value={data.destination_changes}
              subtext="Coordinator reroutes"
              icon={RefreshCcw}
              variant="warning"
            />
            <MetricCard
              label="Open Clinical Conflicts"
              value={data.open_conflicts}
              subtext="Awaiting resolution"
              icon={AlertTriangle}
              variant={data.open_conflicts > 0 ? 'critical' : 'success'}
            />
          </div>

          {/* Charts & Breakdown Grid */}
          <div className="grid xl:grid-cols-2 gap-6">
            {/* Recharts BarChart: Acceptance Decisions */}
            <Panel
              title="Hospital Acceptance Decisions"
              sub="Explicit clinician responses recorded across all facilities"
            >
              <div className="p-5 h-72">
                {acceptanceChartData.every(c => c.value === 0) ? (
                  <EmptyState message="No acceptance decisions recorded yet in this environment." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={acceptanceChartData}
                      margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5EAE9" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: '#64748B' }}
                        axisLine={{ stroke: '#E5EAE9' }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: '#64748B' }}
                        axisLine={{ stroke: '#E5EAE9' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E5EAE9',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                        }}
                      />
                      <Bar dataKey="value" name="Cases" radius={[6, 6, 0, 0]}>
                        {acceptanceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Panel>

            {/* Operational Event & Documentation Counts */}
            <Panel
              title="Operational Documentation & Activity"
              sub="Derived from stored audit records"
            >
              <div className="divide-y divide-surface-border text-xs">
                {[
                  ['Missing clinical fields flagged', data.reported_missing_fields],
                  ['Simulated resource reservations/releases', data.resource_actions],
                  ['Total event ledger sequence count', data.events_persisted],
                  ...Object.entries(data.case_status).map(([status, count]) => [
                    `Cases in state: ${status.replace(/_/g, ' ')}`,
                    count
                  ] as [string, number])
                ].map(([label, val]) => (
                  <div key={label} className="py-3 px-5 flex items-center justify-between">
                    <span className="text-slateText font-medium">{label}</span>
                    <strong className="text-charcoal font-bold text-sm">{val}</strong>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="card p-4 mt-6 bg-slate-50 border border-surface-border text-xs text-slateText leading-relaxed">
            <strong>Calculation Definition:</strong> Hospital response time measures the elapsed seconds between when a coordinator files an acceptance request and when the receiving facility clinician logs an explicit Accept or Decline decision.
          </div>
        </>
      )}
    </>
  );
}

/* =====================================================================
   3. Failure Simulator & Resilience Lab (Simulator)
   ===================================================================== */
const scenarios = [
  {
    id: 'hospital_unable',
    title: 'Hospital ED Diversion / Saturated',
    description: 'Marks City Center Hospital as unable to accept emergencies and broadcasts readiness change to all coordinators.',
    affected: 'Hospital Readiness & SmartRoute Alternative Screening'
  },
  {
    id: 'no_response',
    title: 'Unanswered Acceptance Request',
    description: 'Generates a synthetic request that exceeds response thresholds, triggering automatic coordinator escalation.',
    affected: 'Acceptance Tracking & Timeout Escalation Engine'
  },
  {
    id: 'clinical_conflict',
    title: 'Clinical Discrepancy Conflict',
    description: 'Simulates discordant heart-rate readings between paramedic voice and manual field notes, requiring human clinician arbitration.',
    affected: 'Clinical Handover Provenance & Conflict Resolution'
  },
  {
    id: 'ai_unavailable',
    title: 'AI Processing Provider Outage',
    description: 'Simulates external NLP provider downtime, verifying graceful fallback to structured manual clinical reporting without data loss.',
    affected: 'AI Clinical Extraction & Manual Handover Fallback'
  },
  {
    id: 'stale_readiness',
    title: 'Stale Readiness Expiration',
    description: 'Backdates hospital readiness timestamps by 3 hours, causing coordinators to see a stale-data warning badge.',
    affected: 'Readiness Freshness Evaluation & UI Warning Badges'
  },
  {
    id: 'resource_race',
    title: 'Resource Concurrency Race (CAS Conflict)',
    description: 'Attempts simultaneous reservation on the same ventilator; verifies first wins and second returns HTTP 409.',
    affected: 'Compare-and-Swap Database Concurrency Locks'
  }
];

export function Simulator() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const run = async (scenario: string) => {
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const r = await post<{ case_id: string }>('/demo/scenario', { scenario });
      setSuccess(`Scenario applied successfully to synthetic case ${r.case_id}. Inspect the corresponding dashboard and live event feed.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleResetConfirm = async () => {
    setResetModalOpen(false);
    setBusy(true);
    try {
      await post('/demo/reset', {});
      localStorage.removeItem('ayu-demo-token');
      localStorage.removeItem('ayu-cursor');
      window.location.href = '/login';
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        tag="Resilience & Chaos Engineering"
        title="Failure Simulator"
        description="Trigger controlled failure scenarios against locally seeded data to test error boundaries, fallback workflows, and WebSocket reconnection replay."
      >
        <button
          className="btn btn-secondary text-xs text-critical hover:bg-red-50 flex items-center gap-2"
          onClick={() => setResetModalOpen(true)}
          disabled={busy}
        >
          <Trash2 size={14} />
          <span>Reset Demo Database</span>
        </button>
      </PageHeader>

      <Notice error={error} success={success} />

      {/* Scenario Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">
        {scenarios.map((s, i) => (
          <div key={s.id} className="card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-mono text-xs font-bold text-brand bg-brand-light px-2 py-0.5 rounded">
                  Scenario {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[11px] font-semibold text-slateText uppercase">Chaos Test</span>
              </div>

              <h3 className="text-sm font-bold text-charcoal">{s.title}</h3>
              <p className="text-xs text-slateText leading-relaxed mt-2 min-h-[52px]">
                {s.description}
              </p>

              <div className="mt-3 pt-3 border-t border-surface-border text-[11px] text-slateText">
                <span className="font-semibold text-charcoal">Affected Component: </span>
                <span>{s.affected}</span>
              </div>
            </div>

            <button
              className="btn btn-primary bg-brand hover:bg-brand-600 text-white w-full mt-4 text-xs flex items-center justify-center gap-2 py-2.5 font-bold shadow-xs transition active:scale-[0.98]"
              disabled={busy}
              onClick={() => run(s.id)}
            >
              <FlaskConical size={14} />
              <span>Trigger Chaos Scenario</span>
            </button>
          </div>
        ))}
      </div>

      {/* Testing Instructions Card */}
      <div className="card p-5 mt-6 bg-slate-50 border border-surface-border flex items-start gap-3.5">
        <ShieldCheck size={20} className="text-brand shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-charcoal">Multi-Session Verification Recommendation</h4>
          <p className="text-xs text-slateText leading-relaxed mt-1">
            For maximum insight, keep two browser tabs open side by side: one logged in as Coordinator (Priya Nair) and one as Hospital ED Clinician (Dr. Aditi Sen). Triggering a scenario will immediately broadcast WebSocket state transitions across both sessions without requiring manual page refreshes.
          </p>
        </div>
      </div>

      {/* Accessible Reset Confirmation Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Synthetic Demo Database?"
        description="This will clear all created cases, acceptance records, and real-time events, restoring the clean factory seed data. You will be redirected to the login screen."
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-critical flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>
              All unsaved test cases will be permanently cleared and seeded demonstration users will be restored.
            </span>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              onClick={() => setResetModalOpen(false)}
              className="btn btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleResetConfirm}
              className="btn btn-primary text-xs bg-critical hover:bg-critical/90"
            >
              Confirm Database Reset
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* =====================================================================
   4. Demo Configuration & User Registry (Settings)
   ===================================================================== */
export function Settings() {
  const [users, setUsers] = useState<User[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<User[]>('/users')
      .then(setUsers)
      .catch(e => setError(e.message));
    api<Hospital[]>('/hospitals')
      .then(setHospitals)
      .catch(e => setError(e.message));
  }, []);

  return (
    <>
      <PageHeader
        tag="Platform Administration"
        title="Demo Configuration & Registry"
        description="Inspect seeded demonstration accounts and participating hospital facilities. Passwords and JWT secret keys are never exposed in user-facing endpoints."
      />

      <Notice error={error} />

      <div className="grid xl:grid-cols-2 gap-6">
        {/* Seeded Users */}
        <Panel
          title="Demonstration User Accounts"
          sub="Pre-configured credentials for role-based testing"
        >
          <div className="divide-y divide-surface-border">
            {users.map(u => (
              <div key={u.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slateText">
                    <Users size={15} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-charcoal">{u.name}</div>
                    <div className="text-[11px] text-slateText">
                      Username: <code className="font-mono text-brand">{u.username}</code> ·{' '}
                      {u.hospital_id || 'System-wide'}
                    </div>
                  </div>
                </div>

                <StatusBadge value={u.role} />
              </div>
            ))}
          </div>
        </Panel>

        {/* Participating Hospitals */}
        <Panel
          title="Fictional Hospital Registry"
          sub="Participating receiving facilities in the synthetic network"
        >
          <div className="divide-y divide-surface-border">
            {hospitals.map(h => (
              <div key={h.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <Building2 size={16} className="text-slateText mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-charcoal">{h.name}</div>
                      <div className="text-[11px] text-slateText">
                        ID: <code className="font-mono">{h.id}</code> · Sector: {h.area}
                      </div>
                    </div>
                  </div>
                  <StatusBadge value={h.stale ? 'stale' : h.readiness} />
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2.5 ml-6">
                  {h.capabilities.map(cap => (
                    <span
                      key={cap}
                      className="text-[10.5px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize"
                    >
                      {cap.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Security & Non-Production Notice */}
      <div className="card p-5 mt-6 bg-slate-50 border border-surface-border flex items-start gap-3.5">
        <ShieldAlert size={20} className="text-warning shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-charcoal">
            Synthetic Environment Security Disclaimer
          </h4>
          <p className="text-xs text-slateText leading-relaxed mt-1">
            This deployment runs in demonstration mode using synthetic patient data and local SQLite persistence. It is engineered for UI/UX evaluation and resilience testing. Production deployment requires HIPAA/GDPR encrypted storage, hardware security module (HSM) key management, hospital FHIR/HL7 integration brokers, and certified telecom channels.
          </p>
        </div>
      </div>
    </>
  );
}
