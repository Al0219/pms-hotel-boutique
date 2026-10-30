#!/usr/bin/env python3
"""Real API fixtures for the standalone QA project. Never writes SQL or changes dates."""
import datetime as dt
import http.cookiejar
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from zoneinfo import ZoneInfo

BASE = 'http://127.0.0.1:18089'
MAIL = 'http://127.0.0.1:18090'
WEB = 'http://localhost:3302'
OUT = Path(os.environ.get('PMS_STAY_QA_ARTIFACTS', '/tmp/pms-stay-manual-qa'))
PROPERTY = '3032709f-a48b-300b-b860-1110bc6f1f13'
GUEST_EMAIL = 'guest.demo@example.test'
GUEST_PASSWORD = 'PmsDemoLocal2026!'
ADMIN_EMAIL = 'stay.admin@example.test'
ADMIN_PASSWORD = 'StayQaAdminOnly2026!'


def call(path, body=None, token=None, method=None, key=None, origin=BASE, opener=None, expected=200):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    if key:
        headers['Idempotency-Key'] = key
    if origin == WEB:
        headers['Origin'] = WEB
    request = urllib.request.Request(origin + path, data=None if body is None else json.dumps(body).encode(),
                                     headers=headers, method=method or ('POST' if body is not None else 'GET'))
    try:
        with (opener.open if opener else urllib.request.urlopen)(request, timeout=30) as response:
            status = response.status
            raw = response.read()
    except urllib.error.HTTPError as error:
        status = error.code
        raw = error.read()
    assert status in (expected if isinstance(expected, tuple) else (expected,)), f'{method or "HTTP"} {path}: {status}, expected {expected}; {raw[:300].decode(errors="replace")}'
    return json.loads(raw) if raw else None


def guard():
    data = json.loads(subprocess.check_output(['docker', 'inspect', 'pms-stay-manual-qa-backend-1']))[0]
    env = dict(value.split('=', 1) for value in data['Config']['Env'])
    assert data['Config']['Labels']['com.docker.compose.project'] == 'pms-stay-manual-qa'
    assert env['PMS_DATABASE_URL'] == 'jdbc:postgresql://postgres:5432/pms_stay_qa'
    pg = json.loads(subprocess.check_output(['docker', 'inspect', 'pms-stay-manual-qa-postgres-1']))[0]
    assert [v['Name'] for v in pg['Mounts'] if v['Type'] == 'volume'] == ['pms-stay-manual-qa_stay-qa-postgres']
    assert dt.datetime.now(ZoneInfo('America/Guatemala')).date() == dt.date(2026, 10, 29), 'This fixture is for 2026-10-29 only; no clock bypass'


def seed_catalog():
    # The demo Property is created AFTER Liquibase's approved catalog seed.
    # Configure only QA with identical approved products, no price invention or order writes.
    sql = """
    DO $$ BEGIN
      IF current_database()<>'pms_stay_qa' OR current_user<>'pms_stay_qa' THEN
        RAISE EXCEPTION 'QA database required';
      END IF;
    END $$;
    INSERT INTO room_service_products(id,property_id,code,name,currency,unit_price_minor,available,periods)
    SELECT md5('3032709f-a48b-300b-b860-1110bc6f1f13:'||p.code)::uuid,
      '3032709f-a48b-300b-b860-1110bc6f1f13'::uuid,p.code,p.name,p.currency,p.unit_price_minor,p.available,p.periods
    FROM (SELECT DISTINCT ON(code) * FROM room_service_products
      WHERE property_id<>'3032709f-a48b-300b-b860-1110bc6f1f13'::uuid AND currency='GTQ'
      ORDER BY code,property_id) p
    ON CONFLICT(property_id,code) DO NOTHING;
    """
    subprocess.run(['docker', 'exec', '-i', 'pms-stay-manual-qa-postgres-1',
                    'psql', '-U', 'pms_stay_qa', '-d', 'pms_stay_qa', '-v', 'ON_ERROR_STOP=1'],
                   input=sql.encode(), check=True, stdout=subprocess.DEVNULL)


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(value, indent=2) + '\n')
    temp.replace(path)


def link(guest, fixture):
    owned = call('/api/v1/guest-auth/account/reservations', token=guest)
    if fixture['reservationId'] in json.dumps(owned):
        return
    before = {m['ID'] for m in call('/api/v1/messages', origin=MAIL)['messages']}
    challenge = call('/api/v1/guest-auth/reservation-links/challenges', {'confirmationCode': fixture['confirmationCode']}, guest, expected=202)
    otp = None
    for _ in range(40):
        for message in call('/api/v1/messages', origin=MAIL)['messages']:
            if message['ID'] in before:
                continue
            detail = call('/api/v1/message/' + message['ID'], origin=MAIL)
            if any(to.get('Address') == GUEST_EMAIL for to in detail.get('To', [])):
                match = re.search(r'\b\d{8}\b', detail.get('Text', ''))
                if match:
                    otp = match.group()
                    break
        if otp:
            break
        time.sleep(0.5)
    assert otp, 'No OTP delivered to isolated Mailpit; do not bypass verification'
    call('/api/v1/guest-auth/reservation-links/verify', {'requestId': challenge['requestId'], 'otp': otp}, guest, expected=204)
    assert fixture['reservationId'] in json.dumps(call('/api/v1/guest-auth/account/reservations', token=guest))


def prepare(label, admin, guest):
    path = OUT / (label + '.json')
    fixture = json.loads(path.read_text()) if path.exists() else None
    if not fixture:
        quote = call('/api/v1/reservations/creation-options?propertyId=' + PROPERTY + '&arrival=2026-10-29&departure=2026-10-30&rooms=1', token=admin)
        option = min(quote['options'], key=lambda o: o['totalMinor'])
        receipt = call('/api/v1/reservations?propertyId=' + PROPERTY, {
            'arrival': '2026-10-29', 'departure': '2026-10-30', 'rooms': 1,
            'roomTypeId': option['roomTypeId'], 'ratePlanId': option['ratePlanId'],
            'currency': quote['currency'], 'clientTotalMinor': option['totalMinor'],
            'guest': {'firstName': 'QA', 'lastName': label, 'email': GUEST_EMAIL, 'phone': '+50255550123'},
            'notes': 'Isolated Stay Journey QA: ' + label,
        }, admin, key='stay-qa-20261029-create-' + label, expected=201)
        fixture = {'reservationId': receipt['reservationId'], 'propertyId': PROPERTY}
        save(path, fixture)
    detail = call('/api/v1/reservations/' + fixture['reservationId'] + '?propertyId=' + PROPERTY, token=admin)
    stay = detail['stays'][0]
    fixture.update(stayId=stay['stayId'], confirmationCode=detail['confirmationCode'], arrival=stay['arrival'], departure=stay['departure'])
    save(path, fixture)
    if stay['room'] is None:
        room_path = '/api/v1/reservations/' + fixture['reservationId'] + '/stays/' + stay['stayId'] + '/room-assignment?propertyId=' + PROPERTY
        preview = call(room_path, token=admin)
        room = next(r for r in preview['rooms'] if r['selectable'])
        hk_path = '/api/v1/properties/' + PROPERTY + '/housekeeping/rooms/' + room['room_id']
        hk = call(hk_path + '/tracking', {}, admin)
        for target in ['CLEAN', 'INSPECTED']:
            if hk['status'] == 'INSPECTED':
                break
            if hk['status'] == 'CLEAN' and target == 'CLEAN':
                continue
            hk = call(hk_path + '/status', {'expectedStatus': hk['status'], 'expectedUpdatedAt': hk['updatedAt'], 'toStatus': target}, admin, method='PUT')
        assigned = call(room_path, {'room_id': room['room_id']}, admin, method='PUT')
        fixture.update(roomId=assigned['room_id'], roomCode=assigned['number'])
    else:
        fixture.update(roomId=stay['room']['roomId'], roomCode=stay['room']['code'])
    save(path, fixture)
    link(guest, fixture)
    journey = '/api/v1/guest-auth/account/reservations/' + fixture['reservationId'] + '/stays/' + fixture['stayId'] + '/journey'
    summary = call(journey + '/summary', token=guest)
    state = call(journey + '/state', token=guest)
    assert state['currentDate'] == '2026-10-29' and state['stay']['timezone'] == 'America/Guatemala'
    assert summary['verifiable'] and summary['currency'] == 'GTQ'
    fixture.update(folioId=summary['folioId'], backendDate=state['currentDate'], status=state['stay']['status'])
    save(path, fixture)
    print(label + ': ' + json.dumps(fixture))
    return fixture


def smoke(f, admin, guest):
    result = OUT / 'smoke-result.json'
    if result.exists() and json.loads(result.read_text()).get('pass'):
        saved = json.loads(result.read_text())
        path = '/api/v1/guest-auth/account/reservations/' + f['reservationId'] + '/stays/' + f['stayId'] + '/journey'
        recovered = call(path + '/document', token=guest)
        assert recovered['id'] == saved['documentId'] and recovered['snapshot']['balance'] == '0.00'
        assert recovered['snapshot']['stay']['status'] == 'CHECKED_OUT'
        print('Smoke already PASS; persisted document recovered, preserving manual reservation.')
        return
    g = '/api/v1/guest-auth/account/reservations/' + f['reservationId'] + '/stays/' + f['stayId']
    journey = g + '/journey'
    bff = '/api/staff/stay-journey/' + f['reservationId'] + '/' + f['stayId']
    # Match browser Secure-cookie handling for the fixed, trustworthy localhost QA origin.
    class LocalhostPolicy(http.cookiejar.DefaultCookiePolicy):
        def return_ok_secure(self, cookie, request):
            if request.full_url.startswith(WEB + '/'):
                return True
            return super().return_ok_secure(cookie, request)
    cookies = http.cookiejar.CookieJar(LocalhostPolicy())
    browser = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookies))
    call('/api/auth/login', {'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD}, origin=WEB, opener=browser, expected=201)

    def staff(path, body=None, method=None, expected=200, key=None):
        return call(path, body, method=method, key=key or str(uuid.uuid4()), origin=WEB, opener=browser, expected=expected)

    def travel(action, expected=200):
        state = call(journey + '/state', token=guest)['stay']
        return staff('/api/staff/reservations/' + f['reservationId'] + '/stays/' + f['stayId'] + '/' + action + '?propertyId=' + PROPERTY,
                     {'expectedStatus': state['status'], 'expectedUpdatedAt': state['updatedAt'], 'expectedRoomId': state['roomId']}, expected=expected)

    state = call(journey + '/state', token=guest)
    if state['stay']['status'] == 'RESERVED':
        call(journey + '/requests', {'kind': 'CHECK_IN', 'expectedUpdatedAt': state['stay']['updatedAt']}, guest, key='stay-qa-smoke-checkin-20261029')
        assert any(r['status'] == 'OPEN' for r in staff(bff + '/requests?propertyId=' + PROPERTY))
        travel('check-in')
    state = call(journey + '/state', token=guest)
    assert state['stay']['status'] == 'IN_HOUSE'
    if not any(r['kind'] == 'CHECK_OUT' and r['status'] == 'OPEN' for r in state['requests']):
        call(journey + '/requests', {'kind': 'CHECK_OUT', 'expectedUpdatedAt': state['stay']['updatedAt']}, guest, key='stay-qa-smoke-checkout-20261029')
    travel('check-out', expected=409)
    menu = call(g + '/room-service-menu', token=guest)
    product = next(item for item in menu if item['code'] == 'coffee')
    order = call(g + '/room-service-orders', {'serviceDate': '2026-10-30', 'deliveryTime': '09:00',
                 'items': [{'productId': product['id'], 'quantity': 1, 'mealPeriod': 'BEVERAGES'}], 'notes': 'QA isolated smoke'}, guest,
                 key='stay-qa-smoke-order-20261029', expected=(200, 201))
    summary = call(journey + '/summary', token=guest)
    for scenario in ['demo_card_declined', 'demo_gateway_error']:
        receipt = call(journey + '/payments', {'amount': '1.00', 'currency': 'GTQ', 'instrumentToken': scenario}, guest,
                       key='stay-qa-smoke-' + scenario.replace('_', '-'))
        assert receipt['movementId'] is None
    payload = {'amount': summary['balance'], 'currency': 'GTQ', 'instrumentToken': 'demo_visa_approved'}
    receipt = call(journey + '/payments', payload, guest, key='stay-qa-smoke-lodging-20261029')
    assert call(journey + '/payments', payload, guest, key='stay-qa-smoke-lodging-20261029') == receipt
    assert travel('check-out', expected=409)['code'] == 'PENDING_BILLABLE_ORDERS'
    order_path = '/api/staff/room-service/orders/' + order['id'] + '/status?propertyId=' + PROPERTY
    started = staff(order_path, {'expectedUpdatedAt': order['updatedAt'], 'targetStatus': 'IN_PROGRESS'}, method='PUT')
    done = staff(order_path, {'expectedUpdatedAt': started['updatedAt'], 'targetStatus': 'DONE'}, method='PUT')
    assert staff(order_path, {'expectedUpdatedAt': started['updatedAt'], 'targetStatus': 'DONE'}, method='PUT') == done
    summary = call(journey + '/summary', token=guest)
    assert len([m for m in summary['movements'] if m['kind'] == 'CHARGE']) == 2
    assert staff(bff + '/summary?propertyId=' + PROPERTY) == summary
    staff(bff + '/payments?propertyId=' + PROPERTY, {'amount': summary['balance'], 'currency': 'GTQ', 'instrumentToken': 'demo_mastercard_approved'})
    assert call(journey + '/summary', token=guest)['balance'] == '0.00'
    travel('check-out')
    document = call(journey + '/document', token=guest)
    assert staff(bff + '/document?propertyId=' + PROPERTY) == document
    new_guest = call('/api/v1/guest-auth/sessions', {'email': GUEST_EMAIL, 'password': GUEST_PASSWORD}, expected=201)['accessToken']
    assert call(journey + '/document', token=new_guest) == document
    hk = call('/api/v1/properties/' + PROPERTY + '/housekeeping/rooms/' + f['roomId'], token=admin)
    assert hk['status'] == 'DIRTY'
    save(result, {'pass': True, 'reservationId': f['reservationId'], 'documentId': document['id'], 'checkedAt': dt.datetime.now(dt.timezone.utc).isoformat()})
    print('Smoke PASS: real Guest → Web BFF → ledger/payment/replay → immutable document; manual reservation untouched.')


if __name__ == '__main__':
    guard()
    seed_catalog()
    admin = call('/api/v1/staff-auth/login', {'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD}, expected=201)['accessToken']
    guest = call('/api/v1/guest-auth/sessions', {'email': GUEST_EMAIL, 'password': GUEST_PASSWORD}, expected=201)['accessToken']
    manual = prepare('manual', admin, guest)
    test = prepare('smoke', admin, guest)
    if '--smoke' in sys.argv:
        smoke(test, admin, guest)
