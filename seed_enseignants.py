import psycopg2

conn = psycopg2.connect(dbname='d2f', user='d2f', password='d2fpasswd', host='localhost', port='7432')
cur = conn.cursor()

# 1. Insert UPs (Unités Pédagogiques)
ups = [
    (1, 'Informatique'),
    (2, 'Génie Logiciel'),
    (3, 'Réseaux & Télécoms'),
]
for uid, lib in ups:
    cur.execute("INSERT INTO ups (id, libelle) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING", (uid, lib))

# 2. Insert Départements
depts = [
    (1, 'Département Informatique'),
    (2, 'Département Génie Logiciel'),
    (3, 'Département Réseaux'),
]
for did, lib in depts:
    cur.execute("INSERT INTO departements (id, libelle) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING", (did, lib))

# 3. Insert Enseignants
enseignants = [
    ('E001', 'Ben Ali',    'Mohamed',   'mohamed.benali@esprit.tn',    'P', 'A', 'O', 'N', 1, 1),
    ('E002', 'Trabelsi',   'Fatma',     'fatma.trabelsi@esprit.tn',    'P', 'A', 'O', 'N', 1, 1),
    ('E003', 'Hammami',    'Ahmed',     'ahmed.hammami@esprit.tn',     'P', 'A', 'O', 'N', 1, 1),
    ('E004', 'Bouazizi',   'Sarra',     'sarra.bouazizi@esprit.tn',    'V', 'A', 'N', 'N', 2, 2),
    ('E005', 'Mejri',      'Karim',     'karim.mejri@esprit.tn',       'P', 'A', 'O', 'N', 2, 2),
    ('E006', 'Gharbi',     'Ines',      'ines.gharbi@esprit.tn',       'V', 'A', 'N', 'N', 1, 1),
    ('E007', 'Chaabane',   'Youssef',   'youssef.chaabane@esprit.tn',  'P', 'A', 'O', 'O', 3, 3),
    ('E008', 'Mansouri',   'Amira',     'amira.mansouri@esprit.tn',    'P', 'A', 'O', 'N', 2, 2),
    ('E009', 'Jebali',     'Nabil',     'nabil.jebali@esprit.tn',      'V', 'A', 'N', 'N', 3, 3),
    ('E010', 'Khelifi',    'Rim',       'rim.khelifi@esprit.tn',       'P', 'A', 'O', 'N', 1, 1),
]

for eid, nom, prenom, mail, typ, etat, cup, chef, up_id, dept_id in enseignants:
    cur.execute("""
        INSERT INTO enseignants (id, nom, prenom, mail, type, etat, cup, chefdepartement, up_id, dept_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
    """, (eid, nom, prenom, mail, typ, etat, cup, chef, up_id, dept_id))

conn.commit()

# Verify
cur.execute("SELECT id, nom, prenom, mail FROM enseignants ORDER BY id")
rows = cur.fetchall()
print(f"\n{len(rows)} enseignants insérés:")
for r in rows:
    print(f"  {r[0]} | {r[1]} {r[2]} | {r[3]}")

cur.execute("SELECT id, libelle FROM ups ORDER BY id")
print("\nUPs:", cur.fetchall())
cur.execute("SELECT id, libelle FROM departements ORDER BY id")
print("Départements:", cur.fetchall())

conn.close()
print("\nDone!")
