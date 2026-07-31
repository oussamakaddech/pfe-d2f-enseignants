from app.core.db import get_db
from sqlalchemy import text
db = next(get_db())
db.execute(text('DELETE FROM "analyse".teacher_knowledge_assignments'))
db.execute(text('DELETE FROM "analyse".teacher_competency_assignments'))
db.execute(text('DELETE FROM "analyse".knowledge'))
db.commit()
db.execute(text("""
INSERT INTO "analyse".knowledge (knowledge_code, knowledge_name, knowledge_type, competency_id, competency_code, competency_name, difficulty_level, actif, created_at)
SELECT s.code, s.nom,
  CASE WHEN s.type = 'PRATIQUE' THEN 'PRACTICAL' WHEN s.type = 'THEORIQUE' THEN 'THEORETICAL' ELSE 'PRACTICAL' END,
  c.id, c.code, c.nom,
  CASE s.niveau WHEN 'N1_DEBUTANT' THEN 1 WHEN 'N2_ELEMENTAIRE' THEN 2 WHEN 'N3_INTERMEDIAIRE' THEN 3 WHEN 'N4_AVANCE' THEN 4 WHEN 'N5_EXPERT' THEN 5 ELSE 3 END,
  TRUE, NOW()
FROM "competence".savoirs s JOIN "competence".sous_competences sc ON sc.id = s.sous_competence_id JOIN "competence".competences c ON c.id = sc.competence_id
"""))
db.commit()
db.execute(text("""
INSERT INTO "analyse".teacher_knowledge_assignments (teacher_id, knowledge_id, knowledge_code, knowledge_name, competency_id, competency_code, competency_name, assignment_status, assignment_source, assigned_at, validated_at, active, data_quality_status, created_at)
SELECT ec.enseignant_id, k.id, k.knowledge_code, k.knowledge_name, k.competency_id, k.competency_code, k.competency_name,
  CASE WHEN ec.niveau IN ('N4_AVANCE', 'N5_EXPERT') THEN 'VALIDATED' ELSE 'ASSIGNED' END,
  'SEED_IMPORT', COALESCE(ec.created_at, NOW()),
  CASE WHEN ec.niveau IN ('N4_AVANCE', 'N5_EXPERT') THEN NOW() ELSE NULL END,
  TRUE, 'COMPLETE', NOW()
FROM "competence".enseignant_competences ec JOIN "competence".savoirs s ON s.id = ec.savoir_id JOIN "analyse".knowledge k ON k.knowledge_code = s.code
"""))
db.commit()
db.execute(text("""
INSERT INTO "analyse".teacher_competency_assignments (teacher_id, competency_id, competency_code, competency_name, assignment_status, assignment_source, assigned_at, active, created_at)
SELECT DISTINCT ON (ec.enseignant_id, c.id) ec.enseignant_id, c.id, c.code, c.nom, 'VALIDATED', 'SEED_IMPORT', MIN(ec.created_at), TRUE, NOW()
FROM "competence".enseignant_competences ec JOIN "competence".savoirs s ON s.id = ec.savoir_id JOIN "competence".sous_competences sc ON sc.id = s.sous_competence_id JOIN "competence".competences c ON c.id = sc.competence_id
GROUP BY ec.enseignant_id, c.id, c.code, c.nom
"""))
db.commit()
print("Seeded:", db.execute(text('SELECT count(*) FROM "analyse".knowledge')).scalar(), "knowledge,",
      db.execute(text('SELECT count(*) FROM "analyse".teacher_knowledge_assignments')).scalar(), "tka")
db.close()
