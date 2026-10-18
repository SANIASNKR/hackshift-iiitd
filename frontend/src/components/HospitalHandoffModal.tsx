import React, { useState } from 'react';
import { X, Copy, Check, FileText, AlertCircle, Building2, Clock, CheckCircle2 } from 'lucide-react';
import { formatETA } from '../lib/theme';

export interface ISBARData {
  caseId: string;
  patientName: string;
  ageGender: string;
  unitId: string;
  paramedicName: string;
  hospitalName: string;
  etaMinutes: number;
  triagePriority: string;
  chiefComplaint: string;
  vitalSummary: string;
  interventionsGiven: string;
  specialNeeds: string; // e.g. "Trauma Bay 1 ready, Cath Lab on standby, 2 units O-neg"
}

interface HospitalHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ISBARData;
  onConfirmHandoff?: (data: ISBARData) => void;
}

export const HospitalHandoffModal: React.FC<HospitalHandoffModalProps> = ({
  isOpen,
  onClose,
  data,
  onConfirmHandoff,
}) => {
  const [copied, setCopied] = useState(false);
  const [specialNeeds, setSpecialNeeds] = useState(data.specialNeeds || '');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const generatedSummary = `[AYUSTREAM AI — PRE-ARRIVAL CLINICAL HANDOFF (ISBAR)]
• IDENTIFICATION:
  Patient: ${data.patientName || 'Unknown / Trauma Doe'} (${data.ageGender || 'Age Unknown'})
  Unit: ${data.unitId} | Paramedic: ${data.paramedicName || 'Crew In-Charge'}
  Destination: ${data.hospitalName} | ETA: ${formatETA(data.etaMinutes)}

• SITUATION:
  Priority: ${data.triagePriority}
  Chief Complaint: ${data.chiefComplaint}

• BACKGROUND:
  Case ID: ${data.caseId}
  Pertinent History: Unremarkable / In-transit rapid intake

• ASSESSMENT:
  Vitals: ${data.vitalSummary || 'Telemetry active on AyuStream console'}

• RECOMMENDATION:
  Immediate Needs: ${specialNeeds || 'Prepare resuscitation bay and trauma team.'}
  Generated via AyuStream AI Clinical Coordination at ${new Date().toLocaleTimeString()}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    if (onConfirmHandoff) {
      onConfirmHandoff({
        ...data,
        specialNeeds,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#142B3B] border border-slate-700/80 rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col text-white overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-700/80 flex items-center justify-between bg-[#0F2231]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-100 flex items-center gap-2">
                Pre-Arrival Hospital Handoff (ISBAR)
              </h3>
              <p className="text-xs text-slate-400">Standardized clinical communication protocol</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Destination & ETA pill */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#0C1E2B] border border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-200">
              <Building2 className="w-4 h-4 text-teal-400" />
              <span className="font-semibold text-white">{data.hospitalName}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono text-xs font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>ETA {formatETA(data.etaMinutes)}</span>
            </div>
          </div>

          {/* ISBAR Checklist Accordion / Cards */}
          <div className="space-y-2.5">
            {/* I - Identification */}
            <div className="p-3 rounded-xl bg-[#0D2232] border border-slate-700/60">
              <p className="text-[11px] font-bold text-teal-400 uppercase tracking-wider mb-1">
                I — Identification
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Patient: </span>
                  <span className="font-semibold text-slate-100">{data.patientName}</span> ({data.ageGender})
                </div>
                <div>
                  <span className="text-slate-400">Unit: </span>
                  <span className="font-mono text-slate-200">{data.unitId}</span>
                </div>
              </div>
            </div>

            {/* S - Situation */}
            <div className="p-3 rounded-xl bg-[#0D2232] border border-slate-700/60">
              <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1">
                S — Situation & Chief Complaint
              </p>
              <p className="text-xs text-slate-200">{data.chiefComplaint || 'Emergency dispatch complaint pending'}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Triage Level:</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {data.triagePriority}
                </span>
              </div>
            </div>

            {/* A - Assessment */}
            <div className="p-3 rounded-xl bg-[#0D2232] border border-slate-700/60">
              <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                A — Assessment & Vitals Summary
              </p>
              <p className="text-xs font-mono text-slate-200 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                {data.vitalSummary || 'HR: 88 BPM | SpO2: 98% | BP: 120/80 | GCS: 15/15'}
              </p>
            </div>

            {/* R - Recommendation */}
            <div className="p-3 rounded-xl bg-[#0D2232] border border-slate-700/60">
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                R — Hospital Recommendation & Preparation
              </p>
              <textarea
                value={specialNeeds}
                onChange={(e) => setSpecialNeeds(e.target.value)}
                placeholder="e.g. Prepare Resuscitation Bay 1, Blood Bank 2 Units O-Negative, Neurologist on standby..."
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 resize-none"
              />
            </div>
          </div>

          {/* Quick Notice */}
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40 flex items-start gap-2 text-slate-400 text-xs">
            <AlertCircle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
            <span>
              This pre-arrival report is synchronized in real-time with the receiving hospital desk console to prevent emergency department bottlenecks.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-700/80 bg-[#0F2231] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-medium transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy ISBAR Summary'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitted}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition ${
                isSubmitted
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold hover:shadow-teal-500/20'
              }`}
            >
              {isSubmitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Transmitted
                </>
              ) : (
                'Transmit to Hospital'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
