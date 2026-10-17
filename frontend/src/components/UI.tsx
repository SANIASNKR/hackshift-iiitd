import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff,
  Radio,
  FileQuestion,
  HelpCircle,
  Activity,
  ChevronRight,
  Info,
  Heart,
  Thermometer,
  Wind,
  Gauge
} from 'lucide-react';

/* 1. Humanized Status Dictionary */
const STATUS_LABELS: Record<string, { label: string; type: 'success' | 'warning' | 'critical' | 'neutral' }> = {
  // Case statuses
  active: { label: 'Active Case', type: 'success' },
  waiting_hospital: { label: 'Waiting for hospital response', type: 'warning' },
  handover_ready: { label: 'Report ready for review', type: 'neutral' },
  destination_confirmed: { label: 'Destination confirmed', type: 'success' },
  arrived: { label: 'Arrived at emergency bay', type: 'success' },
  closed: { label: 'Case closed', type: 'neutral' },
  draft: { label: 'Draft', type: 'neutral' },
  declined: { label: 'Hospital declined', type: 'critical' },
  smartroute_required: { label: 'Alternative routing needed', type: 'warning' },
  waiting_alternative: { label: 'Waiting for alternative response', type: 'warning' },

  // Readiness statuses
  ready: { label: 'Ready to receive', type: 'success' },
  limited: { label: 'Limited capacity', type: 'warning' },
  unable: { label: 'Unable to accept', type: 'critical' },
  stale: { label: 'Readiness stale (verify)', type: 'warning' },
  awaiting: { label: 'Awaiting status update', type: 'warning' },
  unreachable: { label: 'Unreachable', type: 'critical' },

  // Clinical report statuses
  extracted_needs_review: { label: 'Needs human review', type: 'warning' },
  needs_review: { label: 'Needs clinician review', type: 'warning' },
  human_confirmed: { label: 'Clinician confirmed', type: 'success' },
  processing: { label: 'Processing report…', type: 'neutral' },
  failed: { label: 'Processing failed', type: 'critical' },

  // Acceptance statuses
  pending: { label: 'Pending response', type: 'warning' },
  accepted: { label: 'Case accepted', type: 'success' },
  expired: { label: 'Request expired (escalated)', type: 'critical' },

  // Resource statuses
  available: { label: 'Available', type: 'success' },
  reserved: { label: 'Reserved', type: 'warning' },
  occupied: { label: 'Occupied', type: 'neutral' },
  unavailable: { label: 'Unavailable', type: 'critical' },

  // Default / Unknown
  unknown: { label: 'Unknown', type: 'neutral' }
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const normalized = (value || 'unknown').toLowerCase().trim();
  const config = STATUS_LABELS[normalized] || {
    label: normalized.replace(/_/g, ' '),
    type: 'neutral' as const
  };

  const styleMap = {
    success: 'bg-[#E8F5EE] text-[#16875D] border-[#D1EAD8]',
    warning: 'bg-[#FCF4E9] text-[#D28A21] border-[#F6DFBA]',
    critical: 'bg-[#FAEDED] text-[#C84848] border-[#F5D3D3]',
    neutral: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
  };

  const dotMap = {
    success: 'bg-[#16875D]',
    warning: 'bg-[#D28A21]',
    critical: 'bg-[#C84848]',
    neutral: 'bg-[#64748B]'
  };

  const isLivePulse = config.type === 'critical' || normalized === 'active';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold border ${styleMap[config.type]} shadow-xs`}
    >
      {isLivePulse ? (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotMap[config.type]}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotMap[config.type]}`} />
        </span>
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${dotMap[config.type]}`} />
      )}
      <span className="capitalize">{config.label}</span>
    </span>
  );
}

// Backwards compatibility alias
export const Status = StatusBadge;

/* 2. Connection Status Indicator */
export function ConnectionStatus({
  status,
  lastSync
}: {
  status: string;
  lastSync?: string | null;
}) {
  const isOnline = status === 'connected';
  const isReconnecting = status === 'connecting' || status === 'reconnecting';

  return (
    <div className="flex items-center gap-2">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
          isOnline
            ? 'bg-[#E8F5EE] text-[#16875D] border-[#D1EAD8]'
            : isReconnecting
            ? 'bg-[#FCF4E9] text-[#D28A21] border-[#F6DFBA]'
            : 'bg-[#FAEDED] text-[#C84848] border-[#F5D3D3]'
        }`}
      >
        {isOnline ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16875D] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16875D]" />
          </span>
        ) : isReconnecting ? (
          <WifiOff size={13} className="text-[#D28A21] animate-pulse" />
        ) : (
          <WifiOff size={13} className="text-[#C84848]" />
        )}
        <span className="capitalize font-semibold">
          {isOnline ? 'Live' : isReconnecting ? 'Reconnecting…' : 'Offline'}
        </span>
      </div>
      {lastSync && (
        <span className="hidden md:inline-block text-[11.5px] text-slateText">
          Synced {lastSync}
        </span>
      )}
    </div>
  );
}

/* 3. Page Header */
export function PageHeader({
  tag,
  title,
  description,
  children
}: {
  tag?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap justify-between items-start gap-4">
      <div>
        {tag && (
          <div className="text-[11px] font-semibold tracking-wider uppercase text-slateText mb-1.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {tag}
          </div>
        )}
        <h1 className="page-title">{title}</h1>
        {description && (
          <p className="text-sm text-slateText mt-1.5 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5 pt-1">{children}</div>}
    </div>
  );
}

// Backwards compatibility alias
export const PageHead = PageHeader;

/* 4. Panel / Card Container */
export function Panel({
  title,
  sub,
  children,
  action,
  className = ''
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      <div className="px-5 py-3.5 border-b border-surface-border flex flex-wrap items-center justify-between gap-3 bg-gradient-to-b from-white to-slate-50/50">
        <div>
          <h2 className="text-[15.5px] font-bold text-charcoal leading-tight font-display tracking-tight">{title}</h2>
          {sub && <p className="text-xs text-slateText mt-0.5 leading-normal font-medium">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* 5. Metric Card */
export function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'neutral'
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ElementType;
  variant?: 'brand' | 'success' | 'warning' | 'critical' | 'neutral';
}) {
  const iconStyle = {
    brand: 'text-brand bg-brand-light border border-brand/20',
    success: 'text-success bg-success-light border border-success/20',
    warning: 'text-warning bg-warning-light border border-warning/20',
    critical: 'text-critical bg-critical-light border border-critical/20',
    neutral: 'text-slateText bg-slate-100 border border-slate-200'
  }[variant];

  const borderAccent = {
    brand: 'hover:border-brand/40',
    success: 'hover:border-success/40',
    warning: 'hover:border-warning/40',
    critical: 'hover:border-critical/40',
    neutral: 'hover:border-slate-300'
  }[variant];

  return (
    <div className={`card card-interactive p-4 sm:p-5 flex flex-col justify-between ${borderAccent} relative overflow-hidden group`}>
      <div className="flex justify-between items-start gap-2 relative z-10">
        <span className="text-[11.5px] font-bold uppercase tracking-wider text-slateText">{label}</span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${iconStyle} transition-transform duration-200 group-hover:scale-110 shadow-xs`}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="mt-3 relative z-10">
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal font-display">{value}</div>
        {subtext && <div className="text-xs text-slateText mt-1 font-medium">{subtext}</div>}
      </div>
    </div>
  );
}

/* 6. Alert Notices */
export function Notice({
  error,
  success,
  info,
  warning
}: {
  error?: string | null;
  success?: string | null;
  info?: string | null;
  warning?: string | null;
}) {
  return (
    <>
      {error && (
        <div
          role="alert"
          className="flex gap-2.5 items-start rounded-lg border border-[#F8D7D7] bg-[#FAEDED] p-3 text-sm text-[#C84848] mb-4"
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}
      {warning && (
        <div
          role="alert"
          className="flex gap-2.5 items-start rounded-lg border border-[#F6DFBA] bg-[#FCF4E9] p-3 text-sm text-[#D28A21] mb-4"
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{warning}</div>
        </div>
      )}
      {success && (
        <div
          role="status"
          className="flex gap-2.5 items-start rounded-lg border border-[#D1EAD8] bg-[#E8F5EE] p-3 text-sm text-[#16875D] mb-4"
        >
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{success}</div>
        </div>
      )}
      {info && (
        <div
          role="status"
          className="flex gap-2.5 items-start rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm text-[#475569] mb-4"
        >
          <Info size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1">{info}</div>
        </div>
      )}
    </>
  );
}

/* 7. Loading Skeletons */
export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="p-6 space-y-3 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-slate-100 rounded w-full" />
      ))}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex items-center justify-center gap-2.5 text-sm text-slateText p-10">
      <div className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      <span>Loading clinical records…</span>
    </div>
  );
}

/* 8. Empty States */
export function EmptyState({
  title = 'No records available',
  message = 'There are no active items in this view.',
  action
}: {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12 px-4 max-w-sm mx-auto">
      <div className="w-12 h-12 rounded-full bg-surface-subtle text-slateText flex items-center justify-center mx-auto mb-3">
        <FileQuestion size={22} />
      </div>
      <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
      <p className="text-xs text-slateText mt-1 mb-4 leading-relaxed">{message}</p>
      {action}
    </div>
  );
}

// Backwards compatibility alias
export function Empty({ message = 'No records yet.' }: { message?: string }) {
  return <EmptyState message={message} />;
}

/* 9. Vital Sign Card */
export function VitalSignCard({
  label,
  value,
  unit,
  source,
  timestamp
}: {
  label: string;
  value: string;
  unit?: string;
  source?: string;
  timestamp?: string;
}) {
  const normLabel = label.toLowerCase().trim();
  
  // Icon selector based on vital sign type
  const getVitalMeta = () => {
    if (normLabel.includes('heart') || normLabel.includes('pulse') || normLabel === 'hr') {
      return { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50 border-rose-100', pulse: true };
    }
    if (normLabel.includes('pressure') || normLabel.includes('bp')) {
      return { icon: Gauge, color: 'text-brand', bg: 'bg-brand-50 border-brand/20', pulse: false };
    }
    if (normLabel.includes('spo2') || normLabel.includes('oxygen') || normLabel.includes('sat')) {
      return { icon: Activity, color: 'text-sky-500', bg: 'bg-sky-50 border-sky-100', pulse: false };
    }
    if (normLabel.includes('temp')) {
      return { icon: Thermometer, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100', pulse: false };
    }
    if (normLabel.includes('resp') || normLabel.includes('rr')) {
      return { icon: Wind, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-100', pulse: false };
    }
    return { icon: Activity, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', pulse: false };
  };

  const meta = getVitalMeta();
  const IconComponent = meta.icon;

  return (
    <div className="card card-interactive p-3.5 bg-white border border-surface-border flex flex-col justify-between group hover:border-brand/40 shadow-xs">
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slateText capitalize truncate">
          {label.replace(/_/g, ' ')}
        </span>
        <div className={`p-1.5 rounded-lg border ${meta.bg} ${meta.color} shrink-0`}>
          <IconComponent size={13} className={meta.pulse ? 'animate-pulse' : ''} />
        </div>
      </div>
      
      <div className="mt-2 mb-1">
        <span className="font-mono text-xl sm:text-2xl font-black text-charcoal tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-semibold text-slateText ml-1">
            {unit}
          </span>
        )}
      </div>

      {source && (
        <div className="text-[10.5px] text-slateText pt-2 border-t border-surface-border/60 flex items-center justify-between">
          <span className="truncate">{source}</span>
          {timestamp && <span className="shrink-0">{timestamp}</span>}
        </div>
      )}
    </div>
  );
}

/* 10. Missing Information Panel */
export function MissingInformationPanel({ missing = [] }: { missing: string[] }) {
  if (!missing || missing.length === 0) {
    return (
      <div className="text-xs text-success flex items-center gap-1.5 p-3 rounded-lg bg-success-light border border-[#D1EAD8]">
        <CheckCircle2 size={14} />
        <span>All essential clinical fields provided</span>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-lg bg-warning-light border border-[#F6DFBA]">
      <div className="text-xs font-semibold text-warning-dark mb-2 flex items-center gap-1.5">
        <AlertTriangle size={14} />
        <span>Missing Information (Not Reported)</span>
      </div>
      <p className="text-xs text-slateText mb-2.5">
        These fields were not stated in the verbal report. They remain explicitly unverified.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {missing.map(field => (
          <span
            key={field}
            className="text-[11px] bg-white border border-[#E5EAE9] text-[#785419] px-2 py-0.5 rounded font-medium capitalize"
          >
            {field.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}

/* 11. Clinical Conflict Alert */
export function ClinicalConflictAlert({
  field,
  leftValue,
  leftSource,
  rightValue,
  rightSource,
  onResolve
}: {
  field: string;
  leftValue: string;
  leftSource: string;
  rightValue: string;
  rightSource: string;
  onResolve?: () => void;
}) {
  return (
    <div className="rounded-lg border border-[#F8D7D7] bg-[#FAEDED] p-4 text-xs">
      <div className="flex items-center gap-2 font-bold text-[#C84848] mb-1.5">
        <AlertTriangle size={15} />
        <span className="capitalize">{field.replace(/_/g, ' ')} Discrepancy Detected</span>
      </div>
      <p className="text-[#842A2A] leading-relaxed mb-3">
        Two differing observations have been recorded. Both source values are preserved until authorized human resolution.
      </p>
      <div className="grid sm:grid-cols-2 gap-2 mb-3 bg-white p-2.5 rounded border border-[#F5D3D3]">
        <div>
          <div className="text-[10.5px] uppercase font-semibold text-slateText">{leftSource}</div>
          <div className="font-bold text-charcoal text-sm">{leftValue}</div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase font-semibold text-slateText">{rightSource}</div>
          <div className="font-bold text-charcoal text-sm">{rightValue}</div>
        </div>
      </div>
      {onResolve && (
        <button
          onClick={onResolve}
          className="btn btn-secondary text-xs py-1.5 px-3 border-[#F5D3D3] text-[#842A2A] hover:bg-white"
        >
          Resolve with Clinician Note
        </button>
      )}
    </div>
  );
}

/* 12. Step Progress Indicator (For Guided Intake) */
export function StepProgressIndicator({
  steps,
  currentStep
}: {
  steps: { number: number; title: string; subtitle?: string }[];
  currentStep: number;
}) {
  return (
    <div className="card p-3 sm:p-4 mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {steps.map(s => {
          const isDone = s.number < currentStep;
          const isCurrent = s.number === currentStep;

          return (
            <div
              key={s.number}
              className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                isCurrent ? 'bg-brand-50 border border-brand/20' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                  isDone
                    ? 'bg-success text-white'
                    : isCurrent
                    ? 'bg-brand text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isDone ? <CheckCircle2 size={14} /> : s.number}
              </div>
              <div className="min-w-0">
                <div
                  className={`text-xs font-semibold truncate ${
                    isCurrent ? 'text-brand-dark' : isDone ? 'text-charcoal' : 'text-slateText'
                  }`}
                >
                  {s.title}
                </div>
                {s.subtitle && (
                  <div className="text-[11px] text-slateText truncate hidden sm:block">
                    {s.subtitle}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* 13. Accessible Modal Dialog */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg'
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-2xl shadow-xl border border-surface-border w-full ${maxWidth} overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200`}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-6 py-5 border-b border-surface-border flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-charcoal">{title}</h3>
            {description && <p className="text-xs text-slateText mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slateText hover:text-charcoal p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
