/**
 * AyuStream AI — Clinical Design Tokens & Theme Utilities
 * High-contrast, WCAG 2.1 AA compliant styling tokens for EMS monitors and mobile crew devices.
 */

export type TriagePriority = 'CRITICAL' | 'URGENT' | 'DELAYED' | 'EXPECTANT' | 'MINOR';
export type AmbulanceStatus = 'DISPATCHED' | 'EN_ROUTE' | 'AT_SCENE' | 'TRANSPORTING' | 'AT_HOSPITAL' | 'AVAILABLE';
export type VitalStatus = 'normal' | 'warning' | 'critical';

export interface TriageConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
  border: string;
  glow: string;
  iconColor: string;
}

export const TRIAGE_TOKENS: Record<TriagePriority, TriageConfig> = {
  CRITICAL: {
    label: 'Triage 1 - Critical (Immediate)',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-400',
    border: 'border-rose-500/40',
    glow: 'shadow-rose-500/20 shadow-lg',
    iconColor: '#f43f5e',
  },
  URGENT: {
    label: 'Triage 2 - Urgent (15 min)',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-400',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-500/20 shadow-md',
    iconColor: '#f59e0b',
  },
  DELAYED: {
    label: 'Triage 3 - Delayed (60 min)',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-400',
    border: 'border-emerald-500/40',
    glow: 'shadow-emerald-500/20 shadow-sm',
    iconColor: '#10b981',
  },
  EXPECTANT: {
    label: 'Triage 0 - Expectant / Palliative',
    badgeBg: 'bg-slate-700/40',
    badgeText: 'text-slate-300',
    border: 'border-slate-600',
    glow: 'none',
    iconColor: '#94a3b8',
  },
  MINOR: {
    label: 'Triage 4 - Minor (Walking Wounded)',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-400',
    border: 'border-blue-500/40',
    glow: 'none',
    iconColor: '#38bdf8',
  },
};

export const AMBULANCE_STATUS_TOKENS: Record<AmbulanceStatus, { label: string; badge: string; dot: string }> = {
  DISPATCHED: {
    label: 'Dispatched',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400 animate-pulse',
  },
  EN_ROUTE: {
    label: 'En Route to Scene',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    dot: 'bg-blue-400 animate-pulse',
  },
  AT_SCENE: {
    label: 'At Patient Scene',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400',
  },
  TRANSPORTING: {
    label: 'Transporting to Hospital',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    dot: 'bg-rose-400 animate-ping',
  },
  AT_HOSPITAL: {
    label: 'At Hospital (Handoff)',
    badge: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    dot: 'bg-teal-400',
  },
  AVAILABLE: {
    label: 'Available on Standby',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
};

export interface VitalCheckResult {
  status: VitalStatus;
  message?: string;
}

export function evaluateHeartRate(hr: number): VitalCheckResult {
  if (hr <= 0) return { status: 'normal' };
  if (hr < 45 || hr > 140) return { status: 'critical', message: hr < 45 ? 'Severe Bradycardia' : 'Severe Tachycardia' };
  if (hr < 60 || hr > 100) return { status: 'warning', message: hr < 60 ? 'Mild Bradycardia' : 'Tachycardia' };
  return { status: 'normal' };
}

export function evaluateSpO2(spo2: number): VitalCheckResult {
  if (spo2 <= 0) return { status: 'normal' };
  if (spo2 < 88) return { status: 'critical', message: 'Critical Hypoxemia' };
  if (spo2 < 94) return { status: 'warning', message: 'Mild Hypoxia' };
  return { status: 'normal' };
}

export function evaluateBloodPressure(systolic: number, diastolic: number): VitalCheckResult {
  if (systolic <= 0 || diastolic <= 0) return { status: 'normal' };
  if (systolic < 80 || systolic > 180 || diastolic > 110) {
    return { status: 'critical', message: systolic < 80 ? 'Hypotensive Shock' : 'Hypertensive Crisis' };
  }
  if (systolic < 90 || systolic > 140 || diastolic > 90) {
    return { status: 'warning', message: systolic < 90 ? 'Low BP' : 'Elevated BP' };
  }
  return { status: 'normal' };
}

export function evaluateGCS(gcs: number): VitalCheckResult {
  if (gcs <= 0) return { status: 'normal' };
  if (gcs <= 8) return { status: 'critical', message: 'Severe Coma / Intubation Needed' };
  if (gcs <= 12) return { status: 'warning', message: 'Moderate Altered Mental Status' };
  return { status: 'normal' };
}

export function formatETA(minutes: number): string {
  if (minutes <= 0) return '< 1 min';
  if (minutes === 1) return '1 min';
  if (minutes < 60) return `${Math.round(minutes)} mins`;
  const hrs = Math.floor(minutes / 60);
  const remainingMins = Math.round(minutes % 60);
  return `${hrs}h ${remainingMins}m`;
}

export function formatDistanceKm(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}
