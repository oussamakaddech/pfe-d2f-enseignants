-- Update ENS014 factors to match the 0.82 CRITIQUE score
-- Weights: no_training=0.30, stagnation=0.25, gap_count=0.20, feedback_decline=0.10, unmet_needs=0.15
-- Desired factors: no_training=1.0(0.30), stagnation=0.70(0.175), gap_count=0.80(0.16), feedback_decline=1.0(0.10), unmet_needs=0.52(0.078)
-- Sum contributions: 0.30+0.175+0.16+0.10+0.078 = 0.813 ≈ 0.82

UPDATE "analyse".teacher_risk_profiles
SET facteurs_risque = jsonb_build_object(
  'factors', jsonb_build_object(
    'no_training', 1.0,
    'stagnation', 0.70,
    'gap_count', 0.80,
    'feedback_decline', 1.0,
    'unmet_needs', 0.52
  ),
  'contributions', jsonb_build_object(
    'no_training', 0.30,
    'stagnation', 0.175,
    'gap_count', 0.16,
    'feedback_decline', 0.10,
    'unmet_needs', 0.078
  ),
  'weights', jsonb_build_object(
    'no_training', 0.30,
    'stagnation', 0.25,
    'gap_count', 0.20,
    'feedback_decline', 0.10,
    'unmet_needs', 0.15
  )
)
WHERE enseignant_id = 'ENS014';

-- Verify
SELECT enseignant_id, score_risque, 
  facteurs_risque->'factors'->>'no_training' as no_training,
  facteurs_risque->'factors'->>'stagnation' as stagnation,
  facteurs_risque->'factors'->>'gap_count' as gap_count,
  facteurs_risque->'factors'->>'feedback_decline' as feedback_decline,
  facteurs_risque->'factors'->>'unmet_needs' as unmet_needs
FROM "analyse".teacher_risk_profiles WHERE enseignant_id = 'ENS014';
