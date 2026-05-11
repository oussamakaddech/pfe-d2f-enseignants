# Database Schema Issue Fix - Formation Service

## Problem Description

The Formation Service is failing to start with the following error:

```
Schema-validation: missing column [last_refresh_date] in table [formations]
```

This error occurs because the database schema validation is enabled (`spring.jpa.hibernate.ddl-auto=validate`) and the `formations` table is missing the `last_refresh_date` column that is expected by the `Formation` entity.

## Root Cause

The `Formation` entity in the code has a field `lastRefreshDate` that maps to a `last_refresh_date` column in the database, but this column doesn't exist in the actual database table.

## Solution

To fix this issue, you need to add the missing column to the `formations` table in the database.

### Option 1: Manual Database Fix

Execute the following SQL statement directly on your PostgreSQL database:

```sql
ALTER TABLE formations ADD COLUMN IF NOT EXISTS last_refresh_date TIMESTAMP WITH TIME ZONE;
```

If your database doesn't support the `IF NOT EXISTS` clause, use this instead:

```sql
ALTER TABLE formations ADD COLUMN last_refresh_date TIMESTAMP WITH TIME ZONE;
```

### Option 2: Ensure Flyway Migrations Run

The migration file `V12__add_last_refresh_date_to_formations.sql` already exists in the codebase with the correct SQL statement. Make sure that Flyway is properly configured and can run this migration.

Check the following in your `application.properties`:

```properties
spring.flyway.enabled=true
spring.flyway.baseline-on-migrate=true
spring.flyway.locations=classpath:db/migration
```

### Option 3: Temporary Workaround

If you need a quick temporary fix for development, you can change the JPA configuration in `application.properties`:

```properties
# Only for development - NOT recommended for production
spring.jpa.hibernate.ddl-auto=update
```

This will automatically create missing columns, but it's not recommended for production environments.

## Verification

After applying the fix, restart the Formation Service. It should now start successfully without the schema validation error.

## Additional Notes

1. Make sure to backup your database before applying any changes
2. In a production environment, always use proper migration scripts rather than auto-update
3. Ensure all services are compatible with the database schema changes