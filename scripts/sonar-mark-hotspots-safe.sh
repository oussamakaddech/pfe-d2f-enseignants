#!/usr/bin/env bash
# Mark a set of SonarQube hotspots as REVIEWED/SAFE with justification.
# Usage:
#   SONAR_TOKEN=xxx bash scripts/sonar-mark-hotspots-safe.sh d2f_rice "<category-filter>" "<comment>"
#   SONAR_TOKEN=xxx bash scripts/sonar-mark-hotspots-safe.sh d2f_rice "dos" "Bounded regex on server-extracted PDF text, not user input"
set -euo pipefail

PROJECT="${1:?projectKey}"
FILTER="${2:-}"     # security category filter (e.g. dos, auth, encrypt-data) — empty = all
COMMENT="${3:?comment / justification}"
URL="${SONAR_URL:-http://localhost:9000}"
TOKEN="${SONAR_TOKEN:?SONAR_TOKEN missing}"

echo "Project: $PROJECT  Filter: ${FILTER:-<all>}"
echo "Comment: $COMMENT"

# Page through hotspots
page=1
total_marked=0
while :; do
  resp=$(curl -s -u "${TOKEN}:" "$URL/api/hotspots/search?projectKey=${PROJECT}&status=TO_REVIEW&ps=100&p=${page}")
  ids=$(echo "$resp" | python -c "
import json,sys,os
flt = '${FILTER}'
d = json.load(sys.stdin)
out = []
for h in d.get('hotspots', []):
    if not flt or h.get('securityCategory') == flt:
        out.append(h['key'])
print('\\n'.join(out))
")
  if [ -z "$ids" ]; then
    echo "[Page $page] no more hotspots"
    break
  fi
  count=$(echo "$ids" | wc -l)
  echo "[Page $page] marking $count hotspots..."
  while IFS= read -r hk; do
    [ -z "$hk" ] && continue
    curl -s -u "${TOKEN}:" -X POST \
      --data-urlencode "hotspot=${hk}" \
      --data-urlencode "status=REVIEWED" \
      --data-urlencode "resolution=SAFE" \
      --data-urlencode "comment=${COMMENT}" \
      "$URL/api/hotspots/change_status" > /dev/null
    total_marked=$((total_marked + 1))
  done <<< "$ids"
  # if filter applied and page had < 100, we're done; also break if total < 100
  total=$(echo "$resp" | python -c "import json,sys; print(json.load(sys.stdin)['paging']['total'])")
  if [ "$page" -ge "$(( (total + 99) / 100 ))" ]; then break; fi
  page=$((page + 1))
done

echo "Total marked SAFE: $total_marked"
