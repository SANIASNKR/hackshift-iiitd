import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {api,BASE,EventData,getToken} from './api';import {useAuth} from './auth';
type Live={status:string;lastSync:string|null;events:EventData[];reload:()=>void;pending:number};const C=createContext<Live|null>(null);
export const useLive=()=>{const c=useContext(C);if(!c)throw new Error('Live missing');return c};
export function LiveProvider({children}:{children:React.ReactNode}){
  const {user}=useAuth();const [status,setStatus]=useState('disconnected'),[events,setEvents]=useState<EventData[]>([]),[lastSync,setLastSync]=useState<string|null>(null);
  const wsRef=useRef<WebSocket|null>(null);const [tick,setTick]=useState(0);const [pending,setPending]=useState(0);
  useEffect(()=>{if(!user)return;let stopped=false;let ws:WebSocket|null=null;let retries=0;let timer:ReturnType<typeof setTimeout>|undefined;let heartbeat:ReturnType<typeof setInterval>|undefined;
    const ingest=(ev:EventData)=>{setEvents(old=>[ev,...old.filter(e=>e.id!==ev.id)].slice(0,150));const n=Number(localStorage.getItem('ayu-cursor')||0);if(ev.sequence>n)localStorage.setItem('ayu-cursor',String(ev.sequence));setLastSync(new Date().toISOString());ws?.readyState===WebSocket.OPEN&&ws.send(JSON.stringify({type:'ack',event_id:ev.id}))};
    const connect=()=>{if(stopped||ws?.readyState===WebSocket.OPEN||ws?.readyState===WebSocket.CONNECTING)return;setStatus('connecting');const proto=BASE?BASE.replace(/^http/,'ws'):location.origin.replace(/^http/,'ws');const cursor=localStorage.getItem('ayu-cursor')||'0';ws=new WebSocket(proto+'/ws?token='+encodeURIComponent(getToken())+'&after='+cursor);wsRef.current=ws;
      ws.onopen=()=>{retries=0;setStatus('connected');setLastSync(new Date().toISOString());heartbeat=setInterval(()=>ws?.readyState===WebSocket.OPEN&&ws.send(JSON.stringify({type:'ping'})),20000)};
      ws.onmessage=m=>{try{const data=JSON.parse(m.data);if(data.type==='event')ingest(data.event);if(data.type==='pong'||data.type==='ready')setLastSync(new Date().toISOString())}catch{}};
      ws.onerror=()=>setStatus('connection error');ws.onclose=()=>{if(heartbeat)clearInterval(heartbeat);setStatus('disconnected');if(!stopped)timer=setTimeout(connect,Math.min(1000*2**retries++,15000))};
    };
    api<{events:EventData[]}>('/events?after='+Number(localStorage.getItem('ayu-cursor')||0)+'&limit=100').then(r=>{r.events.forEach(ingest);setPending(0)}).catch(()=>setPending(p=>p+1)).finally(connect);
    const online=()=>{if(ws?.readyState!==WebSocket.OPEN){ws?.close();if(timer)clearTimeout(timer);connect()}};
    window.addEventListener('online',online);
    return()=>{stopped=true;if(timer)clearTimeout(timer);if(heartbeat)clearInterval(heartbeat);window.removeEventListener('online',online);ws?.close()};
  },[user?.id,tick]);
  return <C.Provider value={{status,lastSync,events,reload:()=>setTick(n=>n+1),pending}}>{children}</C.Provider>
}
