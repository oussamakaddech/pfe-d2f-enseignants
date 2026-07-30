#!/bin/sh
# Login and save cookies
curl -s -c /tmp/cookies.txt "http://d2f-auth:8085/api/v1/auth/login" -X POST -d "username=admin&password=admin" > /dev/null

echo "=== RISK ==="
curl -s -b /tmp/cookies.txt "http://d2f-analyse:8089/api/v1/analyse-predictive/teachers/ENS012/risk"
echo ""
echo "=== GAPS ==="
curl -s -b /tmp/cookies.txt "http://d2f-analyse:8089/api/v1/analyse-predictive/teachers/ENS012/gaps"
echo ""
echo "=== RECOMMENDATIONS ==="
curl -s -b /tmp/cookies.txt "http://d2f-analyse:8089/api/v1/analyse-predictive/teachers/ENS012/recommendations"
echo ""
echo "=== RISK-HISTORY ==="
curl -s -b /tmp/cookies.txt "http://d2f-analyse:8089/api/v1/analyse-predictive/teachers/ENS012/risk-history"
echo ""
echo "=== ALERTS ==="
curl -s -b /tmp/cookies.txt "http://d2f-analyse:8089/api/v1/analyse-predictive/alerts?enseignant_id=ENS012"
