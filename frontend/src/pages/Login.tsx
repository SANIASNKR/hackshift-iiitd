import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Shield,
  Radio,
  Ambulance,
  Building2,
  Lock,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Notice } from '../components/UI';

const demoAccounts = [
  {
    name: 'Paramedic Vikram Rathore',
    title: 'Lead Flight & Field Paramedic · Rig BLS-108',
    email: 'paramedic@ayustream.demo',
    role: 'Paramedic',
    icon: Ambulance
  },
  {
    name: 'Dr. Aditi Sen',
    title: 'Senior Consultant & ER In-Charge · Apollo Trauma Hub',
    email: 'hospital1@ayustream.demo',
    role: 'Hospital ED',
    icon: Building2
  },
  {
    name: 'Dr. Rajesh Verma',
    title: 'Chief Interventional Cardiologist · Max Super Specialty',
    email: 'hospital2@ayustream.demo',
    role: 'Hospital ED',
    icon: Building2
  },
  {
    name: 'Priya Nair',
    title: 'Emergency State Grid Coordinator · Dispatch Desk #2',
    email: 'coordinator@ayustream.demo',
    role: 'Coordinator',
    icon: Radio
  },
  {
    name: 'Dr. Amitava Ghosh',
    title: 'Medical Director · Operational Oversight',
    email: 'admin@ayustream.demo',
    role: 'Administrator',
    icon: Shield
  }
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('paramedic@ayustream.demo');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl bg-white rounded-card shadow-elevated border border-surface-border overflow-hidden grid lg:grid-cols-[1.1fr_1fr]">
        {/* Left Side: Brand & Clinical Philosophy */}
        <div className="bg-navy p-8 lg:p-10 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center text-white">
                <Activity size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">AyuStream AI</span>
            </div>

            <div className="mt-8">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-brand-light text-xs font-semibold mb-4 border border-white/15">
                <Radio size={13} className="text-brand-light animate-pulse" />
                <span>Pre-Hospital Emergency Intelligence</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                Clearer handovers.<br />
                Coordinated hospital care.
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-4 leading-relaxed">
                A shared, real-time coordination workspace connecting paramedics in moving ambulances directly with receiving hospital emergency departments and central coordinators.
              </p>
            </div>

            <div className="space-y-3.5 mt-8 border-t border-white/10 pt-6">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-brand-light shrink-0 mt-0.5">
                  <Radio size={14} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Verbal & Hinglish Handover</div>
                  <div className="text-[11px] text-slate-300">Live walkie-talkie radio intercom and clinical speech transcription.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-brand-light shrink-0 mt-0.5">
                  <Shield size={14} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Explicit Clinical Acceptance</div>
                  <div className="text-[11px] text-slate-300">Human clinician verification before hospital destination is confirmed.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 mt-8 pt-4 border-t border-white/10">
            Fictional hospitals & synthetic demonstration data. Human clinical oversight mandatory.
          </div>
        </div>

        {/* Right Side: Login Form & Role Switcher */}
        <div className="p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-charcoal">Sign In to Command Center</h2>
              <p className="text-xs text-slateText mt-1">
                Enter your credentials or select a demonstration profile below.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Username or Demo Email</label>
                <input
                  type="text"
                  className="field"
                  placeholder="paramedic@ayustream.demo"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="field"
                  placeholder="demo123"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Notice error={error} />

              <button
                type="submit"
                disabled={busy}
                className="btn btn-primary w-full py-2.5 text-sm"
              >
                {busy ? 'Verifying access…' : 'Enter Workspace'}
                <ArrowRight size={15} />
              </button>
            </form>

            {/* Quick Demo Access Profiles */}
            <div className="mt-6 pt-5 border-t border-surface-border">
              <div className="text-[11px] font-semibold text-slateText uppercase tracking-wider mb-2.5">
                Quick Demonstration Accounts
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {demoAccounts.map(acc => {
                  const isSelected = username === acc.email;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => {
                        setUsername(acc.email);
                        setPassword('demo123');
                      }}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-brand bg-brand-50 text-brand-dark font-medium'
                          : 'border-surface-border hover:bg-surface-subtle text-charcoal'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-charcoal truncate">{acc.name}</div>
                        <div className="text-[11px] text-slateText truncate">{acc.title}</div>
                      </div>
                      <span className="text-[10.5px] px-2 py-0.5 rounded bg-surface-subtle font-medium text-slateText shrink-0 border border-surface-border">
                        {acc.role}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] text-slateText mt-4">
            Demonstration environment · Password: <code className="font-mono text-charcoal">demo123</code>
          </div>
        </div>
      </div>
    </div>
  );
}
