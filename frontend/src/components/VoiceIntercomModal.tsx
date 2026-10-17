import { useState, useEffect, useRef } from 'react';
import {
  Phone,
  Radio,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  UserCheck,
  Send,
  Sparkles,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Copy,
  ExternalLink,
  X,
  ArrowRight
} from 'lucide-react';
import {
  playRadioChirp,
  playRogerBeep,
  playPhoneRing,
  playPriorityAlert,
  speakHinglish,
  createSpeechRecognizer
} from '../lib/audioSound';
import { post, Case } from '../lib/api';
import { useAuth } from '../lib/auth';

export type ContactPerson = {
  id: string;
  name: string;
  role: string;
  department: string;
  hospital: string;
  phone: string;
  radioChannel: string;
  languages: string[];
  avatarBg: string;
  avatarText: string;
  status: 'active' | 'on_call' | 'standby';
  statusNote: string;
};

export const EMERGENCY_CONTACTS: ContactPerson[] = [
  {
    id: 'c1',
    name: 'Dr. Aditi Sen',
    role: 'Senior Consultant & ER In-Charge',
    department: 'Emergency & Resuscitation',
    hospital: 'Northbridge Apollo Heart & Trauma Hub',
    phone: '+91 98101-EMS01',
    radioChannel: 'Channel 4 (Apollo ER Direct)',
    languages: ['Hinglish', 'Hindi', 'English'],
    avatarBg: 'bg-emerald-600',
    avatarText: 'AS',
    status: 'active',
    statusNote: 'Trauma Bay 1 active · On duty'
  },
  {
    id: 'c2',
    name: 'Dr. Rajesh Verma',
    role: 'Chief Interventional Cardiologist',
    department: 'Cardiology & Cath Lab',
    hospital: 'Riverbend Max Super Specialty',
    phone: '+91 98202-EMS02',
    radioChannel: 'Channel 7 (Cath Lab Standby)',
    languages: ['Hinglish', 'Hindi', 'English'],
    avatarBg: 'bg-blue-600',
    avatarText: 'RV',
    status: 'active',
    statusNote: 'Cath Lab team on standby'
  },
  {
    id: 'c3',
    name: 'Priya Nair',
    role: 'State Emergency Grid Coordinator',
    department: 'Central EMS Response Desk #2',
    hospital: 'State Emergency Command',
    phone: '+91 98303-EMS03',
    radioChannel: 'Channel 1 (Priority Grid 108)',
    languages: ['Hinglish', 'Hindi', 'English'],
    avatarBg: 'bg-amber-600',
    avatarText: 'PN',
    status: 'active',
    statusNote: 'Green corridor clearance online'
  },
  {
    id: 'c4',
    name: 'Paramedic Vikram Rathore',
    role: 'Lead Flight & Critical Care Paramedic',
    department: 'Rig BLS-108 (Indiranagar Hub)',
    hospital: 'Ambulance Field Unit 108',
    phone: '+91 98404-EMS04',
    radioChannel: 'Channel 1 (Rig BLS-108)',
    languages: ['Hinglish', 'Hindi'],
    avatarBg: 'bg-teal-600',
    avatarText: 'VR',
    status: 'active',
    statusNote: 'Active transport · Patient on-board'
  }
];

export const HINGLISH_RADIO_PRESETS = [
  {
    title: '🚨 STEMI / Cardiac Alert',
    text: 'Dr. Sahab, 58 saal ke male patient hain, severe chest pain 20 minute se hai. BP 150/95 hai, ECG me ST elevation dikh raha hai. ICU aur Cath Lab ready rakhiye!',
    urgency: 'immediate_critical' as const,
    channel: 'Priority EMS-108'
  },
  {
    title: '📍 Flyover ETA & Stretcher Prep',
    text: 'Ambulance Indiranagar flyover cross kar chuki hai, ETA 6 minutes hai. Gate 2 ramp par stretcher and high-flow oxygen ready chahiye.',
    urgency: 'priority' as const,
    channel: 'Priority EMS-108'
  },
  {
    title: '⚠️ Critical Deterioration',
    text: 'Patient ko bohot ghabrahat aur cold sweats ho rahe hain. Oxygen level 90% par aa gaya hai, high-flow mask lagaya hai aur vitals unstable hain.',
    urgency: 'immediate_critical' as const,
    channel: 'Priority EMS-108'
  },
  {
    title: '🔄 Hospital Reroute Request',
    text: 'Northbridge ED me ICU bed available nahi hai unhone decline kiya hai. Coordinator ji, please Riverbend ya alternate hospital jaldi confirm karwaiye!',
    urgency: 'priority' as const,
    channel: 'Central Dispatch'
  },
  {
    title: '💊 Doctor Verbal Order Check',
    text: 'Doctor Sahab line par aaiye, patient deteriorate kar raha hai, sublingual sorbitrate 5mg aur chewable aspirin 300mg de dein kya?',
    urgency: 'immediate_critical' as const,
    channel: 'Channel 4 (Apollo ER)'
  },
  {
    title: '✅ Bay Handover Complete',
    text: 'Ambulance hospital bay par pahunch chuki hai. Patient ko Resus Bay 2 me shift kar rahe hain, physical clinical handover complete ho raha hai.',
    urgency: 'routine' as const,
    channel: 'Priority EMS-108'
  }
];

export default function VoiceIntercomModal({
  isOpen,
  onClose,
  activeCaseId,
  availableCases = []
}: {
  isOpen: boolean;
  onClose: () => void;
  activeCaseId?: string;
  availableCases?: Case[];
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'radio' | 'hotline' | 'contacts'>('radio');

  // Radio state
  const [channel, setChannel] = useState('Priority EMS-108');
  const [radioMsg, setRadioMsg] = useState('');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [radioStatus, setRadioStatus] = useState<string>('Channel Open · Standby');
  const [radioLog, setRadioLog] = useState<Array<{ sender: string; text: string; time: string; channel: string; urgency: string }>>([
    {
      sender: 'Dr. Aditi Sen (Apollo ED)',
      text: 'Ambulance 108, message received. Trauma Bay 2 is cleared, keep patient on 4L O2.',
      time: 'Just now',
      channel: 'Priority EMS-108',
      urgency: 'priority'
    }
  ]);
  const [selectedCaseId, setSelectedCaseId] = useState(activeCaseId || '');

  // Hotline Call state
  const [callContact, setCallContact] = useState<ContactPerson>(EMERGENCY_CONTACTS[0]);
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [callTranscript, setCallTranscript] = useState<Array<{ speaker: string; text: string; time: string }>>([]);
  const ringStopper = useRef<(() => void) | null>(null);

  // Sync selected case
  useEffect(() => {
    if (activeCaseId) setSelectedCaseId(activeCaseId);
    else if (!selectedCaseId && availableCases.length > 0) setSelectedCaseId(availableCases[0].id);
  }, [activeCaseId, availableCases]);

  // Call timer
  useEffect(() => {
    let t: ReturnType<typeof setInterval> | undefined;
    if (callState === 'connected') {
      t = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(t);
  }, [callState]);

  // Clean up on unmount or close
  useEffect(() => {
    if (!isOpen) {
      if (ringStopper.current) {
        ringStopper.current();
        ringStopper.current = null;
      }
      if (callState === 'calling') setCallState('idle');
    }
  }, [isOpen, callState]);

  if (!isOpen) return null;

  // Push-To-Talk Start
  const startRadioTransmission = () => {
    playRadioChirp();
    setIsTransmitting(true);
    setRadioStatus('🔴 TRANSMITTING OVER RADIO...');
  };

  // Push-To-Talk Release
  const stopRadioTransmission = () => {
    playRogerBeep();
    setIsTransmitting(false);
    setRadioStatus('Channel Open · Transmission Ended');
  };

  // Transmit Message
  const handleTransmit = async (textToTransmit?: string, urgencyLevel: 'routine' | 'priority' | 'immediate_critical' = 'priority') => {
    const message = (textToTransmit || radioMsg).trim();
    if (!message) return;

    playRadioChirp();
    setIsSpeaking(true);

    const newEntry = {
      sender: user?.name || 'Paramedic Vikram Rathore',
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      channel,
      urgency: urgencyLevel
    };

    setRadioLog(prev => [newEntry, ...prev]);

    // Send to backend event log if case exists
    if (selectedCaseId) {
      try {
        await post(`/cases/${selectedCaseId}/radio-dispatch`, {
          message,
          channel,
          language: 'hinglish',
          audio_simulated: true,
          urgency: urgencyLevel
        });
      } catch {}
    }

    // Speak Hinglish audio out loud
    speakHinglish(message, () => {
      setIsSpeaking(false);
    });

    if (!textToTransmit) setRadioMsg('');
  };

  // Start direct call
  const startDirectCall = (contact: ContactPerson) => {
    setCallContact(contact);
    setTab('hotline');
    setCallState('calling');
    setCallTranscript([]);

    playPriorityAlert();
    const stopRing = playPhoneRing(3500);
    ringStopper.current = stopRing;

    setTimeout(() => {
      if (ringStopper.current) ringStopper.current();
      setCallState('connected');
      playRogerBeep();

      // Seed doctor opening greeting
      setCallTranscript([
        {
          speaker: contact.name,
          text: `Haan Vikram, ${contact.name.split(' ')[1] || 'Doctor'} here. Ambulance BLS-108 line par ho? Patient ki condition report karo turant.`,
          time: '00:01'
        }
      ]);
      speakHinglish(`Haan Vikram, ${contact.name.split(' ')[1] || 'Doctor'} here. Ambulance 108 line par ho? Patient ki condition report karo.`);
    }, 2800);
  };

  const endDirectCall = () => {
    if (ringStopper.current) ringStopper.current();
    playRogerBeep();
    setCallState('ended');
    setTimeout(() => setCallState('idle'), 1500);
  };

  const sendCallMessage = (text: string) => {
    const mins = Math.floor(callDuration / 60);
    const secs = callDuration % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    setCallTranscript(prev => [
      ...prev,
      { speaker: user?.name || 'Paramedic Vikram', text, time: timeStr }
    ]);

    // Simulated doctor response after 2 seconds
    setTimeout(() => {
      let doctorReply = 'Samajh gaya Vikram. Stretcher Gate 2 par tayyar hai.';
      if (text.includes('chest pain') || text.includes('BP') || text.includes('STEMI')) {
        doctorReply = 'Noted! ECG strip hamare portal par live aa gayi hai. Cath Lab team ko emergency scrub-in ka order de diya hai. High-flow O2 continue rakho!';
      } else if (text.includes('ETA') || text.includes('flyover')) {
        doctorReply = 'Theek hai, 6 minute me ambulance bay 2 par roll-in karna. Staff ramp par wait kar raha hai.';
      } else if (text.includes('sorbitrate') || text.includes('aspirin')) {
        doctorReply = 'Haan, chewable aspirin 300mg immediately do, agar BP 100 se kam nahi hai to sublingual sorbitrate de sakte ho.';
      }

      setCallTranscript(p => [
        ...p,
        { speaker: callContact.name, text: doctorReply, time: `${String(mins).padStart(2, '0')}:${String(secs + 2).padStart(2, '0')}` }
      ]);
      speakHinglish(doctorReply);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-ink/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0c2331] via-[#11384e] to-[#0c2331] text-white p-4 sm:p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Radio size={22} className={isTransmitting ? 'animate-pulse text-amber-400' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight">EMS Voice Contact & Radio Intercom</h2>
                <span className="rounded-full bg-teal-400/20 text-teal-300 text-[10px] font-bold px-2 py-0.5 border border-teal-400/30">
                  Hinglish / English
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Direct walkie-talkie radio, doctor hotlines, and instant Hinglish dispatches
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setTab('radio')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
              tab === 'radio'
                ? 'bg-white text-teal-800 border-t-2 border-teal-600 shadow-sm'
                : 'text-slate-600 hover:text-ink hover:bg-slate-100'
            }`}
          >
            <Radio size={16} />
            Walkie-Talkie Radio Intercom
          </button>
          <button
            onClick={() => setTab('hotline')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
              tab === 'hotline'
                ? 'bg-white text-teal-800 border-t-2 border-teal-600 shadow-sm'
                : 'text-slate-600 hover:text-ink hover:bg-slate-100'
            }`}
          >
            <Phone size={16} />
            Direct ER Doctor Hotline
            {callState === 'connected' && (
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setTab('contacts')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
              tab === 'contacts'
                ? 'bg-white text-teal-800 border-t-2 border-teal-600 shadow-sm'
                : 'text-slate-600 hover:text-ink hover:bg-slate-100'
            }`}
          >
            <UserCheck size={16} />
            Hinglish Speed Dial & Contacts
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: WALKIE-TALKIE RADIO */}
          {tab === 'radio' && (
            <div className="space-y-6">
              {/* Radio Console Bar */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-[#122834] text-white p-5 border border-slate-800 shadow-inner">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-teal-500/20 px-3 py-1.5 border border-teal-400/30 text-teal-300 font-mono text-xs font-bold flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                      FREQ: 154.280 MHz
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">Selected Channel</div>
                      <select
                        value={channel}
                        onChange={e => setChannel(e.target.value)}
                        className="bg-transparent text-sm font-bold text-teal-300 outline-none cursor-pointer"
                      >
                        <option value="Priority EMS-108" className="bg-slate-900 text-white">Priority EMS-108 (Indiranagar / State Grid)</option>
                        <option value="Channel 4 (Apollo ER)" className="bg-slate-900 text-white">Channel 4 (Apollo ER & Trauma Hotline)</option>
                        <option value="Channel 7 (Riverbend Cath)" className="bg-slate-900 text-white">Channel 7 (Riverbend Max Cath Lab)</option>
                        <option value="Central Dispatch" className="bg-slate-900 text-white">Central Dispatch Desk (Priya Nair)</option>
                      </select>
                    </div>
                  </div>

                  {availableCases.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Link to Case:</span>
                      <select
                        value={selectedCaseId}
                        onChange={e => setSelectedCaseId(e.target.value)}
                        className="rounded-lg bg-white/10 border border-white/10 text-xs px-2.5 py-1 text-slate-200 outline-none"
                      >
                        <option value="" className="bg-slate-900">None (General Radio)</option>
                        {availableCases.map(c => (
                          <option key={c.id} value={c.id} className="bg-slate-900">
                            {c.id} · {c.complaint.slice(0, 30)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Live Visualizer & PTT Button */}
                <div className="py-6 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1.5 h-12 mb-5">
                    {[16, 28, 42, 60, 48, 75, 52, 65, 38, 55, 40, 24, 18].map((h, i) => (
                      <div
                        key={i}
                        className={`w-1.5 rounded-full transition-all duration-150 ${
                          isTransmitting || isSpeaking
                            ? 'bg-gradient-to-t from-teal-400 to-amber-300 animate-pulse'
                            : 'bg-slate-700'
                        }`}
                        style={{
                          height: isTransmitting || isSpeaking ? `${Math.max(12, (h * (Math.sin(i + Date.now() / 200) + 1.2)) % 48)}px` : '10px'
                        }}
                      />
                    ))}
                  </div>

                  {/* Big Push-To-Talk Button */}
                  <div className="flex items-center gap-4">
                    <button
                      onMouseDown={startRadioTransmission}
                      onMouseUp={stopRadioTransmission}
                      onTouchStart={startRadioTransmission}
                      onTouchEnd={stopRadioTransmission}
                      className={`relative group rounded-full w-24 h-24 flex flex-col items-center justify-center font-extrabold text-xs tracking-wider uppercase transition-all transform active:scale-95 shadow-xl ${
                        isTransmitting
                          ? 'bg-red-600 text-white shadow-red-500/50 ring-4 ring-red-400/50'
                          : 'bg-gradient-to-b from-teal-500 to-teal-700 text-white hover:from-teal-400 hover:to-teal-600 shadow-teal-900/50'
                      }`}
                    >
                      <Mic size={26} className={isTransmitting ? 'animate-bounce' : ''} />
                      <span className="text-[10px] mt-1">{isTransmitting ? 'TALKING' : 'HOLD PTT'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-4 text-center">{radioStatus}</p>
                </div>

                {/* Manual Voice Input or Typed Hinglish Dispatch */}
                <div className="mt-2 pt-4 border-t border-white/10 flex gap-2">
                  <input
                    type="text"
                    value={radioMsg}
                    onChange={e => setRadioMsg(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleTransmit();
                    }}
                    placeholder="Type or speak in Hinglish (e.g. Doctor Sahab, BP 150/95 hai, Cath lab ready rakhiye...)"
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-teal-400"
                  />
                  <button
                    onClick={() => handleTransmit()}
                    disabled={!radioMsg.trim()}
                    className="btn btn-primary px-5 py-2 text-xs"
                  >
                    <Send size={14} /> Transmit
                  </button>
                </div>
              </div>

              {/* Quick Hinglish Presets (1-Click Voice Dispatches) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={15} className="text-amber-500" />
                    Instant Hinglish Radio Dispatches (1-Tap Transmit)
                  </div>
                  <span className="text-[11px] text-slate-400">Click to broadcast over radio</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {HINGLISH_RADIO_PRESETS.map((preset, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/20 p-3.5 transition-all text-left flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-bold text-ink">{preset.title}</span>
                          <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${
                            preset.urgency === 'immediate_critical' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {preset.urgency.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 italic leading-relaxed">
                          "{preset.text}"
                        </p>
                      </div>
                      <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleTransmit(preset.text, preset.urgency)}
                          className="btn btn-secondary text-xs flex-1 py-1.5 bg-slate-50 hover:bg-teal-100/50"
                        >
                          <Volume2 size={13} className="text-teal-700" /> Play & Broadcast
                        </button>
                        <button
                          onClick={() => setRadioMsg(preset.text)}
                          className="text-xs text-slate-500 hover:text-teal-700 font-semibold px-2 py-1"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Radio Transmission History Feed */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="text-xs font-bold text-ink mb-3 flex items-center justify-between">
                  <span>Radio Transmission Log</span>
                  <span className="text-[11px] text-slate-400 font-normal">Encrypted Pre-Hospital Voice Feed</span>
                </div>
                <div className="space-y-2.5 max-h-48 overflow-y-auto">
                  {radioLog.map((log, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 border border-slate-200 text-xs shadow-sm">
                      <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
                        <strong className="text-teal-800">{log.sender}</strong>
                        <span>{log.channel} · {log.time}</span>
                      </div>
                      <p className="text-slate-700">{log.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT PHONE HOTLINE CALL */}
          {tab === 'hotline' && (
            <div className="space-y-6">
              {/* Doctor / Contact Card */}
              <div className="card p-5 border-teal-200 bg-gradient-to-r from-teal-50/40 to-white flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl ${callContact.avatarBg} text-white font-extrabold flex items-center justify-center text-base shadow-sm`}>
                    {callContact.avatarText}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-ink">{callContact.name}</h3>
                      <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                        {callContact.statusNote}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{callContact.role} · {callContact.hospital}</p>
                    <p className="text-[11px] text-teal-700 font-semibold mt-1">
                      Direct Hotline: {callContact.phone} · Languages: {callContact.languages.join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {callState === 'idle' && (
                    <button
                      onClick={() => startDirectCall(callContact)}
                      className="btn btn-primary px-5 py-2.5 shadow-md flex items-center gap-2"
                    >
                      <Phone size={16} /> Dial ER Hotline
                    </button>
                  )}
                  {callState === 'calling' && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-amber-700 animate-pulse">Ringing ER Lead...</span>
                      <button onClick={endDirectCall} className="btn btn-danger py-2 px-4">
                        <PhoneOff size={15} /> Cancel
                      </button>
                    </div>
                  )}
                  {callState === 'connected' && (
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 font-mono text-xs font-bold flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        {String(Math.floor(callDuration / 60)).padStart(2, '0')}:
                        {String(callDuration % 60).padStart(2, '0')}
                      </div>
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`rounded-xl p-2.5 border ${isMuted ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-100 text-slate-700'}`}
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                      </button>
                      <button onClick={endDirectCall} className="btn btn-danger py-2 px-4">
                        <PhoneOff size={15} /> End Call
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Call Dialogue Box */}
              {callState === 'connected' ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold text-ink flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      Two-Way Emergency Intercom Active (Hinglish/English)
                    </span>
                    <span className="text-xs text-slate-400">Audio synthesized live</span>
                  </div>

                  {/* Transcript History */}
                  <div className="space-y-3 max-h-60 overflow-y-auto p-2">
                    {callTranscript.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 text-xs ${
                          msg.speaker.includes('Doctor') || msg.speaker.includes('Dr.')
                            ? 'justify-start'
                            : 'justify-end'
                        }`}
                      >
                        <div
                          className={`rounded-2xl p-3.5 max-w-md ${
                            msg.speaker.includes('Doctor') || msg.speaker.includes('Dr.')
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-teal-700 text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-[10px] font-bold mb-1 opacity-80">
                            <span>{msg.speaker}</span>
                            <span>{msg.time}</span>
                          </div>
                          <p className="leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Paramedic Hinglish Answers */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-500 mb-2">
                      Quick Paramedic Hinglish Transmissions:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Doctor Sahab, BP 150/95 hai, pulse 110 bpm, STEMI suspected.',
                        'Oxygen 4L nasal cannula par chalu kar diya hai.',
                        'ETA 5 minutes hai, ramp par stretcher ready chahiye.',
                        'Patient deteriorate kar raha hai, aspirin 300mg de dein kya?'
                      ].map((phrase, i) => (
                        <button
                          key={i}
                          onClick={() => sendCallMessage(phrase)}
                          className="text-xs rounded-xl border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 px-3 py-1.5 text-slate-700 transition-colors"
                        >
                          💬 "{phrase}"
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  <Phone size={36} className="mx-auto mb-3 text-slate-400" />
                  <h4 className="font-bold text-sm text-ink">Direct ER Phone Line Ready</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Select a physician or coordinator above and press "Dial ER Hotline" to connect an instant voice link with real Hinglish clinical dialogue.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONTACTS & SPEED DIAL */}
          {tab === 'contacts' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 leading-relaxed mb-2">
                Authorized EMS contact list with verified regional emergency medical officers, trauma leads, and coordinators.
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {EMERGENCY_CONTACTS.map(contact => (
                  <div
                    key={contact.id}
                    className="card p-4 hover:border-teal-300 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl ${contact.avatarBg} text-white font-extrabold flex items-center justify-center shrink-0`}>
                        {contact.avatarText}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-extrabold text-sm text-ink truncate">{contact.name}</h4>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {contact.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{contact.role}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{contact.hospital}</p>
                        <div className="mt-2 text-[11px] font-semibold text-teal-700 flex flex-wrap gap-2">
                          <span>📞 {contact.phone}</span>
                          <span>📻 {contact.radioChannel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => startDirectCall(contact)}
                        className="btn btn-primary flex-1 text-xs py-2"
                      >
                        <Phone size={14} /> Hotline Call
                      </button>
                      <button
                        onClick={() => {
                          setChannel(contact.radioChannel);
                          setTab('radio');
                        }}
                        className="btn btn-secondary text-xs py-2"
                      >
                        <Radio size={14} /> Set Radio
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Emergency Alert Preview */}
              <div className="card p-4 bg-slate-50 border-slate-200">
                <div className="text-xs font-bold text-ink mb-1 flex items-center gap-2">
                  <MessageSquare size={15} className="text-teal-700" />
                  Hinglish WhatsApp / SMS Emergency Dispatch Format
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Standard format used for pre-hospital broadcast to emergency department teams:
                </p>
                <div className="rounded-xl bg-white p-3 border border-slate-200 text-xs text-slate-700 font-mono leading-relaxed">
                  [AYUSTREAM 108 ALERT] Patient: 58M (TMP-DEMO-0001) | Chief: Severe Chest Pain (20 min) | Vitals: BP 150/95, Pulse 110, SpO2 94% | Destination: Apollo Heart Hub | ETA: 6 mins | Dr. Sen notified.
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        '[AYUSTREAM 108 ALERT] Patient: 58M | Chief: Severe Chest Pain (20 min) | Vitals: BP 150/95, Pulse 110, SpO2 94% | Destination: Apollo Heart Hub | ETA: 6 mins'
                      );
                      alert('Hinglish dispatch copied to clipboard!');
                    }}
                    className="btn btn-secondary text-xs py-1.5"
                  >
                    <Copy size={13} /> Copy Dispatch Text
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Encrypted Pre-Hospital Link · National 108 Emergency Network</span>
          </div>
          <button onClick={onClose} className="btn btn-secondary py-1.5 px-4 text-xs">
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
}
