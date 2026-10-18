import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Mic,
  Square,
  Upload,
  CheckCheck,
  Plus,
  ArrowLeft,
  AlertTriangle,
  FileAudio,
  Route,
  Radio,
  Building2,
  Clock,
  CheckCircle2,
  Volume2,
  Stethoscope,
  Send,
  User,
  Heart,
  ShieldCheck,
  Activity
} from 'lucide-react';
import {
  api,
  post,
  patch,
  CaseDetails,
  ClinicalSummary,
  Hospital,
  pretty,
  short,
  BASE,
  getToken
} from '../lib/api';
import { useLive } from '../lib/live';
import { useAuth } from '../lib/auth';
import {
  PageHeader,
  Panel,
  StatusBadge,
  EmptyState,
  Loading,
  Notice,
  VitalSignCard,
  MissingInformationPanel,
  ClinicalConflictAlert
} from '../components/UI';
import { playRadioChirp, playRogerBeep, speakHinglish, createSpeechRecognizer } from '../lib/audioSound';
import VoiceIntercomModal from '../components/VoiceIntercomModal';
import AmbulanceTracker from '../components/AmbulanceTracker';

const CLINICAL_QUICK_PRESETS = [
  {
    label: '🚨 Acute Chest Pain / STEMI',
    text: '58M severe chest pain for 20 minutes, pulse 110 bpm, SpO2 94%, BP 150/95. Meds: metformin. Allergy history unknown.'
  },
  {
    label: '⚠️ Syncope & Collapse',
    text: 'Adult male collapsed near Indiranagar flyover. Alert but distressed. Pulse 105 bpm, BP 140/90, SpO2 92%.'
  },
  {
    label: '🏍️ Blunt Trauma / Fall',
    text: 'Two-wheeler road collision, left arm deformity and severe tenderness. Pulse 88 bpm, BP 124/80, SpO2 98%.'
  }
];

export default function CaseDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const live = useLive();

  const [data, setData] = useState<CaseDetails | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [text, setText] = useState('');
  const [source, setSource] = useState('paramedic');
  const [busy, setBusy] = useState(false);
  const [field, setField] = useState('heart_rate');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('bpm');
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [rec, setRec] = useState(false);
  const [clip, setClip] = useState<Blob | null>(null);
  const [sec, setSec] = useState(0);
  const [uploadPct, setUploadPct] = useState(0);

  // Doctor directive input
  const [doctorOrderText, setDoctorOrderText] = useState('');
  const [doctorDirectives, setDoctorDirectives] = useState<
    Array<{ doctor: string; hospital: string; text: string; time: string }>
  >([
    {
      doctor: 'Dr. Aditi Sen',
      hospital: 'Apollo Heart & Trauma Hub',
      text: 'Direct roll-in to Resus Bay 2. Keep 4L Oxygen on standby, prepare 300mg chewable aspirin.',
      time: '10:14 AM'
    }
  ]);

  // Voice Intercom Modal State
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  const media = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechRecognizer = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
      if (speechRecognizer.current) {
        try { speechRecognizer.current.stop(); } catch {}
      }
    };
  }, []);

  const refresh = () => {
    api<CaseDetails>('/cases/' + id)
      .then(setData)
      .catch(e => setError(e.message));
  };

  useEffect(() => {
    refresh();
    api<Hospital[]>('/hospitals')
      .then(setHospitals)
      .catch(() => {});
  }, [id, live.events[0]?.sequence]);

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

  async function startRecording() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('This browser does not support microphone recording. Use manual entry.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const preferred = ['audio/webm', 'audio/ogg', 'audio/mp4'].find(x => MediaRecorder.isTypeSupported(x));
      const m = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      media.current = m;
      m.ondataavailable = e => {
        if (e.data.size) chunks.current.push(e.data);
      };
      m.onstop = () => {
        const blob = new Blob(chunks.current, { type: m.mimeType || 'audio/webm' });
        setClip(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      // Native speech recognizer for live real-time speech-to-text
      const recognizer = createSpeechRecognizer(
        'en-IN',
        (liveText, isFinal) => {
          if (liveText) {
            setText(prev => {
              const base = prev && !prev.endsWith(' ') ? prev + ' ' : prev;
              if (!base.trim()) return liveText;
              if (isFinal) return base + liveText;
              return prev;
            });
          }
        },
        (err) => console.warn('Speech recognizer:', err)
      );
      if (recognizer) {
        try {
          recognizer.start();
          speechRecognizer.current = recognizer;
        } catch {}
      }

      playRadioChirp();
      m.start(250);
      setSec(0);
      setRec(true);
      timer.current = setInterval(() => setSec(s => s + 1), 1000);
    } catch (e) {
      setError('Microphone permission denied or unavailable. Enter the report manually.');
    }
  }

  function stopRecording() {
    playRogerBeep();
    if (speechRecognizer.current) {
      try { speechRecognizer.current.stop(); } catch {}
      speechRecognizer.current = null;
    }
    media.current?.stop();
    setRec(false);
    if (timer.current) clearInterval(timer.current);
  }

  async function uploadClip(blob: Blob, filename: string) {
    setUploadPct(0);
    setError('');
    setBusy(true);
    const fd = new FormData();
    fd.append('file', blob, filename);
    if (text) {
      fd.append('transcript', text);
    }
    try {
      const result = await new Promise<{ transcript: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', (BASE || '') + '/api/cases/' + id + '/audio');
        xhr.setRequestHeader('Authorization', 'Bearer ' + getToken());
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) setUploadPct(Math.round((100 * e.loaded) / e.total));
        };
        xhr.onload = () => {
          let r: Record<string, unknown> = {};
          try {
            r = JSON.parse(xhr.responseText);
          } catch {}
          if (xhr.status >= 200 && xhr.status < 300) resolve(r as { transcript: string });
          else reject(new Error(typeof r.detail === 'string' ? r.detail : 'Upload failed'));
        };
        xhr.onerror = () => reject(new Error('Network failure during audio upload'));
        xhr.send(fd);
      });
      if (result.transcript) {
        setText(result.transcript);
      }
      setSuccess('Audio recorded & transcribed successfully. Review and click Submit below.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Quick Hinglish Radio Handover
  const handleQuickRadioTransmit = async (presetText: string) => {
    playRadioChirp();
    speakHinglish(presetText);
    await run(async () => {
      await post('/cases/' + id + '/radio-dispatch', {
        message: presetText,
        channel: 'Priority EMS-108',
        language: 'hinglish',
        audio_simulated: true,
        urgency: 'priority'
      });
    }, 'Radio message broadcast to hospital & logged to case');
  };

  // Issue Doctor Directive
  const submitDoctorDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorOrderText.trim()) return;
    await run(async () => {
      await post('/cases/' + id + '/doctor-directive', {
        directive: doctorOrderText,
        priority: 'urgent'
      });
      setDoctorDirectives(prev => [
        {
          doctor: user?.name || 'Dr. Aditi Sen',
          hospital: 'Receiving Emergency Team',
          text: doctorOrderText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        ...prev
      ]);
      setDoctorOrderText('');
    }, 'Doctor pre-arrival order issued to ambulance crew');
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <PageHeader title={'Case ' + id} />
        <Notice error={error} />
        <Loading />
      </div>
    );
  }

  const c = data.case;
  const isEditor = ['paramedic', 'coordinator', 'admin'].includes(user?.role || '');
  const isHospitalOrDoctor = ['hospital', 'coordinator', 'admin'].includes(user?.role || '');
  const hospitalName = (key: string | null) => hospitals.find(h => h.id === key)?.name || key || 'Not assigned';

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/cases" className="text-xs text-slateText hover:text-brand flex items-center gap-1 font-medium">
          <ArrowLeft size={14} /> Back to Case Registry
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoiceModalOpen(true)}
            className="btn btn-secondary text-xs py-1.5 px-3 border-surface-border hover:border-brand"
          >
            <Radio size={14} className="text-brand animate-pulse" />
            <span>EMS Intercom</span>
            <span className="text-[10px] bg-brand-light text-brand-dark px-1 rounded font-semibold">
              Live
            </span>
          </button>

          <Link to={`/routes?case=${encodeURIComponent(c.id)}`} className="btn btn-primary text-xs py-1.5 px-3">
            <Route size={14} /> SmartRoute Screen
          </Link>
        </div>
      </div>

      {/* Case Header */}
      <PageHeader
        tag={`Handover Reference #${c.id}`}
        title={c.complaint}
        description={`Patient Code: ${c.patient_code} · Intake: ${c.identity_mode === 'unknown' ? 'Unknown Patient' : c.identity_mode} · Ambulance: ${c.team || 'Rig BLS-108'} · Created ${pretty(c.created_at)}`}
      >
        <StatusBadge value={c.status} />
      </PageHeader>

      <Notice error={error} success={success} />

      <AmbulanceTracker caseId={id} canTrack={user?.role==='paramedic'||user?.role==='admin'} location={data.ambulance_location} onUpdated={refresh} />

      {/* Primary Coordination Status Card */}
      <div className="card p-4 sm:p-5 bg-white border-surface-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-slateText font-medium mb-1">Destination Hospital</div>
            <div className="text-sm font-bold text-charcoal">
              {c.confirmed_hospital_id ? hospitalName(c.confirmed_hospital_id) : 'Not Confirmed Yet'}
            </div>
            <div className="text-[11.5px] text-slateText mt-0.5">
              {c.confirmed_hospital_id ? 'Explicitly accepted & confirmed' : 'Requires coordinator confirmation'}
            </div>
          </div>

          <div>
            <div className="text-xs text-slateText font-medium mb-1">Intended Hospital</div>
            <div className="text-sm font-bold text-charcoal">
              {hospitalName(c.intended_hospital_id)}
            </div>
            <div className="text-[11.5px] text-slateText mt-0.5">Primary ambulance route target</div>
          </div>

          <div>
            <div className="text-xs text-slateText font-medium mb-1">Hospital Response</div>
            <div>
              <StatusBadge
                value={
                  data.acceptances.length > 0
                    ? data.acceptances[data.acceptances.length - 1].status
                    : 'Awaiting Request'
                }
              />
            </div>
            <div className="text-[11.5px] text-slateText mt-0.5">Explicit ER acceptance status</div>
          </div>

          <div>
            <div className="text-xs text-slateText font-medium mb-1">Ambulance ETA</div>
            <div className="text-sm font-bold text-charcoal">
              {c.eta_minutes !== null ? `${c.eta_minutes} Minutes` : 'Unknown'}
            </div>
            <div className="text-[11.5px] text-slateText mt-0.5">Reported by paramedic crew</div>
          </div>
        </div>
      </div>

      {/* Emergency Quick Radio Intercom Bar */}
      <div className="card p-4 bg-navy text-white border-navy-light">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Radio size={15} className="text-brand-light animate-pulse" />
            <span className="text-xs font-bold text-white">Emergency Voice & Radio Dispatch Bar</span>
            <span className="text-[10px] bg-brand text-white px-2 py-0.5 rounded font-semibold">
              1-Tap Transmit
            </span>
          </div>
          <button
            onClick={() => setVoiceModalOpen(true)}
            className="text-xs text-brand-light hover:underline font-medium"
          >
            Open Full Intercom & Doctor Hotline →
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-2">
          {[
            {
              title: '🚨 STEMI Alert',
              text: 'Emergency Room, Rig 108 with 58M severe chest pain, BP 150/95, ST elevation suspected. Please prepare Resus Bay and Cath Lab.'
            },
            {
              title: '📍 Flyover ETA',
              text: 'Ambulance crossing Indiranagar flyover, ETA 6 minutes. Have stretcher and high-flow oxygen ready at Gate 2 entrance ramp.'
            },
            {
              title: '⚠️ Vitals Drop',
              text: 'Patient deteriorating with diaphoresis, SpO2 dropped to 90%. High-flow oxygen initiated.'
            }
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickRadioTransmit(preset.text)}
              disabled={busy}
              className="text-left rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 p-2.5 transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                <span>{preset.title}</span>
                <Volume2 size={13} className="text-brand-light" />
              </div>
              <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                "{preset.text}"
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Split Workspace Layout */}
      <div className="grid xl:grid-cols-[1.5fr_1fr] gap-6">
        {/* Left Column: Clinical Handover & Vitals */}
        <div className="space-y-6">
          {/* Clinical Reports */}
          <Panel
            title="Clinical Handover & Structured Findings"
            sub="Raw verbal reports are preserved; structured clinical facts require human confirmation"
          >
            {data.reports.length === 0 ? (
              <EmptyState message="No clinical reports added yet. Enter or record a handover report below." />
            ) : (
              <div className="p-4 sm:p-5 space-y-4">
                {data.reports.map(report => (
                  <div key={report.id} className="rounded-card border border-surface-border p-4 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-3 border-b border-surface-border text-xs">
                      <div className="text-slateText">
                        Source: <span className="font-semibold text-charcoal capitalize">{report.source}</span> ·{' '}
                        {pretty(report.created_at)} ·{' '}
                        <span className="font-mono text-[11px]">{report.provider}</span>
                      </div>
                      <StatusBadge value={report.review_status} />
                    </div>

                    {/* Original Transcript */}
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-slateText mb-1">
                        Verbatim Transcript / Verbal Report
                      </div>
                      <p className="text-xs sm:text-sm text-charcoal bg-surface-subtle p-3 rounded-lg border border-surface-border leading-relaxed whitespace-pre-wrap">
                        {report.transcript}
                      </p>
                    </div>

                    {/* Structured Signs & Vitals */}
                    {report.summary && Object.keys(report.summary).length > 0 && (
                      <div className="space-y-3 mt-3">
                        <div className="text-xs font-semibold text-charcoal">Extracted Vital Signs:</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.entries(report.summary.vitals || {}).map(([k, v]) => (
                            <VitalSignCard
                              key={k}
                              label={k}
                              value={v}
                              source="Reported"
                            />
                          ))}
                        </div>

                        {/* Missing Information Panel */}
                        <MissingInformationPanel missing={report.summary.missing_fields || []} />

                        {/* Uncertain fields */}
                        {(report.summary.uncertain_fields || []).length > 0 && (
                          <div className="rounded-lg bg-warning-light p-2.5 text-xs text-warning-dark border border-[#F6DFBA] flex items-center gap-1.5">
                            <AlertTriangle size={14} />
                            <span>Requires confirmation: {report.summary.uncertain_fields.join(', ')}</span>
                          </div>
                        )}

                        {/* Human Confirmation / Edit Action */}
                        {report.review_status !== 'human_confirmed' && isEditor && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() =>
                                setEditing(s => ({
                                  ...s,
                                  [report.id]:
                                    s[report.id] === undefined
                                      ? JSON.stringify(report.summary, null, 2)
                                      : (undefined as unknown as string)
                                }))
                              }
                              className="btn btn-secondary text-xs"
                            >
                              Review & Edit Structured Values
                            </button>

                            {editing[report.id] !== undefined && (
                              <div className="mt-2.5 space-y-2">
                                <label className="label">Edit Structured JSON (preserve reported facts)</label>
                                <textarea
                                  className="field font-mono text-xs"
                                  rows={8}
                                  value={editing[report.id]}
                                  onChange={e => setEditing(s => ({ ...s, [report.id]: e.target.value }))}
                                />
                                <button
                                  disabled={busy}
                                  className="btn btn-primary text-xs"
                                  onClick={() =>
                                    run(async () => {
                                      let o: ClinicalSummary;
                                      try {
                                        o = JSON.parse(editing[report.id]);
                                      } catch {
                                        throw new Error('Invalid JSON format');
                                      }
                                      await patch('/cases/' + id + '/reports/' + report.id + '/review', o);
                                    }, 'Human clinician review confirmed')
                                  }
                                >
                                  <CheckCheck size={14} /> Confirm Verified Fields
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Add Handover Report Form */}
          {isEditor && (
            <Panel
              title="Add Clinical Handover Report"
              sub="Record emergency voice report or enter clinical details below."
            >
              <div className="p-4 sm:p-5 space-y-4">
                {/* Clinical Presets Bar */}
                <div>
                  <div className="text-xs font-semibold text-slateText mb-1.5">
                    1-Click Clinical Note Templates:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CLINICAL_QUICK_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setText(p.text)}
                        className="text-xs bg-surface-subtle hover:bg-brand-50 border border-surface-border rounded-md px-2.5 py-1 text-slateText transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Handover Note / Verbal Transcript</label>
                  <textarea
                    rows={4}
                    className="field text-sm"
                    placeholder="e.g. Male patient approximately 58 years old with acute chest pain for 20 minutes, BP 150/95, pulse 110, SpO2 94%. Meds: metformin."
                    value={text}
                    onChange={e => setText(e.target.value)}
                  />
                </div>

                {/* Audio Recording & Upload */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={rec ? stopRecording : startRecording}
                    className={`btn text-xs font-semibold py-1.5 px-3 flex items-center gap-2 transition-all ${
                      rec ? 'bg-critical text-white hover:bg-critical-dark ring-2 ring-critical/40' : 'btn-secondary'
                    }`}
                  >
                    {rec ? <Square size={14} className="fill-current animate-pulse" /> : <Mic size={14} />}
                    {rec ? `Stop Recording (${sec}s)` : 'Record Voice Handover'}
                  </button>

                  {rec && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-subtle border border-critical/30 rounded-md text-xs text-critical font-medium">
                      <span className="h-2 w-2 rounded-full bg-critical animate-ping" />
                      <span>Live Mic Streaming...</span>
                      <div className="flex items-center gap-0.5 ml-1">
                        {[8, 14, 20, 12, 18, 10].map((h, i) => (
                          <div
                            key={i}
                            className="w-0.5 bg-critical rounded-full animate-pulse"
                            style={{ height: `${Math.max(4, (h * (Math.sin(i + sec) + 1.2)) % 16)}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {clip && (
                    <>
                      <audio controls src={URL.createObjectURL(clip)} className="h-8 max-w-xs" />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          uploadClip(
                            clip,
                            'recording.' +
                              (clip.type.includes('ogg') ? 'ogg' : clip.type.includes('mp4') ? 'mp4' : 'webm')
                          )
                        }
                        className="btn btn-secondary text-xs flex items-center gap-1.5"
                      >
                        <Upload size={14} /> Transcribe Audio
                      </button>
                    </>
                  )}

                  <label className="btn btn-secondary text-xs cursor-pointer">
                    <FileAudio size={14} /> Upload Audio File
                    <input
                      hidden
                      type="file"
                      accept="audio/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) uploadClip(file, file.name);
                      }}
                    />
                  </label>
                </div>

                {busy && uploadPct > 0 && (
                  <div className="text-xs text-slateText">Uploading audio… {uploadPct}%</div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    disabled={busy || text.trim().length < 3}
                    className="btn btn-primary text-xs"
                    onClick={() =>
                      run(async () => {
                        await post('/cases/' + id + '/reports', { transcript: text, source });
                        setText('');
                      }, 'Report submitted and clinical facts extracted')
                    }
                  >
                    Process and Save Handover <CheckCheck size={14} />
                  </button>
                </div>
              </div>
            </Panel>
          )}
        </div>

        {/* Right Column: Directives, Conflicts & Hospital Status */}
        <div className="space-y-6">
          {/* Doctor Pre-Arrival Directives */}
          <Panel
            title="Receiving Doctor Pre-Arrival Orders"
            sub="Directives issued by emergency room physicians to the ambulance team"
          >
            <div className="p-4 space-y-3">
              {doctorDirectives.map((dir, idx) => (
                <div key={idx} className="rounded-lg border border-brand/20 bg-brand-50/50 p-3 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-brand-dark flex items-center gap-1.5">
                      <Stethoscope size={13} className="text-brand" />
                      {dir.doctor}
                    </span>
                    <span className="text-[11px] text-slateText">{dir.time}</span>
                  </div>
                  <p className="text-charcoal leading-relaxed">{dir.text}</p>
                  <div className="text-[10.5px] text-brand-dark mt-1">{dir.hospital}</div>
                </div>
              ))}

              {isHospitalOrDoctor && (
                <form onSubmit={submitDoctorDirective} className="pt-2 border-t border-surface-border space-y-2">
                  <label className="text-xs font-semibold text-charcoal">Issue Pre-Arrival Order</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="field text-xs py-1.5"
                      placeholder="e.g. Roll into Resus Bay 2, start IV access…"
                      value={doctorOrderText}
                      onChange={e => setDoctorOrderText(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={busy || !doctorOrderText.trim()}
                      className="btn btn-primary text-xs shrink-0"
                    >
                      <Send size={13} /> Send
                    </button>
                  </div>
                </form>
              )}
            </div>
          </Panel>

          {/* Observations & Conflicts */}
          <Panel
            title="Bedside Observations & Conflict Layer"
            sub="Disagreements preserve both reported source values until human resolution"
          >
            <div className="p-4 space-y-3">
              <div className="text-xs font-semibold text-slateText">Manually Added Observations:</div>
              {data.observations.length === 0 ? (
                <div className="text-xs text-slateText">No manual bedside observations recorded</div>
              ) : (
                data.observations.map(x => (
                  <div key={x.id} className="flex justify-between text-xs border-b border-surface-border pb-1.5">
                    <span className="capitalize text-slateText">{x.field.replace(/_/g, ' ')}</span>
                    <strong className="text-charcoal">
                      {x.value} {x.unit || ''}
                    </strong>
                  </div>
                ))
              )}

              {/* Conflict Alerts */}
              {data.conflicts.map(cf => (
                <ClinicalConflictAlert
                  key={cf.id}
                  field={cf.field}
                  leftValue={cf.left_value}
                  leftSource={cf.left_source}
                  rightValue={cf.right_value}
                  rightSource={cf.right_source}
                  onResolve={
                    !cf.resolved
                      ? () => {
                          const note = window.prompt('Enter clinician resolution note:');
                          if (note?.trim()) {
                            run(
                              () => post('/cases/' + id + '/conflicts/' + cf.id + '/resolve', { resolution: note }),
                              'Conflict resolution saved'
                            );
                          }
                        }
                      : undefined
                  }
                />
              ))}

              {isEditor && (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    run(async () => {
                      await post('/cases/' + id + '/observations', { field, value, unit });
                      setValue('');
                    }, 'Bedside observation recorded');
                  }}
                  className="pt-2 border-t border-surface-border space-y-2"
                >
                  <div className="text-xs font-semibold text-charcoal">Add Bedside Vital Check</div>
                  <div className="grid grid-cols-2 gap-2">
                    <select className="field text-xs" value={field} onChange={e => setField(e.target.value)}>
                      <option value="heart_rate">Heart Rate</option>
                      <option value="spo2">Oxygen Saturation (SpO2)</option>
                      <option value="blood_pressure">Blood Pressure</option>
                      <option value="temperature">Temperature</option>
                    </select>
                    <input
                      className="field text-xs"
                      placeholder="Value"
                      required
                      value={value}
                      onChange={e => setValue(e.target.value)}
                    />
                    <input
                      className="field text-xs col-span-2"
                      placeholder="Unit (bpm, %, mmHg)"
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                    />
                  </div>
                  <button disabled={busy} className="btn btn-secondary text-xs w-full">
                    <Plus size={13} /> Add Observation
                  </button>
                </form>
              )}
            </div>
          </Panel>

          {/* Activity Timeline */}
          <Panel title="Case Event Timeline" sub="Persisted audit events for this case">
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {data.events.length === 0 ? (
                <div className="text-xs text-slateText">No events logged</div>
              ) : (
                data.events.map(ev => (
                  <div key={ev.id} className="flex gap-2.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5" />
                    <div className="min-w-0">
                      <div className="font-semibold text-charcoal capitalize truncate">
                        {ev.event_type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[11px] text-slateText">
                        Event #{ev.sequence} · {short(ev.occurred_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* Voice Intercom Modal */}
      <VoiceIntercomModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        activeCaseId={id}
        availableCases={[data.case]}
      />
    </div>
  );
}
