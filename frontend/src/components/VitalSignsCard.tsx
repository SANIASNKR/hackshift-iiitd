import React, { useState } from 'react';
import { Activity, Heart, Wind, Gauge, Brain, Thermometer, AlertTriangle, CheckCircle2, Edit3, Save, X } from 'lucide-react';
import { evaluateHeartRate, evaluateSpO2, evaluateBloodPressure, evaluateGCS, VitalStatus } from '../lib/theme';

export interface VitalRecord {
  heartRate: number;
  spo2: number;
  systolicBP: number;
  diastolicBP: number;
  respiratoryRate: number;
  gcs: number;
  temperatureC?: number;
  lastUpdated?: string;
}

interface VitalSignsCardProps {
  vitals: VitalRecord;
  patientName?: string;
  onUpdateVitals?: (updated: VitalRecord) => void;
  readOnly?: boolean;
}

export const VitalSignsCard: React.FC<VitalSignsCardProps> = ({
  vitals: initialVitals,
  patientName,
  onUpdateVitals,
  readOnly = false,
}) => {
  const [vitals, setVitals] = useState<VitalRecord>(initialVitals);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<VitalRecord>(initialVitals);

  const hrStatus = evaluateHeartRate(vitals.heartRate);
  const spo2Status = evaluateSpO2(vitals.spo2);
  const bpStatus = evaluateBloodPressure(vitals.systolicBP, vitals.diastolicBP);
  const gcsStatus = evaluateGCS(vitals.gcs);

  const hasCritical =
    hrStatus.status === 'critical' ||
    spo2Status.status === 'critical' ||
    bpStatus.status === 'critical' ||
    gcsStatus.status === 'critical';

  const hasWarning =
    hrStatus.status === 'warning' ||
    spo2Status.status === 'warning' ||
    bpStatus.status === 'warning' ||
    gcsStatus.status === 'warning';

  const getStatusBadge = (status: VitalStatus, label?: string) => {
    if (status === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
          <AlertTriangle className="w-3 h-3 text-rose-400" />
          {label || 'CRITICAL'}
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          {label || 'ABNORMAL'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        STABLE
      </span>
    );
  };

  const handleSave = () => {
    setVitals(draft);
    setIsEditing(false);
    if (onUpdateVitals) {
      onUpdateVitals({
        ...draft,
        lastUpdated: new Date().toISOString(),
      });
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all ${
        hasCritical
          ? 'bg-[#181a24] border-rose-500/50 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/40'
          : hasWarning
          ? 'bg-[#142333] border-amber-500/40 shadow-md'
          : 'bg-[#142B3B] border-slate-700/60 shadow-md'
      } p-4 sm:p-5 text-white`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl ${
              hasCritical ? 'bg-rose-500/20 text-rose-400' : 'bg-brand-500/20 text-brand-400'
            }`}
          >
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-100 flex items-center gap-2">
              Clinical Vitals Monitor
              {patientName && (
                <span className="text-xs font-normal text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                  {patientName}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              {vitals.lastUpdated
                ? `Last telemetry update: ${new Date(vitals.lastUpdated).toLocaleTimeString()}`
                : 'Real-time telemetry stream'}
            </p>
          </div>
        </div>

        {!readOnly && (
          <div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraft(vitals);
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-400" /> Quick Update
              </button>
            )}
          </div>
        )}
      </div>

      {/* Critical Alert Bar */}
      {hasCritical && (
        <div className="mb-4 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-rose-200 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
          <span>Immediate Clinical Attention: One or more telemetry parameters exceed safety thresholds.</span>
        </div>
      )}

      {/* Vitals Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Heart Rate */}
        <div className="bg-[#0D2232] rounded-xl p-3 border border-slate-700/60 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <Heart className="w-3.5 h-3.5 text-rose-400" /> Pulse / HR
            </span>
            {getStatusBadge(hrStatus.status, hrStatus.message)}
          </div>
          {isEditing ? (
            <input
              type="number"
              value={draft.heartRate}
              onChange={(e) => setDraft({ ...draft, heartRate: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-lg font-bold text-white focus:outline-none focus:border-brand-400"
            />
          ) : (
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black tracking-tight text-white font-mono">{vitals.heartRate}</span>
              <span className="text-xs text-slate-400 font-medium">BPM</span>
            </div>
          )}
        </div>

        {/* SpO2 */}
        <div className="bg-[#0D2232] rounded-xl p-3 border border-slate-700/60 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <Wind className="w-3.5 h-3.5 text-cyan-400" /> SpO₂
            </span>
            {getStatusBadge(spo2Status.status, spo2Status.message)}
          </div>
          {isEditing ? (
            <input
              type="number"
              value={draft.spo2}
              onChange={(e) => setDraft({ ...draft, spo2: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-lg font-bold text-white focus:outline-none focus:border-brand-400"
            />
          ) : (
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black tracking-tight text-white font-mono">{vitals.spo2}</span>
              <span className="text-xs text-slate-400 font-medium">%</span>
            </div>
          )}
        </div>

        {/* Blood Pressure */}
        <div className="bg-[#0D2232] rounded-xl p-3 border border-slate-700/60 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <Gauge className="w-3.5 h-3.5 text-amber-400" /> NIBP
            </span>
            {getStatusBadge(bpStatus.status, bpStatus.message)}
          </div>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={draft.systolicBP}
                onChange={(e) => setDraft({ ...draft, systolicBP: Number(e.target.value) })}
                className="w-16 bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-base font-bold text-white"
                placeholder="Sys"
              />
              <span className="text-slate-400">/</span>
              <input
                type="number"
                value={draft.diastolicBP}
                onChange={(e) => setDraft({ ...draft, diastolicBP: Number(e.target.value) })}
                className="w-16 bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-base font-bold text-white"
                placeholder="Dia"
              />
            </div>
          ) : (
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black tracking-tight text-white font-mono">
                {vitals.systolicBP}/{vitals.diastolicBP}
              </span>
              <span className="text-xs text-slate-400 font-medium">mmHg</span>
            </div>
          )}
        </div>

        {/* GCS */}
        <div className="bg-[#0D2232] rounded-xl p-3 border border-slate-700/60 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <Brain className="w-3.5 h-3.5 text-indigo-400" /> GCS Scale
            </span>
            {getStatusBadge(gcsStatus.status, gcsStatus.message)}
          </div>
          {isEditing ? (
            <input
              type="number"
              min="3"
              max="15"
              value={draft.gcs}
              onChange={(e) => setDraft({ ...draft, gcs: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-lg font-bold text-white"
            />
          ) : (
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black tracking-tight text-white font-mono">{vitals.gcs}</span>
              <span className="text-xs text-slate-400 font-medium">/ 15</span>
            </div>
          )}
        </div>

        {/* Respiratory Rate */}
        <div className="bg-[#0D2232] rounded-xl p-3 border border-slate-700/60 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> Resp Rate
            </span>
            <span className="text-[10px] text-slate-400 font-mono">RPM</span>
          </div>
          {isEditing ? (
            <input
              type="number"
              value={draft.respiratoryRate}
              onChange={(e) => setDraft({ ...draft, respiratoryRate: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-lg font-bold text-white"
            />
          ) : (
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black tracking-tight text-white font-mono">{vitals.respiratoryRate}</span>
              <span className="text-xs text-slate-400 font-medium">br/min</span>
            </div>
          )}
        </div>

        {/* Temperature */}
        <div className="bg-[#0D2232] rounded-xl p-3 border border-slate-700/60 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <Thermometer className="w-3.5 h-3.5 text-amber-300" /> Core Temp
            </span>
            <span className="text-[10px] text-slate-400 font-mono">°C</span>
          </div>
          {isEditing ? (
            <input
              type="number"
              step="0.1"
              value={draft.temperatureC || 36.8}
              onChange={(e) => setDraft({ ...draft, temperatureC: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-lg font-bold text-white"
            />
          ) : (
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black tracking-tight text-white font-mono">
                {vitals.temperatureC ? vitals.temperatureC.toFixed(1) : '36.8'}
              </span>
              <span className="text-xs text-slate-400 font-medium">°C</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
