import psycopg2

conn = psycopg2.connect(dbname='d2f', user='d2f', password='d2fpasswd', host='localhost', port='7432')
cur = conn.cursor()

# List tables
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
tables = [r[0] for r in cur.fetchall()]
print("Tables:", tables)

# Check ups, departements, enseignants
for t in ['ups', 'departements', 'enseignants']:
    if t in tables:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        print(f"\n{t}: {cur.fetchone()[0]} rows")
        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{t}' ORDER BY ordinal_position")
        cols = [r[0] for r in cur.fetchall()]
        print(f"  Columns: {cols}")
        cur.execute(f"SELECT * FROM {t} LIMIT 3")
        for r in cur.fetchall():
            print(f"  {r}")
    else:
        print(f"\n{t}: TABLE NOT FOUND")

conn.close()
