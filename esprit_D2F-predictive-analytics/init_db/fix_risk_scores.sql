UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.7500, niveau_risque = 'ELEVE' WHERE enseignant_id = 'ENS022';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.6200, niveau_risque = 'ELEVE' WHERE enseignant_id = 'ENS003';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.5500, niveau_risque = 'ELEVE' WHERE enseignant_id = 'ENS017';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.8200, niveau_risque = 'CRITIQUE' WHERE enseignant_id = 'ENS014';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.5300, niveau_risque = 'ELEVE' WHERE enseignant_id = 'ENS016';

SELECT enseignant_id, score_risque, niveau_risque, tendance FROM "analyse".teacher_risk_profiles WHERE score_risque >= 0.5 ORDER BY score_risque DESC;
