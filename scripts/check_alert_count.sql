SELECT to_char(created_at, 'YYYY-MM') AS month, severite, COUNT(*)
FROM "analyse".alert_events
GROUP BY to_char(created_at, 'YYYY-MM'), severite
ORDER BY month, severite;
