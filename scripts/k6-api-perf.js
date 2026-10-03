// Test de performance k6 — exigence DSI « temps de réponse API < 200 ms »
// Cahier des charges technique DSI 2025-2026, Partie I §2.
//
// Usage :
//   k6 run scripts/k6-api-perf.js                       // endpoints publics
//   BASE_URL=http://localhost:8009 AUTH_TOKEN=eyJ... k6 run scripts/k6-api-perf.js
//
// Le check p95 < 200 ms fait échouer le run (`k6 run --quiet` en CI).

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8009';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const THRESHOLD_MS = 200;

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    // Exigence DSI : 95 % des requêtes sous 200 ms
    http_req_duration: [`p(95)<${THRESHOLD_MS}`],
    http_req_failed: ['rate<0.01'],
  },
};

const params = {
  headers: { Accept: 'application/json' },
};
if (AUTH_TOKEN) params.headers.Authorization = `Bearer ${AUTH_TOKEN}`;

export default function () {
  const resHealth = http.get(`${BASE_URL}/actuator/health`, params);
  check(resHealth, { 'health 200': (r) => r.status === 200 });

  const resDocs = http.get(`${BASE_URL}/v3/api-docs`, params);
  check(resDocs, { 'api-docs 200': (r) => r.status === 200 });

  if (AUTH_TOKEN) {
    const resApi = http.get(`${BASE_URL}/api/v1/notifications/count`, params);
    check(resApi, { 'api authentifiée 200': (r) => r.status === 200 });
  }

  sleep(0.2);
}
