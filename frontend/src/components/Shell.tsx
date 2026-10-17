import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Ambulance, BarChart3, Bell, Building2, FlaskConical, LayoutDashboard, LogOut, Menu, Plus, Radio, Route, Settings, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useLive } from '../lib/live';
import { short } from '../lib/api';
import { ConnectionStatus } from './UI';
import VoiceIntercomModal from './VoiceIntercomModal';

const navigation=[
  ['/', 'Overview', LayoutDashboard, ['paramedic','hospital','coordinator','admin']],
  ['/cases', 'Cases', Ambulance, ['paramedic','hospital','coordinator','admin']],
  ['/routes', 'Coordination', Route, ['paramedic','hospital','coordinator','admin']],
  ['/hospital', 'Hospital desk', Building2, ['hospital','coordinator','admin']],
  ['/analytics', 'Analytics', BarChart3, ['hospital','coordinator','admin']],
  ['/simulator', 'Simulator', FlaskConical, ['admin']],
  ['/settings', 'Settings', Settings, ['admin']],
] as const;

export default function Shell(){
  const {user,logout}=useAuth(); const live=useLive(); const nav=useNavigate(); const location=useLocation();
  const [drawer,setDrawer]=useState(false); const [intercom,setIntercom]=useState(false); const [alerts,setAlerts]=useState(false);
  const active=navigation.find(([url])=>url==='/'?location.pathname==='/':location.pathname.startsWith(url))?.[1]||'Workspace';
  const close=()=>setDrawer(false);
  return <div className="min-h-screen bg-surface-bg lg:grid lg:grid-cols-[232px_1fr]">
    {drawer&&<button aria-label="Close navigation" onClick={close} className="fixed inset-0 z-40 bg-navy/45 lg:hidden"/>}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[232px] flex-col bg-navy px-3 py-4 text-white transition-transform lg:sticky lg:top-0 lg:h-screen ${drawer?'translate-x-0':'-translate-x-full lg:translate-x-0'}`}>
      <div className="flex items-center justify-between px-2 pb-5"><div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand shadow-lg shadow-brand/20"><Activity size={18}/></span><div><div className="font-display text-base font-bold">AyuStream</div><div className="text-[10px] font-semibold tracking-[.18em] text-brand-light">CARE COORDINATION</div></div></div><button onClick={close} className="rounded-lg p-1.5 text-slate-400 lg:hidden"><X size={18}/></button></div>
      <button onClick={()=>{setIntercom(true);close()}} className="mb-5 flex items-center gap-2 rounded-xl border border-brand/25 bg-brand/10 px-3 py-2.5 text-left text-xs text-brand-light transition hover:bg-brand/20"><Radio size={15}/><span><strong className="block text-white">EMS intercom</strong><span className="text-[11px] text-slate-300">Open voice coordination</span></span></button>
      <p className="px-2 pb-2 text-[10px] font-bold tracking-[.16em] text-slate-500">WORKSPACE</p>
      <nav className="space-y-1" aria-label="Primary navigation">{navigation.filter(([, , ,roles])=>roles.includes((user?.role||'') as never)).map(([url,label,Icon])=><NavLink key={url} end={url==='/'} to={url} onClick={close} className={({isActive})=>`nav-link ${isActive?'active':''}`}><Icon size={16}/><span>{label}</span></NavLink>)}</nav>
      <div className="mt-auto rounded-xl border border-white/10 bg-white/[.04] p-3"><div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-full bg-brand/20 text-xs font-bold text-brand-light">{user?.name?.[0]||'U'}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{user?.name}</p><p className="truncate text-[11px] capitalize text-slate-400">{user?.role}</p></div><button onClick={()=>{logout();nav('/login')}} title="Sign out" className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"><LogOut size={15}/></button></div></div>
    </aside>
    <div className="min-w-0">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-surface-border bg-white/90 px-4 backdrop-blur sm:px-7"><div className="flex items-center gap-3"><button onClick={()=>setDrawer(true)} aria-label="Open navigation" className="rounded-lg p-2 text-charcoal hover:bg-surface-subtle lg:hidden"><Menu size={19}/></button><div><p className="text-[10px] font-bold tracking-[.14em] text-slateText">AYUSTREAM / {active}</p><p className="hidden text-sm font-semibold text-charcoal sm:block">Operational workspace</p></div></div><div className="flex items-center gap-1.5 sm:gap-3"><ConnectionStatus status={live.status} lastSync={short(live.lastSync)}/><div className="relative"><button onClick={()=>setAlerts(!alerts)} aria-label="Live updates" className="relative rounded-lg p-2 text-slateText hover:bg-surface-subtle"><Bell size={17}/>{live.events.length>0&&<span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand"/>}</button>{alerts&&<div className="absolute right-0 mt-2 w-72 rounded-xl border border-surface-border bg-white p-2 shadow-xl"><p className="px-2 py-1.5 text-xs font-semibold">Recent live updates</p>{live.events.length?live.events.slice(0,4).map(e=><div key={e.id} className="rounded-lg px-2 py-2 text-xs hover:bg-surface-subtle"><p className="font-medium text-charcoal">{e.event_type.replace(/[._]/g,' ')}</p><p className="mt-0.5 text-[11px] text-slateText">{e.case_id||'System'}</p></div>):<p className="p-3 text-xs text-slateText">No recent updates.</p>}</div>}</div>{['paramedic','coordinator','admin'].includes(user?.role||'')&&<NavLink to="/new" className="btn btn-primary px-3 text-xs"><Plus size={15}/><span className="hidden sm:inline">New case</span></NavLink>}</div></header>
      <main className="p-4 sm:p-6 lg:p-8"><div className="page-wrap"><Outlet context={{openVoiceModal:()=>setIntercom(true)}}/></div></main>
      <footer className="border-t border-surface-border bg-white px-5 py-3 text-[11px] text-slateText sm:px-8">Synthetic demonstration only · Not for real emergency dispatch, diagnosis, or treatment.</footer>
    </div>
    <VoiceIntercomModal isOpen={intercom} onClose={()=>setIntercom(false)} activeCaseId={undefined} availableCases={[]}/>
  </div>;
}
