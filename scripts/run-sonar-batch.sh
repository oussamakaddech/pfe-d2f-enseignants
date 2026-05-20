#!/usr/bin/env bash
# Run sonar analysis for one module — used by batched orchestration.
# Usage: bash scripts/run-sonar-batch.sh <module> <projectKey> <type>
#   type = java | python | web
set -uo pipefail

MODULE="${1:?module}"
KEY="${2:?projectKey}"
TYPE="${3:?type java|python|web}"
SONAR_URL="${SONAR_HOST_URL:-http://localhost:9000}"
SONAR_TOKEN="${SONAR_TOKEN:?SONAR_TOKEN missing}"

cd "$(dirname "$0")/.."

echo "============================================================"
echo "[$TYPE] $MODULE -> $KEY"
echo "============================================================"

case "$TYPE" in
  java)
    if [ ! -d "$MODULE" ]; then echo "SKIP: $MODULE absent"; exit 0; fi
    cd "$MODULE"
    echo "[1/2] mvn verify (tests + JaCoCo)..."
    ./mvnw -B -q clean verify -Dmaven.test.failure.ignore=true 2>&1 | tail -5
    echo "[2/2] mvn sonar:sonar..."
    ./mvnw -B -q sonar:sonar \
      "-Dsonar.projectKey=$KEY" \
      "-Dsonar.host.url=$SONAR_URL" \
      "-Dsonar.login=$SONAR_TOKEN" \
      "-Dsonar.qualitygate.wait=false" 2>&1 | tail -5
    ;;
  web)
    cd "$MODULE"
    echo "[1/2] vitest --coverage (best-effort)..."
    npx vitest run --coverage --reporter=basic 2>&1 | tail -3 || true
    echo "[2/2] sonar-scanner..."
    sonar-scanner \
      "-Dsonar.projectKey=$KEY" \
      "-Dsonar.host.url=$SONAR_URL" \
      "-Dsonar.login=$SONAR_TOKEN" \
      "-Dsonar.qualitygate.wait=false" 2>&1 | tail -5
    ;;
  python)
    cd "$MODULE"
    PY="python"
    command -v python >/dev/null 2>&1 || PY="python3"
    echo "[1/3] pip install -r requirements.txt..."
    $PY -m pip install -q -r requirements.txt 2>&1 | tail -3 || true
    $PY -m pip install -q pytest pytest-cov 2>&1 | tail -3 || true
    echo "[2/3] pytest --cov..."
    $PY -m pytest --cov=. --cov-report=xml --junit-xml=junit-results.xml 2>&1 | tail -5 || true
    echo "[3/3] sonar-scanner..."
    sonar-scanner \
      "-Dsonar.projectKey=$KEY" \
      "-Dsonar.host.url=$SONAR_URL" \
      "-Dsonar.login=$SONAR_TOKEN" \
      "-Dsonar.qualitygate.wait=false" 2>&1 | tail -5
    ;;
  *)
    echo "Unknown type: $TYPE"; exit 1;;
esac

echo "[DONE] $MODULE"
