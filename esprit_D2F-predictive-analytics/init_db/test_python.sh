#!/bin/sh
JWT=$(curl -s -D - "http://d2f-auth:8085/api/v1/auth/login" -X POST -d "username=admin&password=admin" 2>&1 | sed -n 's/.*d2f_auth_token=\([^;]*\).*/\1/p')

echo "=== PYTHON RISK ==="
curl -s "http://d2f-predictive-analytics:8000/api/v1/analytics/risk/ENS012" -H "Authorization: Bearer $JWT"
echo ""
echo "=== PYTHON GAPS ==="
curl -s "http://d2f-predictive-analytics:8000/api/v1/analytics/gaps/ENS012" -H "Authorization: Bearer $JWT"
echo ""
echo "=== PYTHON RECOMMENDATIONS ==="
curl -s "http://d2f-predictive-analytics:8000/api/v1/analytics/recommendations/ENS012" -H "Authorization: Bearer $JWT"
echo ""
echo "=== PYTHON RISK-HISTORY ==="
curl -s "http://d2f-predictive-analytics:8000/api/v1/analytics/enseignants/ENS012/historique-risque" -H "Authorization: Bearer $JWT"
echo ""
echo "=== PYTHON ALERTS ==="
curl -s "http://d2f-predictive-analytics:8000/api/v1/analytics/alerts?enseignant_id=ENS012" -H "Authorization: Bearer $JWT"
