import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  LayoutDashboard,
  Ambulance,
  PlusCircle,
  Route,
  Building2,
  Boxes,
  Radio,
  BarChart3,
  FlaskConical,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  Bell,
  HeartHandshake,
  Volume2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useLive } from '../lib/live';
import { short, api, Case } from '../lib/api';
import { ConnectionStatus } from './UI';
import { playRadioChirp } from '../lib/audioSound';
import VoiceIntercomModal from './VoiceIntercomModal';

const navItems = [
  { url: '/', name: 'Overview', icon: LayoutDashboard, roles: ['paramedic', 'hospital', 'coordinator', 'admin'] },
  { url: '/cases', name: 'Emergency Cases', icon: Ambulance, roles: ['paramedic', 'hospital', 'coordinator', 'admin'] },
  { url: '/new', name: 'New Intake', icon: PlusCircle, roles: ['paramedic', 'coordinator', 'admin'] },
  { url: '/routes', name: 'SmartRoute Coordination', icon: Route, roles: ['coordinator', 'admin', 'paramedic', 'hospital'] },
  { url: '/hospital', name: 'Hospital Command', icon: Building2, roles: ['hospital', 'coordinator', 'admin'] },
  { url: '/resources', name: 'Simulated Inventory', icon: Boxes, roles: ['hospital', 'coordinator', 'admin'] },
  { url: '/live', name: 'Live Event Stream', icon: Radio, roles: ['paramedic', 'hospital', 'coordinator', 'admin'] },
  { url: '/analytics', name: 'Operational Analytics', icon: BarChart3, roles: ['hospital', 'coordinator', 'admin'] },
  { url: '/simulator', name: 'Failure Simulator', icon: FlaskConical, roles: ['admin'] },
  { url: '/settings', name: 'Platform Settings', icon: Settings, roles: ['admin'] }
];

export default function Shell() {
  const { user, logout } = useAuth();
  const live = useLive();
  const nav = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    api<{ items: Case[] }>('/cases')
      .then(r => setCases(r.items))
      .catch(() => {});
  }, [live.events[0]?.sequence]);

  const activeNav = navItems.find(item =>
    item.url === '/' ? location.pathname === '/' : location.pathname.startsWith(item.url)
  );

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col lg:flex-row">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop & Mobile Sidebar Navigation */}
      <aside
        className={`fixed z-50 inset-y-0 left-0 w-[260px] bg-navy text-white flex flex-col transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo & Platform Name */}
        <div className="h-[70px] flex items-center justify-between px-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white shadow-xs">
              <Activity size={18} />
            </div>
            <div>
              <span className="font-bold tracking-tight text-base text-white">AyuStream</span>
              <span className="text-brand-light font-semibold text-xs ml-1.5 px-1.5 py-0.2 rounded bg-white/10">
                EMS
              </span>
            </div>
          </div>
          <button
            aria-label="Close navigation"
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Emergency Voice Hotline Trigger */}
        <div className="px-3 pt-3.5">
          <button
            onClick={() => {
              setVoiceOpen(true);
              setMobileOpen(false);
            }}
            className="w-full text-left rounded-lg bg-brand/15 hover:bg-brand/25 border border-brand/30 px-3 py-2.5 text-white transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Radio size={15} className="text-brand-light animate-pulse" />
              <div>
                <div className="text-xs font-semibold text-white">Voice & Radio Intercom</div>
                <div className="text-[11px] text-slate-300">Hinglish Hotline · Channel 108</div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand text-white">
              Push-to-Talk
            </span>
          </button>
        </div>

        {/* Navigation Section */}
        <div className="px-4 mt-5 mb-1 text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
          Workspace
        </div>
        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5" aria-label="Main Navigation">
          {navItems
            .filter(item => item.roles.includes(user?.role || ''))
            .map(item => (
              <NavLink
                key={item.url}
                end={item.url === '/'}
                to={item.url}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon size={16} />
                <span className="flex-1">{item.name}</span>
              </NavLink>
            ))}
        </nav>

        {/* User Identity & Logout Footer */}
        <div className="border-t border-white/10 p-3 bg-navy-dark">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand/20 text-brand-light font-bold text-xs flex items-center justify-center border border-brand/30 shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs text-white truncate">{user?.name}</div>
              <div className="text-[11px] text-slate-400 capitalize truncate">
                {user?.role} · Active Duty
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                nav('/login');
              }}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar */}
        <header className="h-[64px] bg-white border-b border-surface-border px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open mobile menu"
              className="lg:hidden p-2 text-charcoal hover:bg-surface-subtle rounded-lg"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb Context */}
            <div className="hidden sm:flex items-center text-xs text-slateText">
              <span>AyuStream</span>
              <ChevronRight size={13} className="mx-1.5 text-slate-400" />
              <span className="font-semibold text-charcoal">{activeNav?.name || 'Workspace'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Telemetry Frequency Ticker with Animated ECG Wave */}
            <div className="hidden xl:flex items-center gap-2.5 px-3 py-1 bg-brand-50/70 rounded-full border border-brand/20">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
                </span>
                <span className="font-mono text-[10.5px] font-bold text-brand uppercase tracking-wider">
                  154.280 MHz MESH
                </span>
              </div>
              <svg
                className="w-14 h-3.5 text-brand"
                viewBox="0 0 100 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path
                  className="animate-ecg"
                  d="M0 12 L20 12 L28 4 L36 20 L44 8 L52 16 L60 12 L100 12"
                />
              </svg>
            </div>

            {/* Quick Hotline Trigger in Header */}
            <button
              onClick={() => setVoiceOpen(true)}
              className="btn btn-secondary text-xs py-1.5 px-3 border-surface-border hover:border-brand text-charcoal shadow-xs"
            >
              <Radio size={14} className="text-brand animate-pulse" />
              <span className="hidden md:inline">EMS Radio Hotline</span>
              <span className="text-[10px] bg-brand-light text-brand-dark px-1.5 py-0.2 rounded font-bold font-mono">
                CH-108
              </span>
            </button>

            {/* Radio Sound Test Chirp Button */}
            <button
              onClick={() => playRadioChirp()}
              title="Test Motorola Radio Chirp (Web Audio API)"
              className="p-2 rounded-lg text-slateText hover:text-brand hover:bg-surface-subtle transition-colors"
              aria-label="Test Radio Audio"
            >
              <Volume2 size={16} />
            </button>

            {/* Real-Time WebSocket Status */}
            <ConnectionStatus status={live.status} lastSync={short(live.lastSync)} />

            {/* Notifications Dropdown Toggle */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-lg text-slateText hover:text-charcoal hover:bg-surface-subtle relative transition-colors"
                aria-label="Notifications"
              >
                <Bell size={16} />
                {live.events.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-card shadow-elevated border border-surface-border p-3 z-50">
                  <div className="flex justify-between items-center pb-2 border-b border-surface-border mb-2">
                    <span className="text-xs font-semibold text-charcoal">Recent Live Events</span>
                    <span className="text-[11px] text-slateText">{live.events.length} received</span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {live.events.length === 0 ? (
                      <div className="text-xs text-slateText py-3 text-center">No recent alerts</div>
                    ) : (
                      live.events.slice(0, 5).map(e => (
                        <div key={e.id} className="text-xs p-2 rounded bg-surface-subtle">
                          <div className="font-semibold text-charcoal capitalize">
                            {e.event_type.replace(/_/g, ' ')}
                          </div>
                          <div className="text-[11px] text-slateText mt-0.5">{short(e.occurred_at)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Role Badge */}
            <span className="hidden sm:inline-flex rounded-md bg-surface-subtle px-2.5 py-1 text-xs font-bold text-charcoal capitalize border border-surface-border font-mono">
              {user?.role}
            </span>
          </div>
        </header>

        {/* Page Main Wrap */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="page-wrap">
            <Outlet context={{ openVoiceModal: () => setVoiceOpen(true) }} />
          </div>
        </main>

        {/* Reassuring Healthcare Footer */}
        <footer className="px-4 sm:px-8 py-3 bg-white border-t border-surface-border text-xs text-slateText flex flex-wrap items-center justify-between gap-2">
          <div>AyuStream AI · Emergency Coordination & Clinical Handover Network</div>
          <div>Human clinical confirmation required for patient destinations</div>
        </footer>
      </div>

      {/* Global EMS Radio & Hotline Modal */}
      <VoiceIntercomModal
        isOpen={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        availableCases={cases}
      />
    </div>
  );
}
