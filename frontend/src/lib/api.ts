export type User={id:string;username:string;name:string;role:'paramedic'|'hospital'|'coordinator'|'admin';hospital_id:string|null};
export type Case={id:string;patient_code:string;identity_mode:string;identity_name:string|null;age:number|null;sex:string|null;complaint:string;team:string|null;eta_minutes:number|null;required_capabilities:string[];intended_hospital_id:string|null;confirmed_hospital_id:string|null;created_by:string;status:string;updated_at:string;created_at:string;identity_reviewed:boolean};
export type Hospital={id:string;name:string;area:string;capabilities:string[];readiness:string;constraint:string|null;stale:boolean;updated_at:string};
export type Report={id:string;transcript:string;review_status:string;summary:ClinicalSummary;source:string;provider:string;created_at:string};
export type ClinicalSummary={chief_complaint:string|null;symptoms:string[];vitals:Record<string,string>;history:string[];allergies:string[];medications:string[];interventions:string[];observations:string[];source:string;missing_fields:string[];uncertain_fields:string[];conflicting_fields:string[];evidence:Record<string,string>;processing_status:string;generated_at:string};
export type EventData={id:string;sequence:number;event_type:string;case_id:string|null;hospital_id:string|null;occurred_at:string;payload:Record<string,unknown>};
export type Acceptance={id:string;case_id:string;hospital_id:string;status:string;note:string|null;created_at:string;responded_at:string|null;escalated_at:string|null};
export type Resource={id:string;hospital_id:string;type:string;state:string;case_id:string|null};
export type AmbulanceLocation={id:string;case_id:string;latitude:number;longitude:number;accuracy_meters:number|null;speed_mps:number|null;heading_degrees:number|null;reported_at:string;created_by:string};
export type CaseDetails={case:Case;reports:Report[];observations:{id:string;field:string;value:string;unit:string|null;source:string;verification:string;created_at:string}[];conflicts:{id:string;field:string;left_value:string;right_value:string;left_source:string;right_source:string;resolved:boolean;resolution:string|null}[];acceptances:Acceptance[];destination_history:{id:string;to_hospital_id:string;created_at:string;reason:string}[];ambulance_location:AmbulanceLocation|null;location_history:AmbulanceLocation[];events:EventData[]};
export type OpenRouteData={status:string;provider:string;case_id?:string;hospital_id?:string;hospital_name?:string;hospital_area?:string;origin:{latitude:number;longitude:number;label:string};destination:{latitude:number;longitude:number;name?:string;label?:string;area?:string};distance_km:number;duration_minutes:number;external_directions_url:string;steps:string[];geometry?:unknown};
export const BASE=(import.meta.env.VITE_API_URL||'').replace(/\/+$/,'');
export const getToken=()=>localStorage.getItem('ayu-demo-token')||'';
export async function api<T=unknown>(path:string,init:RequestInit={}):Promise<T>{
  const isForm=init.body instanceof FormData;
  const resp=await fetch(BASE+'/api'+path,{...init,headers:{...(!isForm?{'Content-Type':'application/json'}:{}),...(getToken()?{Authorization:'Bearer '+getToken()}:{}),...init.headers}});
  if(!resp.ok){let error='Request failed ('+resp.status+')';try{const obj=await resp.json();error=typeof obj.detail==='string'?obj.detail:error}catch{}throw new Error(error)}
  if(resp.status===204)return undefined as T;
  return await resp.json() as T;
}
export const post=<T=unknown>(path:string,data:unknown)=>api<T>(path,{method:'POST',body:JSON.stringify(data)});
export const patch=<T=unknown>(path:string,data:unknown)=>api<T>(path,{method:'PATCH',body:JSON.stringify(data)});
export const pretty=(value:string|null|undefined)=>value?new Date(value.endsWith('Z')||value.includes('+')?value:value+'Z').toLocaleString():'—';
export const short=(value:string|null|undefined)=>value?new Date(value.endsWith('Z')||value.includes('+')?value:value+'Z').toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'—';
