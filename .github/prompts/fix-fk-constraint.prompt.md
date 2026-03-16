---
mode: agent
description: Diagnose and fix a PostgreSQL foreign key constraint violation in the D2F database by generating a safe psycopg2 cleanup script.
---

# Fix FK Constraint Violation – D2F Database

## Context

- **Database**: `d2f` on `localhost:7432`, user `d2f`, password `d2fpasswd`
- **Stack**: Python + `psycopg2`
- **Pattern**: errors of the form `update or delete on table "<parent>" violates foreign key constraint "<fk_name>" on table "<child>"`

## Task

Given the error message below, generate a Python `psycopg2` script that:

1. **Diagnoses** the violation: counts how many rows in the child table still reference the parent row(s).
2. **Shows** the offending rows before touching anything (SELECT first, never blind DELETE).
3. **Decides** the correct fix strategy:
   - If the child rows are **orphans** (parent no longer exists) → DELETE them from the child table.
   - If the child rows are **legitimate references** → either `SET NULL` / `SET DEFAULT` on the FK column, or abort and explain why a cascade is needed.
4. **Executes** the fix inside a transaction with explicit `COMMIT` (or `ROLLBACK` on error).
5. **Reports** before/after counts.

## Error Message

Paste the full error here:

```
${input:error_message:Paste the full PostgreSQL FK constraint error message here}
```

## Output

Produce a single Python file named `clean_<child_table>_<fk_column>.py` following this structure:

```python
"""
Fixes FK violation: <parent_table> → <child_table>.<fk_column>
Error: <fk_constraint_name>
"""
import psycopg2, sys

DB = "host=localhost port=7432 dbname=d2f user=d2f password=d2fpasswd"

def main():
    conn = psycopg2.connect(DB)
    conn.autocommit = False
    cur = conn.cursor()
    try:
        # 1. Diagnose
        cur.execute("""
            SELECT COUNT(*) FROM <child_table>
            WHERE <fk_column> = <offending_id>
              -- or NOT IN (SELECT id FROM <parent_table>) for bulk cleanup
        """)
        print(f"Références trouvées : {cur.fetchone()[0]}")

        # 2. Show offending rows
        cur.execute("SELECT * FROM <child_table> WHERE <fk_column> = <offending_id> LIMIT 10")
        for row in cur.fetchall():
            print(row)

        # 3. Fix (choose one strategy)
        cur.execute("DELETE FROM <child_table> WHERE <fk_column> = <offending_id>")
        print(f"Supprimées : {cur.rowcount}")

        conn.commit()
        print("✅ Correction appliquée.")
    except Exception as e:
        conn.rollback()
        print(f"❌ Rollback — {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
```

## Rules

- **Never use `CASCADE` on a production table** without listing exactly which rows will be deleted.
- Always print row counts **before and after**.
- If the child table itself has dependents, resolve depth-first (deepest child first).
- Add a `-- DRY RUN` section (SELECT only) that the user can run first before the actual DELETE/UPDATE.
