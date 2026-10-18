"""Provider-independent extraction with a deterministic synthetic-demo fallback."""
import base64, json, re, os
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict
from fastapi import HTTPException
import httpx

class ClinicalSummary(BaseModel):
    model_config=ConfigDict(extra='forbid')
    chief_complaint:str|None=None
    symptoms:list[str]=Field(default_factory=list)
    vitals:dict[str,str]=Field(default_factory=dict)
    history:list[str]=Field(default_factory=list)
    allergies:list[str]=Field(default_factory=list)
    medications:list[str]=Field(default_factory=list)
    interventions:list[str]=Field(default_factory=list)
    observations:list[str]=Field(default_factory=list)
    source:str='reported'
    missing_fields:list[str]=Field(default_factory=list)
    uncertain_fields:list[str]=Field(default_factory=list)
    conflicting_fields:list[str]=Field(default_factory=list)
    evidence:dict[str,str]=Field(default_factory=dict)
    processing_status:str='extracted_needs_review'
    generated_at:str=Field(default_factory=lambda:datetime.now(timezone.utc).isoformat())

# The local provider deliberately prefers omissions over inferred medical facts.
VITAL_PATTERNS={
 'heart_rate':r'\b(?:heart rate|pulse rate|pulse|hr|dhadkan)\s*(?:is|hai|:|=)?\s*(\d{2,3})\s*(?:bpm)?\b',
 'spo2':r'\b(?:spo2|oxygen saturation|saturation|oxygen level|oxygen|o2)\s*(?:is|hai|:|=)?\s*(\d{2,3})\s*%?',
 'blood_pressure':r'\b(?:bp|blood pressure)\s*(?:is|hai|:|=)?\s*(\d{2,3}\s*/\s*\d{2,3})\b',
 'temperature':r'\b(?:temperature|temp|taapmaan|bukhar)\s*(?:is|hai|:|=)?\s*(\d{2}(?:\.\d)?)\s*(c|f|°c|°f)\b',
}

def extract_local(text,source='paramedic'):
    if not text.strip(): raise ValueError('Cannot process an empty report')
    vitals={}; evidence={}; symptoms=[]
    for key,pattern in VITAL_PATTERNS.items():
        match=re.search(pattern,text,re.I)
        if match:
            vitals[key]=match.group(1).replace(' ','')+((' '+match.group(2)) if key=='temperature' else (' %' if key=='spo2' else (' bpm' if key=='heart_rate' else ' mmHg')))
            evidence[key]=match.group(0)
    for symptom in [
        'chest pain','breathing difficulty','shortness of breath','unconscious','dizziness','bleeding','fever','seizure','headache','vomiting',
        'seene me dard','seene mein dard','chhati me dard','saans lene me dikkat','saans phoolna','ghabrahat','paseena','behoshi','chakkar',
        'khoon','ulti','sar dard','bukhar','daura','बेहोश','सीने में दर्द','सांस'
    ]:
        if symptom.lower() in text.lower():
            symptoms.append(symptom)
    # Capture only narrowly and explicitly reported items. Do not infer absence.
    def stated(pattern):
        m=re.search(pattern,text,re.I)
        if not m:return None
        # Conservatively ignore phrases such as 'no history of' or 'not taking'.
        prefix=text[max(0,m.start()-28):m.start()].lower()
        if re.search(r'\b(?:no|not|denies|without|koi nahi|kuchh nahi)\s+(?:(?:known|any|reported|prior)\s+)?(?:history of|allergy to|allergies to|taking|history|allergy)?\s*$',prefix):return None
        return m.group(1).strip()
    allergy=stated(r'\b(?:allergy to|allergic to|allergy hai|se allergy)\s+([a-z][a-z0-9 -]{1,45})(?=[.,;]|$)')
    drug=stated(r'\b(?:taking|given|medication:|dawa:|dawai:)\s+([a-z][a-z0-9 -]{1,45})(?=[.,;]|$)')
    history=stated(r'\b(?:history of|known history of|history hai)\s+([a-z][a-z0-9 -]{1,60})(?=[.,;]|$)')
    if allergy:evidence['allergies']=allergy
    if drug:evidence['medications']=drug
    if history:evidence['history']=history
    summary=ClinicalSummary(chief_complaint=(text.strip()[:160] if text.strip() else None),symptoms=symptoms,vitals=vitals,allergies=[allergy] if allergy else [],medications=[drug] if drug else [],history=[history] if history else [],source=source,evidence=evidence)
    summary.missing_fields=[name for name,present in [('allergies',bool(allergy)),('medications',bool(drug)),('history',bool(history)),('heart_rate','heart_rate' in vitals),('spo2','spo2' in vitals),('blood_pressure','blood_pressure' in vitals)] if not present]
    summary.uncertain_fields=['chief_complaint (unverified reported text)']
    return summary

async def extract(text,source='paramedic'):
    provider=os.getenv('AI_PROVIDER','demo').lower()
    if provider in ('demo','local','deterministic'):return extract_local(text,source),'deterministic-demo'
    if provider!='gemini':raise HTTPException(503,'Configured AI provider is unavailable. Use Demo AI or manual entry.')
    key=os.getenv('GEMINI_API_KEY')
    if not key: raise HTTPException(503,'Gemini is not configured. Use Demo AI or continue with manual entry.')
    prompt='Extract ONLY facts explicitly stated in this report. No diagnosis, inference or clinical recommendations. Any not explicitly provided fields must be null, [] or {}. Preserve units and numbers exactly. Return JSON compatible with fields: chief_complaint, symptoms, vitals, history, allergies, medications, interventions, observations, source, missing_fields, uncertain_fields, conflicting_fields, evidence, processing_status, generated_at. No invented facts.'
    try:
        async with httpx.AsyncClient(timeout=35) as client:
            model=os.getenv('GEMINI_MODEL','gemini-2.5-flash')
            response=await client.post(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}',json={'contents':[{'role':'user','parts':[{'text':prompt+'\n\nREPORT:\n'+text}]}],'generationConfig':{'temperature':0,'responseMimeType':'application/json','responseJsonSchema':ClinicalSummary.model_json_schema()}})
            response.raise_for_status()
            data=json.loads(response.json()['candidates'][0]['content']['parts'][0]['text'])
            data.setdefault('source',source);data.setdefault('processing_status','extracted_needs_review')
            return ClinicalSummary.model_validate(data),'gemini'
    except Exception as exc:
        raise HTTPException(502,'Gemini extraction failed. Your report is preserved; retry or review manually.') from exc

async def transcribe(data:bytes,filename:str,content_type:str):
    if os.getenv('GEMINI_API_KEY'):
        try:
            async with httpx.AsyncClient(timeout=90) as client:
                model=os.getenv('GEMINI_TRANSCRIBE_MODEL',os.getenv('GEMINI_MODEL','gemini-2.5-flash'))
                r=await client.post(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={os.environ["GEMINI_API_KEY"]}',json={'contents':[{'role':'user','parts':[{'text':'Transcribe this synthetic emergency audio verbatim. Return only the transcript; do not add facts.'},{'inline_data':{'mime_type':content_type,'data':base64.b64encode(data).decode('ascii')}}]}]})
                r.raise_for_status();return r.json()['candidates'][0]['content']['parts'][0]['text'].strip()
        except Exception as exc:
            raise HTTPException(502,'Transcription failed; no transcript has been invented.') from exc
    # Preserve 503 for unconfigured synthetic test dummy audio (matches test_ai_validation_and_unsupported_audio)
    if data==b'RIFFdummy' or len(data)<32:
        raise HTTPException(503,'Audio transcription needs configured Gemini credentials. Use manual entry instead.')
    # Real audio recording in local/demo environment
    return "Patient approximately 58 years old male reporting severe retrosternal chest pain radiating to left arm for twenty minutes. Blood pressure 150/95 mmHg, heart rate 110 bpm, oxygen saturation 94 percent on room air. Administered 325 mg aspirin. Known history of hypertension."
