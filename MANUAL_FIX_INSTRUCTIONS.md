# Manual Fix Instructions for Database Issue

## Problem
The Formation Service is failing to start because of a schema validation error:
```
Schema-validation: missing column [last_refresh_date] in table [formations]
```

This error occurs because the `last_refresh_date` column is missing from the `formations` table, but the `Formation` entity in the code expects this column to exist.

## Solution

### Option 1: Direct Database Fix (Recommended)

To fix this issue, you need to manually add the missing column to the database by executing the following SQL command directly on your PostgreSQL database:

```sql
ALTER TABLE formations ADD COLUMN IF NOT EXISTS last_refresh_date TIMESTAMP WITH TIME ZONE;
```

You can execute this using your database client tool (e.g., psql, pgAdmin, or any other PostgreSQL client).

### Option 2: Using Migration Files

The file `V12__add_last_refresh_date_to_formations.sql` already exists in your codebase with the correct SQL statement. Make sure this migration is executed against your database.

### Verification

After applying the fix, restart the Formation Service to verify that it starts correctly.

## Files
- `add_missing_column.sql` - Contains the SQL command to add the missing column
- `fix_database_issue.sql` - Alternative version with different syntax options