import pytest
from fastapi.websockets import WebSocketDisconnect
from app.ai import extract_local,ClinicalSummary

def new_case(client,auth,intended='HOSP-001'):
    r=client.post('/api/cases',headers=auth,json={'identity_mode':'unknown','complaint':'Synthetic chest pain','required_capabilities':['cardiac'],'intended_hospital_id':intended})
    assert r.status_code==201,r.text
    return r.json()

def test_auth_and_role_restrictions(client,login):
    param=login(client);north=login(client,'north');river=login(client,'river')
    assert client.get('/api/cases',headers=param).status_code==200
    assert client.get('/api/cases').status_code==401
    assert client.post('/api/cases',headers=north,json={}).status_code==403
    c=new_case(client,param)
    assert c['patient_code'].startswith('TMP-')
    assert client.get('/api/cases/'+c['id'],headers=north).status_code==200
    assert client.get('/api/cases/'+c['id'],headers=river).status_code==403

def test_case_unique_ids_and_input_validation(client,login):
    p=login(client)
    a=new_case(client,p);b=new_case(client,p)
    assert a['id']!=b['id'] and a['patient_code']!=b['patient_code']
    bad=client.post('/api/cases',headers=p,json={'identity_mode':'wrong','age':-4})
    assert bad.status_code==422

def test_reports_missing_data_and_conflicts(client,login):
    p=login(client);c=new_case(client,p)
    report=client.post('/api/cases/'+c['id']+'/reports',headers=p,json={'transcript':'Synthetic chest pain, pulse 110 bpm, SPO2 94%.','source':'paramedic'})
    assert report.status_code==201,report.text
    summary=report.json()['summary']
    assert summary['vitals']['heart_rate']=='110 bpm'
    assert 'allergies' in summary['missing_fields']
    assert not summary['allergies']
    obs=client.post('/api/cases/'+c['id']+'/observations',headers=p,json={'field':'heart_rate','value':'95','unit':'bpm'})
    assert obs.status_code==201,obs.text
    assert len(obs.json()['conflict_ids'])==1
    detail=client.get('/api/cases/'+c['id'],headers=p).json()
    conflict=detail['conflicts'][0]
    assert conflict['left_value']=='110 bpm' and conflict['right_value']=='95 bpm'
    resolved=client.post(f"/api/cases/{c['id']}/conflicts/{conflict['id']}/resolve",headers=p,json={'resolution':'Both readings retained; manual recheck planned'})
    assert resolved.status_code==200 and resolved.json()['resolved']

def test_ai_validation_and_unsupported_audio(client,login):
    with pytest.raises(Exception):ClinicalSummary.model_validate({'chief_complaint':42,'invented_field':'wrong'})
    assert extract_local('Patient reports chest pain').vitals=={}
    p=login(client);c=new_case(client,p)
    invalid=client.post('/api/cases/'+c['id']+'/audio',headers=p,files={'file':('test.txt',b'not audio','text/plain')})
    assert invalid.status_code==415
    unsupported=client.post('/api/cases/'+c['id']+'/audio',headers=p,files={'file':('synthetic.wav',b'RIFFdummy','audio/wav')})
    assert unsupported.status_code==503

def test_hospital_readiness_and_explainable_matching(client,login):
    p=login(client);coord=login(client,'coordinator');north=login(client,'north')
    c=new_case(client,p)
    good=client.get(f"/api/cases/{c['id']}/matches",headers=coord).json()['matches']
    assert any(m['hospital']['id']=='HOSP-002' and m['eligible'] for m in good)
    assert any(m['hospital']['id']=='HOSP-003' and not m['eligible'] for m in good)
    assert client.patch('/api/hospitals/HOSP-002/readiness',headers=north,json={'readiness':'unable'}).status_code==403
    assert client.patch('/api/hospitals/HOSP-001/readiness',headers=north,json={'readiness':'unable','constraint':'Synthetic constraint'}).status_code==200
    updated=client.get(f"/api/cases/{c['id']}/matches",headers=coord).json()['matches']
    assert not next(x for x in updated if x['hospital']['id']=='HOSP-001')['eligible']

def test_acceptance_requires_explicit_hospital_response_and_coordinator_confirmation(client,login):
    p=login(client);coord=login(client,'coordinator');river=login(client,'river');north=login(client,'north')
    c=new_case(client,p)
    bad=client.post('/api/cases/'+c['id']+'/destination',headers=coord,json={'acceptance_id':'bogus','reason':'test'})
    assert bad.status_code==409
    req=client.post(f"/api/cases/{c['id']}/acceptances",headers=coord,json={'hospital_id':'HOSP-002'})
    assert req.status_code==201,req.text
    ident=req.json()['id']
    assert client.post('/api/acceptances/'+ident+'/respond',headers=north,json={'status':'accepted'}).status_code==403
    assert client.post('/api/cases/'+c['id']+'/destination',headers=coord,json={'acceptance_id':ident,'reason':'Transfer'}).status_code==409
    assert client.post('/api/acceptances/'+ident+'/respond',headers=river,json={'status':'accepted'}).status_code==200
    assert client.post('/api/acceptances/'+ident+'/respond',headers=river,json={'status':'declined'}).status_code==409
    assert client.post('/api/cases/'+c['id']+'/destination',headers=p,json={'acceptance_id':ident,'reason':'Transfer'}).status_code==403
    confirmed=client.post('/api/cases/'+c['id']+'/destination',headers=coord,json={'acceptance_id':ident,'reason':'Coordinated acceptance'})
    assert confirmed.status_code==200,confirmed.text
    assert confirmed.json()['confirmed_hospital_id']=='HOSP-002'
    detail=client.get('/api/cases/'+c['id'],headers=p).json()
    assert detail['destination_history'] and any(ev['event_type']=='destination.confirmed' for ev in detail['events'])

def test_resource_reservation_conflict(client,login):
    p=login(client);north=login(client,'north');c=new_case(client,p)
    a=client.post('/api/resources/HOSP-001-R01/reserve',headers=north,json={'case_id':c['id']})
    b=client.post('/api/resources/HOSP-001-R01/reserve',headers=north,json={'case_id':c['id']})
    assert a.status_code==200,a.text
    assert b.status_code==409
    assert client.post('/api/resources/HOSP-001-R01/release',headers=north).status_code==200
    assert client.post('/api/resources/HOSP-001-R01/reserve',headers=north,json={'case_id':c['id']}).status_code==200

def test_event_history_ack_replay_scope(client,login):
    p=login(client);river=login(client,'river');c=new_case(client,p)
    events=client.get('/api/events?after=0',headers=p).json()['events']
    assert events and events[0]['event_type']=='case.created'
    eid=events[0]['id']
    assert client.post('/api/events/'+eid+'/ack',headers=p).status_code==200
    assert client.post('/api/events/'+eid+'/ack',headers=p).status_code==200
    assert client.post('/api/events/'+eid+'/ack',headers=river).status_code==403
    assert client.get('/api/events?after=0',headers=river).json()['events']==[]
    assert client.get('/api/events?after='+str(events[-1]['sequence']),headers=p).json()['events']==[]

def test_websocket_broadcast_and_ack(client,login):
    p=login(client);token=p['Authorization'].split()[1]
    with client.websocket_connect('/ws?token='+token+'&after=0') as ws:
        assert ws.receive_json()['type']=='ready'
        c=new_case(client,p)
        event=ws.receive_json()
        assert event['type']=='event' and event['event']['case_id']==c['id']
        ws.send_json({'type':'ack','event_id':event['event']['id']})
        assert ws.receive_json()['type']=='ack_confirmed'
        ws.send_json({'type':'ping'})
        assert ws.receive_json()['type']=='pong'
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect('/ws?token=bad') as ws:ws.receive_json()

def test_simulator_and_admin_only(client,login):
    admin=login(client,'admin');coord=login(client,'coordinator')
    assert client.post('/api/demo/scenario',headers=coord,json={'scenario':'stale_readiness'}).status_code==403
    r=client.post('/api/demo/scenario',headers=admin,json={'scenario':'stale_readiness'})
    assert r.status_code==200,r.text
    assert next(h for h in client.get('/api/hospitals',headers=admin).json() if h['id']=='HOSP-002')['stale']
    assert client.post('/api/demo/scenario',headers=admin,json={'scenario':'clinical_conflict'}).status_code==200

def test_simultaneous_reservations_exactly_one_succeeds(client,login):
    from concurrent.futures import ThreadPoolExecutor
    p=login(client);n=login(client,'north');c=new_case(client,p)
    def attempt(_):
        return client.post('/api/resources/HOSP-001-R02/reserve',headers=n,json={'case_id':c['id']}).status_code
    with ThreadPoolExecutor(max_workers=2) as executor:
        results=list(executor.map(attempt,[1,2]))
    assert sorted(results)==[200,409],results

def test_replay_only_authorized_events(client,login):
    p=login(client);north=login(client,'north');river=login(client,'river')
    c=new_case(client,p)
    token=north['Authorization'].split()[1]
    with client.websocket_connect('/ws?token='+token+'&after=0') as ws:
        first=ws.receive_json()
        assert first['type']=='event' and first.get('replayed')
        assert first['event']['case_id']==c['id']
        assert ws.receive_json()['type']=='ready'
    token2=river['Authorization'].split()[1]
    with client.websocket_connect('/ws?token='+token2+'&after=0') as ws:
        assert ws.receive_json()['type']=='ready'

def test_extraction_provenance_and_original_summary_retained(client,login):
    p=login(client);c=new_case(client,p)
    report=client.post('/api/cases/'+c['id']+'/reports',headers=p,json={'transcript':'Synthetic chest pain, pulse 105 bpm. Allergy to penicillin. Taking aspirin. History of asthma.'})
    assert report.status_code==201,report.text
    saved=report.json()
    assert saved['summary']['allergies']==['penicillin']
    assert saved['summary']['medications']==['aspirin']
    assert saved['summary']['history']==['asthma']
    assert 'allergies' not in saved['summary']['missing_fields']
    revised=dict(saved['summary']);revised['chief_complaint']='Human-reviewed report: chest pain'
    review=client.patch(f"/api/cases/{c['id']}/reports/{saved['id']}/review",headers=p,json=revised)
    assert review.status_code==200,review.text
    assert review.json()['original_summary']['chief_complaint']!=revised['chief_complaint']
    assert review.json()['reviewed_by'] and review.json()['reviewed_at']


def test_local_extraction_does_not_turn_negated_history_into_positive_fact():
    result=extract_local('Synthetic patient: no history of asthma. Not taking aspirin. No allergy to penicillin.')
    assert not result.history and not result.medications and not result.allergies

def test_hinglish_extraction_and_radio_dispatch(client,login):
    p=login(client);c=new_case(client,p)
    report=client.post(f"/api/cases/{c['id']}/reports",headers=p,json={'transcript':'Patient ko chhati me dard hai, pulse hai 110 bpm, saturation 94 percent, bp hai 150/95. Dawai: metformin.','source':'paramedic'})
    assert report.status_code==201,report.text
    summary=report.json()['summary']
    assert summary['vitals']['heart_rate']=='110 bpm'
    assert summary['vitals']['spo2']=='94 %'
    assert summary['vitals']['blood_pressure']=='150/95 mmHg'
    assert 'metformin' in summary['medications']
    disp=client.post(f"/api/cases/{c['id']}/radio-dispatch",headers=p,json={'message':'Doctor sahab, ICU bed ready rakhiye!','channel':'Priority EMS-108','language':'hinglish','audio_simulated':True,'urgency':'immediate_critical'})
    assert disp.status_code==201,disp.text
    assert disp.json()['status']=='transmitted'

def test_ambulance_location_is_persisted_scoped_and_emits_event(client,login):
    param=login(client);north=login(client,'north');river=login(client,'river')
    case=new_case(client,param)
    update=client.post(f"/api/cases/{case['id']}/ambulance-location",headers=param,json={'latitude':12.9716,'longitude':77.5946,'accuracy_meters':8.2,'speed_mps':12.5,'heading_degrees':90})
    assert update.status_code==201,update.text
    assert update.json()['latitude']==12.9716
    detail=client.get(f"/api/cases/{case['id']}",headers=north)
    assert detail.status_code==200 and detail.json()['ambulance_location']['longitude']==77.5946
    assert any(e['event_type']=='ambulance.location_updated' for e in detail.json()['events'])
    assert client.get(f"/api/cases/{case['id']}",headers=river).status_code==403
    invalid=client.post(f"/api/cases/{case['id']}/ambulance-location",headers=param,json={'latitude':91,'longitude':77})
    assert invalid.status_code==422

def test_microphone_audio_upload_transcription(client,login):
    p=login(client);c=new_case(client,p)
    # 1. Real microphone audio upload (> 32 bytes)
    real_audio=b'RIFF'+b'\x00'*40
    res=client.post(f"/api/cases/{c['id']}/audio",headers=p,files={'file':('mic_recording.webm',real_audio,'audio/webm')})
    assert res.status_code==200,res.text
    assert 'transcript' in res.json()
    assert len(res.json()['transcript'])>10
    # 2. Microphone upload with live client dictation transcript
    res2=client.post(f"/api/cases/{c['id']}/audio",headers=p,files={'file':('mic_recording.webm',real_audio,'audio/webm')},data={'transcript':'Patient ko chhati me tez dard hai, pulse 110, bp 150/95'})
    assert res2.status_code==200,res2.text
    assert res2.json()['transcript']=='Patient ko chhati me tez dard hai, pulse 110, bp 150/95'
    # 3. Standalone intake audio transcription endpoint
    res3=client.post('/api/cases/audio/transcribe',headers=p,files={'file':('intake_audio.webm',real_audio,'audio/webm')},data={'transcript':'Patient found unconscious near highway'})
    assert res3.status_code==200,res3.text
    assert res3.json()['transcript']=='Patient found unconscious near highway'


def test_open_route_api(client,login):
    p=login(client);coord=login(client,'coordinator')
    c=new_case(client,p)
    # Test standalone open route calculation
    route_calc=client.get('/api/routes/open-route?origin_lat=12.9716&origin_lon=77.5946&dest_lat=12.9784&dest_lon=77.6408',headers=coord)
    assert route_calc.status_code==200,route_calc.text
    calc_data=route_calc.json()
    assert calc_data['status']=='ok'
    assert calc_data['distance_km']>0
    assert calc_data['duration_minutes']>0
    assert 'openstreetmap.org/directions' in calc_data['external_directions_url']
    assert len(calc_data['steps'])>0

    # Test case-specific open route calculation
    case_route=client.get(f"/api/cases/{c['id']}/open-route",headers=p)
    assert case_route.status_code==200,case_route.text
    case_data=case_route.json()
    assert case_data['status']=='ok'
    assert case_data['case_id']==c['id']
    assert case_data['hospital_id']=='HOSP-001'
    assert case_data['distance_km']>0
    assert case_data['duration_minutes']>0
    assert len(case_data['steps'])>0


