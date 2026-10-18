import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Ambulance,
  BarChart3,
  Bell,
  Building2,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Radio,
  Route,
  Settings,
  X,
  PhoneCall
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useLive } from '../lib/live';
import { short } from '../lib/api';
import { ConnectionStatus } from './UI';
import VoiceIntercomModal from './VoiceIntercomModal';

const navigation = [
  ['/', 'Overview', LayoutDashboard, ['paramedic', 'hospital', 'coordinator', 'admin']],
  ['/cases', 'Cases', Ambulance, ['paramedic', 'hospital', 'coordinator', 'admin']],
  ['/routes', 'Coordination', Route, ['paramedic', 'hospital', 'coordinator', 'admin']],
  ['/hospital', 'Hospital desk', Building2, ['hospital', 'coordinator', 'admin']],
  ['/analytics', 'Analytics', BarChart3, ['hospital', 'coordinator', 'admin']],
  ['/simulator', 'Simulator', FlaskConical, ['admin']],
  ['/settings', 'Settings', Settings, ['admin']],
] as const;

export default function Shell() {
  const { user, logout } = useAuth();
  const live = useLive();
  const nav = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [intercom, setIntercom] = useState(false);
  const [alerts, setAlerts] = useState(false);

  const active =
    navigation.find(([url]) =>
      url === '/' ? location.pathname === '/' : location.pathname.startsWith(url)
    )?.[1] || 'Workspace';

  const close = () => setDrawer(false);

  return (
    <div className="min-h-screen bg-surface-bg lg:grid lg:grid-cols-[232px_1fr]">
      {/* Mobile Drawer Backdrop */}
      {drawer && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close navigation"
          onClick={close}
          onKeyDown={e => (e.key === 'Escape' || e.key === 'Enter') && close()}
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      {/* Sidebar / Off-Canvas Mobile Drawer */}
      <aside
        style={{ backgroundColor: '#142B3B' }}
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] sm:w-[240px] flex-col bg-navy px-3.5 py-4 text-white shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-[232px] lg:shadow-none ${
          drawer ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pb-5 pt-1">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-lg shadow-brand/20">
              <Activity size={19} />
            </span>
            <div>
              <div className="font-display text-base font-bold text-white tracking-tight">AyuStream</div>
              <div className="text-[10px] font-bold tracking-[.18em] text-teal-300">CARE COORDINATION</div>
            </div>
          </div>
          <button
            onClick={close}
            aria-label="Close menu"
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white transition lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* EMS Quick Intercom Button */}
        <button
          onClick={() => {
            setIntercom(true);
            close();
          }}
          className="mb-5 flex items-center gap-2.5 rounded-xl border border-teal-400/30 bg-teal-500/15 px-3 py-2.5 text-left text-xs text-teal-200 transition hover:bg-teal-500/25 active:scale-[0.98]"
        >
          <Radio size={16} className="text-teal-300 animate-pulse shrink-0" />
          <span className="min-w-0 flex-1">
            <strong className="block text-white font-semibold">EMS Intercom</strong>
            <span className="text-[11px] text-slate-300 truncate block">Open voice coordination</span>
          </span>
        </button>

        <p className="px-2 pb-2 text-[10px] font-bold tracking-[.16em] text-slate-400 uppercase">WORKSPACE</p>

        {/* Navigation Links */}
        <nav className="space-y-1 overflow-y-auto flex-1 no-scrollbar" aria-label="Primary navigation">
          {navigation
            .filter(([, , , roles]) => roles.includes((user?.role || '') as never))
            .map(([url, label, Icon]) => (
              <NavLink
                key={url}
                end={url === '/'}
                to={url}
                onClick={close}
                className={({ isActive }) =>
                  `nav-link flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'active bg-brand text-white font-semibold'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={17} className="shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
        </nav>

        {/* User Card & Sign Out */}
        <div className="mt-auto pt-3 border-t border-white/10">
          <div className="rounded-xl border border-white/10 bg-white/[.06] p-2.5 flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/30 text-xs font-bold text-teal-200 border border-teal-400/20">
              {user?.name?.[0] || 'U'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user?.name}</p>
              <p className="truncate text-[11px] capitalize text-slate-400">{user?.role}</p>
            </div>
            <button
              onClick={() => {
                logout();
                nav('/login');
              }}
              title="Sign out"
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="min-w-0 flex flex-col min-h-screen">
        {/* Sticky App Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-surface-border bg-white/95 px-3.5 sm:px-7 backdrop-blur">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setDrawer(true)}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-charcoal hover:bg-slate-100 active:scale-95 transition lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-[10px] font-bold tracking-[.14em] text-slateText uppercase">
                AYUSTREAM / {active}
              </p>
              <p className="hidden text-sm font-semibold text-charcoal sm:block">Operational workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <ConnectionStatus status={live.status} lastSync={short(live.lastSync)} />

            {/* Live Alerts Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setAlerts(!alerts)}
                aria-label="Live updates"
                className="relative rounded-lg p-2 text-slateText hover:bg-surface-subtle transition"
              >
                <Bell size={18} />
                {live.events.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand ring-2 ring-white" />
                )}
              </button>

              {alerts && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl border border-surface-border bg-white p-2.5 shadow-xl z-40">
                  <p className="px-2 py-1.5 text-xs font-bold text-charcoal border-b border-surface-border pb-2">
                    Recent live updates
                  </p>
                  <div className="max-h-64 overflow-y-auto mt-1 space-y-1">
                    {live.events.length ? (
                      live.events.slice(0, 5).map(e => (
                        <div
                          key={e.id}
                          className="rounded-lg px-2.5 py-2 text-xs hover:bg-surface-subtle transition"
                        >
                          <p className="font-semibold text-charcoal capitalize">
                            {e.event_type.replace(/[._]/g, ' ')}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slateText font-mono">
                            {e.case_id || 'System Event'} · {short(e.occurred_at)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-xs text-slateText text-center">No recent updates.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick EMS Intercom Header Button (Desktop & Tablet) */}
            <button
              onClick={() => setIntercom(true)}
              className="hidden sm:inline-flex btn btn-secondary text-xs items-center gap-1.5 py-2 px-3 border-teal-300/40 text-teal-800 bg-teal-50/70 hover:bg-teal-100/70"
            >
              <Radio size={14} className="text-teal-600 animate-pulse" />
              <span>Intercom</span>
            </button>

            {/* New Emergency Intake Button */}
            {['paramedic', 'coordinator', 'admin'].includes(user?.role || '') && (
              <NavLink to="/new" className="btn btn-primary px-3 sm:px-4 text-xs flex items-center gap-1.5 shadow-sm">
                <Plus size={15} />
                <span className="hidden sm:inline">New case</span>
              </NavLink>
            )}
          </div>
        </header>

        {/* Page Content with safe padding for mobile bottom nav */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="page-wrap">
            <Outlet context={{ openVoiceModal: () => setIntercom(true) }} />
          </div>
        </main>

        {/* Desktop Footer */}
        <footer className="border-t border-surface-border bg-white px-5 py-3 text-[11px] text-slateText sm:px-8 hidden lg:block">
          Synthetic demonstration only · Not for real emergency dispatch, diagnosis, or treatment.
        </footer>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Thumb-Friendly Phone Usability) */}
      <nav
        aria-label="Mobile Navigation"
        style={{ backgroundColor: '#142B3B' }}
        className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-white/10 bg-navy/95 px-2 py-1.5 text-white backdrop-blur-md shadow-2xl lg:hidden"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition ${
              isActive ? 'text-teal-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <LayoutDashboard size={19} />
          <span>Overview</span>
        </NavLink>

        <NavLink
          to="/cases"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition ${
              isActive ? 'text-teal-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <Ambulance size={19} />
          <span>Cases</span>
        </NavLink>

        {/* Center Prominent Intercom Action */}
        <button
          onClick={() => setIntercom(true)}
          className="relative -top-3.5 flex flex-col items-center justify-center h-12 w-12 rounded-full bg-gradient-to-tr from-brand-600 to-teal-400 text-white shadow-lg shadow-teal-500/30 border-2 border-[#142B3B] active:scale-95 transition"
          aria-label="Open voice intercom"
        >
          <Radio size={20} className="animate-pulse" />
        </button>

        <NavLink
          to="/routes"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition ${
              isActive ? 'text-teal-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <Route size={19} />
          <span>Routes</span>
        </NavLink>

        <button
          onClick={() => setDrawer(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition"
          aria-label="Open all navigation options"
        >
          <Menu size={19} />
          <span>Menu</span>
        </button>
      </nav>

      <VoiceIntercomModal
        isOpen={intercom}
        onClose={() => setIntercom(false)}
        activeCaseId={undefined}
        availableCases={[]}
      />
    </div>
  );
}
