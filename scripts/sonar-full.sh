#!/usr/bin/env bash
# =============================================================================
# sonar-full.sh — One-command SonarQube analysis for the D2F monorepo
# =============================================================================
# Runs build + tests + sonar-scan for the 11 modules:
#   8 Java (Spring Boot via Maven + JaCoCo)
#   1 Web (React/Vite + Vitest + lcov)
#   2 Python (pytest + coverage + sonar-scanner)
#
# Usage:
#   bash scripts/sonar-full.sh                       # all modules
#   bash scripts/sonar-full.sh --only d2f_webapp     # one module by Sonar key
#   bash scripts/sonar-full.sh --only d2f_rice,d2f_webapp
#   bash scripts/sonar-full.sh --skip-tests          # scan without re-running tests
#   bash scripts/sonar-full.sh --skip-scan           # only run tests
#   bash scripts/sonar-full.sh --java-only           # subset
#   bash scripts/sonar-full.sh --python-only
#   bash scripts/sonar-full.sh --web-only
#   bash scripts/sonar-full.sh --no-summary          # disable final QG table
#
# Env vars:
#   SONAR_URL          (default: http://localhost:9000)
#   SONAR_TOKEN        (auto-generated if SONAR_USER+SONAR_PASS provided)
#   SONAR_USER         (default: admin) — used only for token bootstrap
#   SONAR_PASS         (required for token bootstrap if SONAR_TOKEN is empty)
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SONAR_URL="${SONAR_URL:-http://localhost:9000}"
SONAR_USER="${SONAR_USER:-admin}"
SONAR_PASS="${SONAR_PASS:-}"
SONAR_TOKEN="${SONAR_TOKEN:-}"
ONLY=""
SKIP_TESTS=0
SKIP_SCAN=0
JAVA_ONLY=0
PYTHON_ONLY=0
WEB_ONLY=0
SHOW_SUMMARY=1

# ── arg parsing ───────────────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
  case "$1" in
    --only)        ONLY="$2"; shift 2;;
    --skip-tests)  SKIP_TESTS=1; shift;;
    --skip-scan)   SKIP_SCAN=1; shift;;
    --java-only)   JAVA_ONLY=1; shift;;
    --python-only) PYTHON_ONLY=1; shift;;
    --web-only)    WEB_ONLY=1; shift;;
    --no-summary)  SHOW_SUMMARY=0; shift;;
    -h|--help)     sed -n '2,/^# ===/p' "$0" | sed 's/^# \?//'; exit 0;;
    *) echo "Unknown arg: $1" >&2; exit 2;;
  esac
done

# ── catalogue ─────────────────────────────────────────────────────────────────
# Format:  type|module-path|sonar-projectKey
MODULES=(
  "java|esprit_D2F-api-gateway|d2f_api_gateway"
  "java|esprit_D2F-authentification|d2f_authentification"
  "java|esprit_D2F-besoin-formation|d2f_besoin_formation"
  "java|esprit_D2F-certificat|d2f_certificat"
  "java|esprit_D2F-competence|d2f_competence"
  "java|esprit_D2F-evaluation|d2f_evaluation"
  "java|esprit_D2F-formation|d2f_formation"
  "java|esprit_D2F-analyse|d2f_analyse"
  "web|esprit_D2F-webapp|d2f_webapp"
  "python|esprit_D2F-rice|d2f_rice"
  "python|esprit_D2F-predictive-analytics|d2f_predictive_analytics"
)

# ── helpers ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; CYAN='\033[0;36m'; NC='\033[0m'
LOG_DIR="$ROOT/scripts/.sonar-logs"
mkdir -p "$LOG_DIR"

info()  { printf "${CYAN}[INFO]${NC} %s\n" "$*"; }
ok()    { printf "${GREEN}[OK]${NC}   %s\n" "$*"; }
warn()  { printf "${YELLOW}[WARN]${NC} %s\n" "$*"; }
fail()  { printf "${RED}[FAIL]${NC} %s\n" "$*"; }

wanted() {
  local mod_key="$3"
  local mtype="$1"
  if [ -n "$ONLY" ]; then
    case ",$ONLY," in *",$mod_key,"*) :;; *) return 1;; esac
  fi
  if [ "$JAVA_ONLY"   -eq 1 ] && [ "$mtype" != "java"   ]; then return 1; fi
  if [ "$PYTHON_ONLY" -eq 1 ] && [ "$mtype" != "python" ]; then return 1; fi
  if [ "$WEB_ONLY"    -eq 1 ] && [ "$mtype" != "web"    ]; then return 1; fi
  return 0
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { fail "Missing command: $1"; return 1; }
}

# ── prerequisites ─────────────────────────────────────────────────────────────
info "Checking prerequisites…"
PREREQ_OK=1
for c in curl python; do require_cmd "$c" || PREREQ_OK=0; done
if [ $JAVA_ONLY -eq 1 ] || [ -z "$ONLY$JAVA_ONLY$PYTHON_ONLY$WEB_ONLY" ]; then
  require_cmd mvn || warn "mvn not on PATH — wrappers (./mvnw) will be used if present"
fi
[ $WEB_ONLY -eq 1 ] || [ $PYTHON_ONLY -eq 1 ] || require_cmd sonar-scanner || warn "sonar-scanner not on PATH — install via 'npm i -g sonarqube-scanner' for web/python scans"
[ $JAVA_ONLY -eq 1 ] || require_cmd node || true
[ $PREREQ_OK -eq 1 ] || { fail "Missing prerequisites"; exit 2; }

# ── verify SonarQube reachable ────────────────────────────────────────────────
info "Pinging SonarQube at $SONAR_URL …"
status=$(curl -s -o /dev/null -w "%{http_code}" "$SONAR_URL/api/system/status")
if [ "$status" != "200" ]; then
  fail "SonarQube is not reachable at $SONAR_URL (HTTP $status). Start it: docker compose -f infra/sonarqube/docker-compose.yml up -d"
  exit 3
fi
sq_status=$(curl -s "$SONAR_URL/api/system/status" | python -c "import json,sys;print(json.load(sys.stdin).get('status','?'))")
[ "$sq_status" = "UP" ] || { fail "SonarQube status = $sq_status (expected UP)"; exit 3; }
ok "SonarQube is UP"

# ── token bootstrap ───────────────────────────────────────────────────────────
if [ -z "$SONAR_TOKEN" ]; then
  if [ -z "$SONAR_PASS" ]; then
    fail "SONAR_TOKEN or SONAR_PASS env var required (default user=admin)"
    echo "  Hint: export SONAR_TOKEN=squ_xxxxx  OR  SONAR_PASS=adminpwd bash scripts/sonar-full.sh"
    exit 4
  fi
  info "Generating ephemeral analysis token via admin credentials…"
  tok_name="full-analysis-$(date +%s)"
  resp=$(curl -s -u "$SONAR_USER:$SONAR_PASS" -X POST \
    "$SONAR_URL/api/user_tokens/generate?name=$tok_name")
  SONAR_TOKEN=$(echo "$resp" | python -c "import json,sys;print(json.load(sys.stdin).get('token',''))")
  if [ -z "$SONAR_TOKEN" ]; then
    fail "Token generation failed: $resp"
    exit 4
  fi
  ok "Token obtained ($tok_name)"
fi
export SONAR_TOKEN SONAR_HOST_URL="$SONAR_URL"

# ── per-module runners ────────────────────────────────────────────────────────
declare -a RESULTS  # "mod_key|status|elapsed"

run_java() {
  local path="$1"
  local key="$2"
  local log="$LOG_DIR/$key.log"
  local t0=$(date +%s)
  ( cd "$path" || exit 9
    local mvn_cmd="mvn"
    if [ -x "./mvnw" ]; then mvn_cmd="./mvnw"; fi
    if [ $SKIP_TESTS -eq 0 ]; then
      echo "[$key] mvn clean verify (tests + JaCoCo)…"
      $mvn_cmd -B -q clean verify -Dmaven.test.failure.ignore=true || true
    fi
    if [ $SKIP_SCAN -eq 0 ]; then
      echo "[$key] mvn sonar:sonar…"
      $mvn_cmd -B -q sonar:sonar \
        "-Dsonar.projectKey=$key" \
        "-Dsonar.host.url=$SONAR_URL" \
        "-Dsonar.token=$SONAR_TOKEN" \
        "-Dsonar.qualitygate.wait=false"
    fi
  ) > "$log" 2>&1
  local rc=$?
  RESULTS+=("$key|$rc|$(( $(date +%s) - t0 ))")
  if [ $rc -eq 0 ]; then ok "$key (java) done"; else fail "$key (java) — see $log"; fi
}

run_web() {
  local path="$1"
  local key="$2"
  local log="$LOG_DIR/$key.log"
  local t0=$(date +%s)
  ( cd "$path" || exit 9
    if [ $SKIP_TESTS -eq 0 ]; then
      if [ ! -d node_modules ]; then
        echo "[$key] npm ci…"
        npm ci --legacy-peer-deps --silent || npm install --legacy-peer-deps --silent
      fi
      echo "[$key] vitest --coverage (best-effort)…"
      npx vitest run --coverage --reporter=basic || true
    fi
    if [ $SKIP_SCAN -eq 0 ]; then
      command -v sonar-scanner >/dev/null 2>&1 || { echo "sonar-scanner missing"; exit 5; }
      echo "[$key] sonar-scanner…"
      sonar-scanner \
        "-Dsonar.projectKey=$key" \
        "-Dsonar.host.url=$SONAR_URL" \
        "-Dsonar.token=$SONAR_TOKEN" \
        "-Dsonar.javascript.lcov.reportPaths=coverage/lcov.info" \
        "-Dsonar.qualitygate.wait=false"
    fi
  ) > "$log" 2>&1
  local rc=$?
  RESULTS+=("$key|$rc|$(( $(date +%s) - t0 ))")
  if [ $rc -eq 0 ]; then ok "$key (web) done"; else fail "$key (web) — see $log"; fi
}

run_python() {
  local path="$1"
  local key="$2"
  local log="$LOG_DIR/$key.log"
  local t0=$(date +%s)
  ( cd "$path" || exit 9
    local PY="python"
    command -v python >/dev/null 2>&1 || PY="python3"
    if [ $SKIP_TESTS -eq 0 ]; then
      echo "[$key] pip install requirements…"
      $PY -m pip install -q -r requirements.txt 2>&1 | tail -3 || true
      $PY -m pip install -q pytest pytest-cov 2>&1 | tail -3 || true
      echo "[$key] pytest --cov…"
      $PY -m pytest --cov=. --cov-report=xml --junit-xml=junit-results.xml || true
    fi
    if [ $SKIP_SCAN -eq 0 ]; then
      command -v sonar-scanner >/dev/null 2>&1 || { echo "sonar-scanner missing"; exit 5; }
      echo "[$key] sonar-scanner…"
      sonar-scanner \
        "-Dsonar.projectKey=$key" \
        "-Dsonar.host.url=$SONAR_URL" \
        "-Dsonar.token=$SONAR_TOKEN" \
        "-Dsonar.qualitygate.wait=false"
    fi
  ) > "$log" 2>&1
  local rc=$?
  RESULTS+=("$key|$rc|$(( $(date +%s) - t0 ))")
  if [ $rc -eq 0 ]; then ok "$key (python) done"; else fail "$key (python) — see $log"; fi
}

# ── main loop ─────────────────────────────────────────────────────────────────
echo
info "Monorepo D2F — SonarQube full analysis"
info "URL: $SONAR_URL   Logs: $LOG_DIR/"
[ -n "$ONLY" ]    && info "Filter --only: $ONLY"
[ $SKIP_TESTS -eq 1 ] && info "Skipping tests"
[ $SKIP_SCAN  -eq 1 ] && info "Skipping scans"
echo

T_START=$(date +%s)
for entry in "${MODULES[@]}"; do
  IFS='|' read -r mtype mpath mkey <<< "$entry"
  wanted "$mtype" "$mpath" "$mkey" || continue
  if [ ! -d "$mpath" ]; then warn "$mkey: directory $mpath not found, skipping"; continue; fi
  echo "─── $mkey ($mtype) ────────────────────────────────────────────"
  case "$mtype" in
    java)   run_java   "$mpath" "$mkey" ;;
    web)    run_web    "$mpath" "$mkey" ;;
    python) run_python "$mpath" "$mkey" ;;
  esac
done
T_END=$(date +%s)

# ── summary ───────────────────────────────────────────────────────────────────
echo
info "Total elapsed: $(( T_END - T_START ))s"

if [ $SHOW_SUMMARY -eq 0 ] || [ $SKIP_SCAN -eq 1 ]; then
  printf '%-32s %-8s %s\n' "Project" "Status" "Elapsed(s)"
  for r in "${RESULTS[@]}"; do
    IFS='|' read -r k rc el <<< "$r"
    [ "$rc" = "0" ] && st="${GREEN}OK${NC}" || st="${RED}FAIL${NC}"
    printf '%-32s %-17s %s\n' "$k" "$(echo -e $st)" "$el"
  done
  exit 0
fi

# Wait a moment for SonarQube to process the latest reports
info "Waiting 15s for SonarQube to process reports…"
sleep 15

echo
printf '%-32s | %-8s %s\n' "Project" "QG" "Rel Sec Mai HotRev | Bugs Vulns Smells Cov%"
printf '%-32s-+%-8s-%s\n'  "--------------------------------" "--------" "------------------ | --------------------------"
GLOBAL_RC=0
for entry in "${MODULES[@]}"; do
  IFS='|' read -r mtype mpath mkey <<< "$entry"
  wanted "$mtype" "$mpath" "$mkey" || continue
  json=$(curl -s -u "$SONAR_TOKEN:" \
    "$SONAR_URL/api/measures/component?component=$mkey&metricKeys=alert_status,reliability_rating,security_rating,sqale_rating,security_review_rating,bugs,vulnerabilities,code_smells,coverage")
  line=$(echo "$json" | python -c "
import json, sys
def L(v):
    try: return chr(64 + int(float(v)))
    except: return '-'
d = json.load(sys.stdin).get('component', {})
ms = {x['metric']: x.get('value', '-') for x in d.get('measures', [])}
qg = ms.get('alert_status', '-')
print(f\"{qg:<3}|{L(ms.get('reliability_rating')):>3} {L(ms.get('security_rating')):>3} {L(ms.get('sqale_rating')):>3} {L(ms.get('security_review_rating')):>5}  | {ms.get('bugs','-'):>4}  {ms.get('vulnerabilities','-'):>4} {ms.get('code_smells','-'):>6}  {ms.get('coverage','-'):>5}\")
" 2>/dev/null) || line="(no data)"
  qg_status=$(echo "$line" | awk -F'|' '{gsub(/ /,"",$1); print $1}')
  if [ "$qg_status" = "OK" ]; then icon="✅"; else icon="❌"; GLOBAL_RC=1; fi
  printf '%s %-30s | %s\n' "$icon" "$mkey" "$line"
done

echo
if [ $GLOBAL_RC -eq 0 ]; then
  ok "All Quality Gates PASS"
  echo "Dashboard: $SONAR_URL/projects?gate=OK"
else
  fail "At least one Quality Gate failed"
  echo "Dashboard: $SONAR_URL/projects"
fi
exit $GLOBAL_RC
