import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  ArrowRight,
  IdCard,
  UserRound,
  FileText,
  Ambulance,
  Building2,
  Clock,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Mic,
  MicOff,
  Square,
  RotateCcw,
  Volume2
} from 'lucide-react';
import { api, post, Case, Hospital, pretty } from '../lib/api';
import { useLive } from '../lib/live';
import { useAuth } from '../lib/auth';
import { createSpeechRecognizer, playRadioChirp, playRogerBeep } from '../lib/audioSound';
import {
  PageHeader,
  Panel,
  StatusBadge,
  EmptyState,
  Loading,
  Notice,
  StepProgressIndicator
} from '../components/UI';

export function Cases() {
  const live = useLive();
  const { user } = useAuth();
  const [data, setData] = useState<Case[] | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ items: Case[] }>('/cases')
      .then(x => setData(x.items))
      .catch(e => setError(e.message));
  }, [live.events[0]?.sequence]);

  const result = (data || []).filter(c =>
    (c.id + ' ' + c.complaint + ' ' + c.patient_code + ' ' + (c.team || '')).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        tag="Pre-Hospital Registry"
        title="Emergency Case Registry"
        description="Every patient receives a tracked case reference number. Paramedics coordinate handovers and confirm destination hospitals in real time."
      >
        {['paramedic', 'coordinator', 'admin'].includes(user?.role || '') && (
          <Link to="/new" className="btn btn-primary text-xs">
            <PlusCircle size={15} />
            <span>New Emergency Intake</span>
          </Link>
        )}
      </PageHeader>

      <Notice error={error} />

      <Panel
        title="All Accessible Emergency Cases"
        sub="Search and filter active cases across the emergency grid"
        action={
          <div className="flex items-center gap-2 border border-surface-border rounded-lg px-2.5 py-1.5 bg-white">
            <Search size={14} className="text-slateText" />
            <input
              type="text"
              placeholder="Search by ID, complaint, crew…"
              value={q}
              onChange={e => setQ(e.target.value)}
              className="text-xs outline-none w-48 sm:w-60 bg-transparent text-charcoal placeholder-slate-400"
            />
          </div>
        }
      >
        {data === null ? (
          <Loading />
        ) : result.length === 0 ? (
          <EmptyState
            title="No emergency cases found"
            message={q ? 'No cases match your search term. Try clearing filters.' : 'There are no cases created yet.'}
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
                  <th>Patient Identity</th>
                  <th>Reported Chief Complaint</th>
                  <th>Ambulance Rig</th>
                  <th>Destination Status</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {result.map(c => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/cases/${c.id}`} className="font-semibold text-brand hover:underline">
                        {c.id}
                      </Link>
                      <div className="text-[11px] text-slateText mt-0.5">{pretty(c.created_at)}</div>
                    </td>
                    <td>
                      <div className="text-xs font-medium text-charcoal">
                        {c.identity_name || c.patient_code}
                      </div>
                      <div className="text-[11px] text-slateText capitalize">
                        {c.identity_mode === 'unknown' ? 'Unknown patient' : `${c.identity_mode} report`}
                      </div>
                    </td>
                    <td className="max-w-[260px]">
                      <div className="truncate text-charcoal font-medium text-xs sm:text-sm">
                        {c.complaint}
                      </div>
                    </td>
                    <td>
                      <div className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
                        <Ambulance size={14} className="text-brand" />
                        <span>{c.team || 'Rig BLS-108'}</span>
                      </div>
                      <div className="text-[11px] text-slateText">
                        {c.eta_minutes !== null ? `ETA: ${c.eta_minutes}m` : 'ETA not specified'}
                      </div>
                    </td>
                    <td>
                      <div className="text-xs font-medium text-charcoal">
                        {c.confirmed_hospital_id || c.intended_hospital_id || 'Not assigned'}
                      </div>
                      <div className="text-[11px] text-slateText">
                        {c.confirmed_hospital_id ? 'Confirmed' : 'Awaiting confirmation'}
                      </div>
                    </td>
                    <td>
                      <StatusBadge value={c.status} />
                    </td>
                    <td className="text-right">
                      <Link
                        to={`/cases/${c.id}`}
                        className="btn btn-secondary text-xs py-1 px-3"
                        aria-label={`Open case ${c.id}`}
                      >
                        Handover <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

export function NewCase() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ocr, setOcr] = useState('');

  // Voice Recording & Live Speech Recognition state for Intake
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [speechLang, setSpeechLang] = useState<'hi-IN' | 'en-IN'>('en-IN');
  const [transcribing, setTranscribing] = useState(false);
  const [micNotice, setMicNotice] = useState<string>('');

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechRecognizer = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recordTimer.current) clearInterval(recordTimer.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (speechRecognizer.current) {
        try { speechRecognizer.current.stop(); } catch {}
      }
    };
  }, [audioUrl]);

  // Guided Step State: 1 = Patient Info, 2 = Clinical Details & Complaint, 3 = Coordination & Hospital
  const [step, setStep] = useState<number>(1);

  const [form, setForm] = useState({
    identity_mode: 'unknown',
    identity_name: '',
    age: '',
    sex: '',
    complaint: '',
    team: user?.role === 'paramedic' ? 'Ambulance Rig BLS-108 (Indiranagar)' : 'Rig BLS-108',
    eta_minutes: '15',
    intended_hospital_id: '',
    required_capabilities: ['cardiac'] as string[]
  });

  useEffect(() => {
    api<Hospital[]>('/hospitals').then(hs => {
      setHospitals(hs);
      if (hs.length > 0 && !form.intended_hospital_id) {
        setForm(f => ({ ...f, intended_hospital_id: hs[0].id }));
      }
    });
  }, []);

  const update = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  async function startAudioCapture() {
    setError('');
    setMicNotice('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('This browser does not support microphone audio recording.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];
      const preferred = ['audio/webm', 'audio/ogg', 'audio/mp4'].find(x => MediaRecorder.isTypeSupported(x));
      const m = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      mediaRecorder.current = m;

      m.ondataavailable = e => {
        if (e.data.size) audioChunks.current.push(e.data);
      };

      m.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: m.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      // Start live speech recognizer in parallel for instant dictation
      const recognizer = createSpeechRecognizer(
        speechLang,
        (liveText, isFinal) => {
          if (liveText) {
            setForm(f => {
              const base = f.complaint && !f.complaint.endsWith(' ') ? f.complaint + ' ' : f.complaint;
              if (!base.trim()) return { ...f, complaint: liveText };
              if (isFinal) return { ...f, complaint: base + liveText };
              return f;
            });
          }
        },
        (err) => {
          console.warn('Speech recognition notice:', err);
        }
      );

      if (recognizer) {
        try {
          recognizer.start();
          speechRecognizer.current = recognizer;
        } catch {}
      }

      playRadioChirp();
      m.start(250);
      setRecordSeconds(0);
      setIsRecording(true);
      recordTimer.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
      setMicNotice('Microphone active. Dictate emergency clinical symptoms clearly.');
    } catch {
      setError('Microphone access denied or device unavailable. Please allow microphone permission in your browser or enter text manually.');
    }
  }

  function stopAudioCapture() {
    playRogerBeep();
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    if (speechRecognizer.current) {
      try { speechRecognizer.current.stop(); } catch {}
      speechRecognizer.current = null;
    }
    if (recordTimer.current) {
      clearInterval(recordTimer.current);
      recordTimer.current = undefined;
    }
    setIsRecording(false);
    setMicNotice('Audio recording captured. You can review audio, transcribe with server, or edit notes.');
  }

  function resetAudioCapture() {
    if (isRecording) stopAudioCapture();
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordSeconds(0);
    setMicNotice('');
  }

  async function serverTranscribeAudio() {
    if (!audioBlob) return;
    setTranscribing(true);
    setError('');
    const fd = new FormData();
    fd.append('file', audioBlob, 'intake_report.webm');
    if (form.complaint) {
      fd.append('transcript', form.complaint);
    }
    try {
      const res = await api<{ transcript: string }>('/cases/audio/transcribe', {
        method: 'POST',
        body: fd
      });
      if (res.transcript) {
        setForm(f => ({ ...f, complaint: res.transcript }));
        setMicNotice('Voice report verified & transcribed by backend AI.');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTranscribing(false);
    }
  }

  async function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const c = await post<Case>('/cases', {
        ...form,
        identity_name: form.identity_name || null,
        age: form.age ? Number(form.age) : null,
        eta_minutes: form.eta_minutes ? Number(form.eta_minutes) : null,
        intended_hospital_id: form.intended_hospital_id || null,
        complaint: form.complaint || 'Not reported'
      });
      nav(`/cases/${c.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function scan(file: File) {
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await api<{ text: string }>('/cases/identity/ocr', { method: 'POST', body: fd });
      setOcr(r.text);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const stepsList = [
    { number: 1, title: 'Patient Identity', subtitle: 'Known, Bystander or Unknown' },
    { number: 2, title: 'Emergency Complaint', subtitle: 'Verbal or manual notes' },
    { number: 3, title: 'Hospital Routing', subtitle: 'Target department & ETA' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Link to="/cases" className="text-xs text-slateText hover:text-brand flex items-center gap-1 font-medium">
          <ArrowLeft size={14} /> Back to registry
        </Link>
      </div>

      <PageHeader
        tag="Guided Ambulance Intake"
        title="Create Emergency Case"
        description="Follow the guided workflow to register the patient and start clinical handover. Unidentified/unknown patients are fully supported without delay."
      />

      <StepProgressIndicator steps={stepsList} currentStep={step} />

      <Notice error={error} />

      <form onSubmit={submit} className="space-y-6">
        {/* STEP 1: PATIENT IDENTITY */}
        {step === 1 && (
          <Panel
            title="Step 1: Patient Information"
            sub="Choose how patient information is being collected. Unknown patient can be selected immediately."
          >
            <div className="p-5 sm:p-6 space-y-5">
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'unknown',
                    label: 'Unknown Patient',
                    description: 'Instant temporary patient ID. Case proceeds without delay.',
                    icon: UserRound
                  },
                  {
                    id: 'bystander',
                    label: 'Bystander / Verbal Report',
                    description: 'Information reported by companion or bystander on scene.',
                    icon: IdCard
                  },
                  {
                    id: 'document',
                    label: 'Upload ID Document',
                    description: 'Optional OCR text extraction with human verification.',
                    icon: FileText
                  }
                ].map(opt => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => update('identity_mode', opt.id)}
                    className={`p-4 rounded-card border text-left transition-all ${
                      form.identity_mode === opt.id
                        ? 'border-brand bg-brand-50/60 shadow-xs ring-1 ring-brand'
                        : 'border-surface-border hover:bg-surface-subtle'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-subtle flex items-center justify-center text-brand mb-2.5">
                      <opt.icon size={18} />
                    </div>
                    <div className="text-sm font-semibold text-charcoal">{opt.label}</div>
                    <div className="text-xs text-slateText mt-1 leading-normal">{opt.description}</div>
                  </button>
                ))}
              </div>

              {form.identity_mode !== 'unknown' && (
                <div className="p-4 rounded-lg bg-surface-subtle border border-surface-border space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label">Reported Patient Name</label>
                      <input
                        type="text"
                        className="field"
                        placeholder="e.g. Ramesh Kumar"
                        value={form.identity_name}
                        onChange={e => update('identity_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Reported Age</label>
                      <input
                        type="number"
                        min="0"
                        max="125"
                        className="field"
                        placeholder="e.g. 58"
                        value={form.age}
                        onChange={e => update('age', e.target.value)}
                      />
                    </div>
                  </div>

                  {form.identity_mode === 'document' && (
                    <div className="pt-2">
                      <label className="label">Upload Synthetic ID Image for OCR Extraction</label>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="field text-xs"
                        onChange={e => e.target.files?.[0] && scan(e.target.files[0])}
                      />
                      <p className="helper mt-1">
                        OCR text requires manual review. No image data is permanently stored.
                      </p>
                      {ocr && (
                        <textarea
                          className="field font-mono text-xs mt-2"
                          rows={3}
                          value={ocr}
                          onChange={e => setOcr(e.target.value)}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn btn-primary text-xs"
                >
                  Continue to Clinical Details <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </Panel>
        )}

        {/* STEP 2: CLINICAL INFORMATION & CHIEF COMPLAINT */}
        {step === 2 && (
          <Panel
            title="Step 2: Emergency Clinical Details"
            sub="Dictate directly into the microphone, or select standard clinical presets and type manual notes."
          >
            <div className="p-5 sm:p-6 space-y-5">
              {/* Emergency Microphone Dictation Console */}
              <div className="rounded-xl border border-surface-border bg-gradient-to-br from-surface to-surface-subtle p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isRecording ? 'bg-critical-subtle text-critical animate-pulse' : 'bg-brand-50 text-brand'}`}>
                      <Mic size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink flex items-center gap-2">
                        Microphone Voice Dictation
                        {isRecording && (
                          <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-critical bg-critical-subtle px-2 py-0.5 rounded-full border border-critical/30 animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-critical" /> Live Listening
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slateText">
                        Speak clinical handover notes. Native speech recognition streams live into the field.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slateText">Dictation Language:</span>
                    <select
                      value={speechLang}
                      onChange={e => setSpeechLang(e.target.value as 'en-IN' | 'hi-IN')}
                      disabled={isRecording}
                      className="text-xs bg-surface border border-surface-border rounded-md px-2 py-1 text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                    >
                      <option value="en-IN">English (India) / Conversational</option>
                      <option value="hi-IN">Hindi (hi-IN)</option>
                    </select>
                  </div>
                </div>

                {/* Controls and Audio Visualizer */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={isRecording ? stopAudioCapture : startAudioCapture}
                    className={`btn text-xs font-semibold py-2 px-4 shadow-sm flex items-center gap-2 transition-all ${
                      isRecording
                        ? 'bg-critical text-white hover:bg-critical-dark ring-2 ring-critical/40'
                        : 'btn-primary'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <Square size={14} className="fill-current" />
                        Stop Recording ({String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:{String(recordSeconds % 60).padStart(2, '0')})
                      </>
                    ) : (
                      <>
                        <Mic size={14} />
                        Start Microphone Dictation
                      </>
                    )}
                  </button>

                  {/* Soundwave equalizer indicator when recording */}
                  {isRecording && (
                    <div className="flex items-center gap-1 h-6 px-3 bg-surface rounded-md border border-critical/30">
                      {[12, 22, 16, 28, 14, 26, 18, 24, 10, 20].map((h, idx) => (
                        <div
                          key={idx}
                          className="w-1 bg-critical rounded-full animate-pulse"
                          style={{
                            height: `${Math.max(6, (h * (Math.sin(idx + recordSeconds) + 1.2)) % 22)}px`,
                            animationDelay: `${idx * 80}ms`
                          }}
                        />
                      ))}
                      <span className="text-[11px] font-mono text-critical font-bold ml-1.5">
                        Recording...
                      </span>
                    </div>
                  )}

                  {/* Audio playback and Server transcription if clip exists */}
                  {audioUrl && !isRecording && (
                    <div className="flex flex-wrap items-center gap-2">
                      <audio controls src={audioUrl} className="h-8 max-w-[200px]" />
                      <button
                        type="button"
                        disabled={transcribing}
                        onClick={serverTranscribeAudio}
                        className="btn btn-secondary text-xs flex items-center gap-1.5"
                        title="Run server-side AI transcription verification"
                      >
                        {transcribing ? (
                          <>
                            <span className="h-3 w-3 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                            Transcribing…
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} className="text-brand" />
                            Transcribe / Refine with AI
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={resetAudioCapture}
                        className="btn btn-ghost text-xs text-slateText hover:text-ink p-1.5"
                        title="Discard audio recording"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {micNotice && (
                  <div className="text-xs text-brand font-medium bg-brand-50/70 border border-brand/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-brand shrink-0" />
                    <span>{micNotice}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="label mb-0">Reported Chief Complaint / Initial Concern</label>
                  <span className="text-xs text-brand font-medium">Standard clinical templates:</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[
                    '58M severe chest pain for 20 mins, sweating, BP 150/95',
                    '32F two-wheeler accident, blunt trauma, alert but anxious',
                    '68M sudden slurred speech and right-sided arm weakness'
                  ].map((phrase, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => update('complaint', phrase)}
                      className="text-xs bg-surface-subtle hover:bg-brand-50 hover:border-brand border border-surface-border rounded-md px-2.5 py-1 text-slateText transition-colors"
                    >
                      + {phrase.slice(0, 38)}…
                    </button>
                  ))}
                </div>

                <textarea
                  className="field text-sm"
                  rows={4}
                  placeholder="e.g. Male approximately 58 years old with severe chest pain for twenty minutes. Blood pressure 150/95. Pulse 110. Allergy history unknown."
                  value={form.complaint}
                  onChange={e => update('complaint', e.target.value)}
                  required
                />
                <p className="helper mt-1 flex justify-between items-center">
                  <span>Speak into microphone above or type clinical handover notes.</span>
                  <span>{form.complaint.length} characters</span>
                </p>
              </div>

              <div className="flex justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-secondary text-xs"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn btn-primary text-xs"
                >
                  Continue to Hospital Routing <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </Panel>
        )}

        {/* STEP 3: HOSPITAL COORDINATION & ETA */}
        {step === 3 && (
          <Panel
            title="Step 3: Hospital Coordination & Arrival"
            sub="Specify target hospital, crew call-sign, and estimated arrival time."
          >
            <div className="p-5 sm:p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Ambulance Rig / Crew ID</label>
                  <input
                    type="text"
                    className="field"
                    value={form.team}
                    onChange={e => update('team', e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Estimated Arrival Time (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    className="field"
                    value={form.eta_minutes}
                    onChange={e => update('eta_minutes', e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Intended Receiving Hospital</label>
                  <select
                    className="field"
                    value={form.intended_hospital_id}
                    onChange={e => update('intended_hospital_id', e.target.value)}
                  >
                    <option value="">Select receiving department…</option>
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.area})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Required Clinical Services</label>
                  <select
                    className="field"
                    multiple
                    size={3}
                    value={form.required_capabilities}
                    onChange={e =>
                      update(
                        'required_capabilities',
                        Array.from(e.target.selectedOptions).map(x => x.value)
                      )
                    }
                  >
                    {['cardiac', 'trauma', 'stroke', 'pediatric', 'general'].map(c => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)} Care
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Summary Review */}
              <div className="p-4 rounded-lg bg-surface-subtle border border-surface-border text-xs space-y-1.5">
                <div className="font-semibold text-charcoal">Case Overview Summary:</div>
                <div className="text-slateText">
                  Identity:{' '}
                  <span className="font-medium text-charcoal">
                    {form.identity_mode === 'unknown' ? 'Unknown Patient' : form.identity_name || 'Bystander reported'}
                  </span>
                </div>
                <div className="text-slateText truncate">
                  Chief Concern:{' '}
                  <span className="font-medium text-charcoal">{form.complaint || 'Not specified'}</span>
                </div>
                <div className="text-slateText">
                  Intended Hospital:{' '}
                  <span className="font-medium text-charcoal">
                    {hospitals.find(h => h.id === form.intended_hospital_id)?.name || 'None selected'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn btn-secondary text-xs"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn btn-primary text-xs px-6"
                >
                  {busy ? 'Creating Case…' : 'Create Case & Begin Handover'}
                  <CheckCircle2 size={14} />
                </button>
              </div>
            </div>
          </Panel>
        )}
      </form>
    </div>
  );
}
