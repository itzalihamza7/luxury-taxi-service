#!/usr/bin/env bash
# Store the Microsoft Graph credentials the API sends email with, after checking
# Microsoft accepts them, and restart the API. Nothing is written if they fail.
#
#   bash deploy/configure-mail.sh ubuntu@<server-ip> ~/.ssh/<key>.pem
set -euo pipefail
host=${1:?usage: configure-mail.sh user@server ssh-key}
key=${2:?usage: configure-mail.sh user@server ssh-key}
uuid='^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

read -rp 'Directory (tenant) ID: ' tenant
read -rp 'Application (client) ID: ' client
read -rsp 'Client secret (the Value, not the Secret ID): ' secret
echo
tenant=$(echo "$tenant" | tr -d '[:space:]')
client=$(echo "$client" | tr -d '[:space:]')
[[ $tenant =~ $uuid ]] || { echo "The tenant ID should look like 1a2b3c4d-1234-5678-9abc-1234567890ab."; exit 1; }
[[ $client =~ $uuid ]] || { echo "The client ID should look like 1a2b3c4d-1234-5678-9abc-1234567890ab."; exit 1; }
[[ ${#secret} -ge 20 ]] || { echo "The secret is too short; copy the whole Value."; exit 1; }
[[ ! $secret =~ $uuid ]] || { echo "That is the Secret ID. Copy the Value column instead."; exit 1; }

# Runs on the server. The values arrive on its input, never on a command line.
remote=$(cat <<'REMOTE'
set -euo pipefail
read -r tenant; read -r client; read -r secret
answer=$(curl -s -X POST "https://login.microsoftonline.com/$tenant/oauth2/v2.0/token" \
  --data-urlencode grant_type=client_credentials --data-urlencode "client_id=$client" \
  --data-urlencode "client_secret=$secret" --data-urlencode scope=https://graph.microsoft.com/.default)
if ! grep -q '"access_token"' <<<"$answer"; then
  echo "Microsoft did not accept these values:"
  grep -o '"error_description":"[^"]*' <<<"$answer" | cut -d'"' -f4 | cut -d. -f1
  exit 1
fi
cd ~/signaturemile
tmp=$(mktemp)
grep -vE '^(MAIL_TRANSPORT|GRAPH_TENANT_ID|GRAPH_CLIENT_ID|GRAPH_CLIENT_SECRET)=' .env > "$tmp"
printf 'MAIL_TRANSPORT=graph\nGRAPH_TENANT_ID=%s\nGRAPH_CLIENT_ID=%s\nGRAPH_CLIENT_SECRET=%s\n' "$tenant" "$client" "$secret" >> "$tmp"
cat "$tmp" > .env
rm -f "$tmp"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d backend > /dev/null 2>&1
echo "Microsoft accepted the values. Saved, and the API restarted."
REMOTE
)
printf '%s\n%s\n%s\n' "$tenant" "$client" "$secret" | ssh -i "$key" "$host" "bash -c $(printf '%q' "$remote")"
