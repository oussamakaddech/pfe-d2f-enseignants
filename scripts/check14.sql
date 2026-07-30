-- V8-fix: check flyway history
SELECT installed_rank, version, description FROM formation.flyway_schema_history_formation ORDER BY installed_rank DESC LIMIT 10;
