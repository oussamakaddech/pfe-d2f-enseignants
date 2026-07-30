#!/bin/sh
# Get JWT from cookie
COOKIE=$(curl -s -D - "http://d2f-auth:8085/api/v1/auth/login" -X POST -d "username=admin&password=admin" 2>&1 | sed -n 's/.*d2f_auth_token=\([^;]*\).*/\1/p')
echo "JWT length: ${#COOKIE}"

echo "=== RISK ==="
curl -s "http://d2f-analyse:8089/api/v1/analyse-predictive/teachers/ENS012/risk" -H "Authorization: Bearer $COOKIE"
echo ""
echo "=== GAPS ==="
curl -s "http://d2f-analyse:8089/api/v1/analyse-predictive/teachers/ENS012/gaps" -H "Authorization: Bearer $COOKIE"
echo ""
echo "=== RECOMMENDATIONS ==="
curl -s "http://d2f-analyse:8089/api/v1/analyse-predictive/teachers/ENS012/recommendations" -H "Authorization: Bearer $COOKIE"
echo ""
echo "=== RISK-HISTORY ==="
curl -s "http://d2f-analyse:8089/api/v1/analyse-predictive/teachers/ENS012/risk-history" -H "Authorization: Bearer $COOKIE"
echo ""
echo "=== ALERTS ==="
curl -s "http://d2f-analyse:8089/api/v1/analyse-predictive/alerts?enseignant_id=ENS012" -H "Authorization: Bearer $COOKIE"
