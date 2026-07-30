#!/bin/bash
JWT=$(curl -s -D /tmp/auth_headers.txt "http://d2f-auth:8085/api/v1/auth/login" -X POST -d "username=admin&password=admin" | grep -oP 'd2f_auth_token=\K[^;]+')
echo "JWT: ${JWT:0:40}..."

echo "=== RISK ==="
curl -s "http://d2f-analyse:8089/api/v1/analyse-predictive/teachers/ENS012/risk" \
  -H "Authorization: Bearer $JWT"

echo ""
echo "=== GAPS ==="
curl -s "http://d2f-analyse:8089/api/v1/analyse-predictive/teachers/ENS012/gaps" \
  -H "Authorization: Bearer $JWT"

echo ""
echo "=== RECOMMENDATIONS ==="
curl -s "http://d2f-analyse:8089/api/v1/analyse-predictive/teachers/ENS012/recommendations" \
  -H "Authorization: Bearer $JWT"

echo ""
echo "=== RISK-HISTORY ==="
curl -s "http://d2f-analyse:8089/api/v1/analyse-predictive/teachers/ENS012/risk-history" \
  -H "Authorization: Bearer $JWT"
