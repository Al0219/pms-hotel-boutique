#!/usr/bin/env bash
# No normal env, database, volumes or Compose inheritance.
set -euo pipefail
qa_root=$(cd "$(dirname "$0")/../.." && pwd)
export PMS_STAY_QA_ARTIFACTS=${PMS_STAY_QA_ARTIFACTS:-/tmp/pms-stay-manual-qa}
: "${PMS_STAY_QA_LAN_IP:?Export the private IP shared with the phone}"
python3 - "$PMS_STAY_QA_LAN_IP" <<'PY'
import ipaddress,sys
ip=ipaddress.ip_address(sys.argv[1])
assert ip.version==4 and ip.is_private and not ip.is_loopback, 'Private IPv4 LAN required'
PY
qa_compose=(docker compose --env-file /dev/null -p pms-stay-manual-qa -f "$qa_root/compose.stay-qa.yaml")
mkdir -p "$PMS_STAY_QA_ARTIFACTS"
"${qa_compose[@]}" config --format json > "$PMS_STAY_QA_ARTIFACTS/effective-compose.json"
python3 - "$PMS_STAY_QA_ARTIFACTS/effective-compose.json" "$qa_root" <<'PY'
import json,sys
c=json.load(open(sys.argv[1]));s=c['services'];e=s['backend']['environment']
assert c['name']=='pms-stay-manual-qa'
assert e['PMS_DATABASE_URL']=='jdbc:postgresql://postgres:5432/pms_stay_qa'
assert e['PMS_DATABASE_USERNAME']=='pms_stay_qa'
assert s['postgres']['environment']['POSTGRES_DB']=='pms_stay_qa'
assert set(c['volumes'])=={'stay-qa-postgres'}
assert c['volumes']['stay-qa-postgres']['name']=='pms-stay-manual-qa_stay-qa-postgres'
assert s['postgres']['volumes'][0]['source']=='stay-qa-postgres'
assert set(c['networks'])=={'qa','edge'} and c['networks']['qa']['internal'] is True
assert set(s['postgres']['networks'])=={'qa'}
assert not any(n.get('external') for n in c['networks'].values())
for service in s.values():
 assert not service.get('env_file') and not service.get('network_mode') and not service.get('container_name')
 assert all(not v.get('external') for v in service.get('volumes',[]))
for service in ['backend','web']:
 assert s[service]['build']['context'].startswith(sys.argv[2]+'/')
print('PREFLIGHT PASS: own DB pms_stay_qa, own named volume, isolated network and worktree builds. No normal .env.')
PY
if [[ ${1:-preflight} == preflight ]]; then exit 0; fi
[[ ${1:-} == start ]] || { echo 'Usage: stay-qa.sh preflight|start'; exit 1; }
qa_tls="$PMS_STAY_QA_ARTIFACTS/tls"
mkdir -p "$qa_tls"
if [[ ! -e "$qa_tls/truststore.p12" ]]; then
 openssl req -x509 -newkey rsa:2048 -nodes -days 7 -subj /CN=mailpit -addext subjectAltName=DNS:mailpit -keyout "$qa_tls/mailpit.key" -out "$qa_tls/mailpit.crt" 2>/dev/null
 keytool -importcert -noprompt -alias stay-qa-mailpit -file "$qa_tls/mailpit.crt" -keystore "$qa_tls/truststore.p12" -storetype PKCS12 -storepass StayQaTrustOnly2026 >/dev/null 2>&1
 # Dedicated synthetic certificate/key only; containers run as different unprivileged UIDs.
 chmod 644 "$qa_tls/mailpit.key" "$qa_tls/mailpit.crt" "$qa_tls/truststore.p12"
fi
"${qa_compose[@]}" up -d --build --wait
"${qa_compose[@]}" ps
