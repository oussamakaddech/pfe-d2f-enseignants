# How to Access PostgreSQL Database

## Finding Database Connection Information

Based on the application configuration, the database connection information can be found in the `esprit_D2F-formation/src/main/resources/application.properties` file:

```
# Datasource
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:7432/d2f}
spring.datasource.username=${DB_USER:d2f}
spring.datasource.password=${DB_PASSWORD:d2fpasswd}
```

The database name is "d2f" and runs on port 7432.

## Methods to Access PostgreSQL

### Method 1: Using psql command line tool
1. Open a command prompt or terminal
2. Navigate to your PostgreSQL installation bin directory (if in PATH) or use full path
3. Run: `psql -U d2f`
4. Enter password when prompted

### Method 2: Using a database management tool
You can use tools like:
- pgAdmin (GUI tool)
- DBeaver (universal database tool)
- Any SQL IDE that supports PostgreSQL

### Database Connection Details
- Host: localhost:7432
- Database: d2f
- Username: d2f
- Password: d2fpasswd

## Fixing the Missing Column Issue

To fix the issue with the missing `last_refresh_date` column:

1. Connect to your PostgreSQL database using one of the methods above
2. Execute the following SQL command:
   ```sql
   ALTER TABLE formations ADD COLUMN IF NOT EXISTS last_refresh_date TIMESTAMP WITH TIME ZONE;
   ```

## Alternative: Direct psql connection
If you have psql available, you can connect directly:

```bash
psql -h localhost -p 7432 -U d2f d2f
```

Then execute:
```sql
ALTER TABLE formations ADD COLUMN IF NOT EXISTS last_refresh_date TIMESTAMP WITH TIME ZONE;
```

## Restart the Application
After making the database changes, restart the formation service to see if the error is resolved.