import { describe, expect, it } from 'vitest';
import { describeGapEngine, describeRiskEngine } from '@/components/analytics/engineStatus';

// Raisons réellement renvoyées par le service prédictif (relevées en direct).
const AUCUN_NIVEAU = "prédiction ML vide : aucun savoir évaluable pour l'enseignant";
const DERIVE =
  'dérive KS détectée (Holm, risque de famille 0.01) sur : days_since_last_training';
const HORS_PLAGE =
  'features invalides au serving : feature training_frequency_per_month hors plage [0.0, 0.49]';
const RISQUE_REJETE =
  'modele de risque non deploye : decision=reject (macro-F1 0.525 < 0.70)';

describe('describeGapEngine', () => {
  it("ne dit rien quand le ML a servi : le badge « ML actif » suffit", () => {
    expect(describeGapEngine('PRODUCTION_ML', null)).toBeNull();
    expect(describeGapEngine('DEMO_ML', null)).toBeNull();
  });

  it('aucun niveau saisi : modèle non applicable, pas en panne', () => {
    const note = describeGapEngine('HEURISTIC_FALLBACK', AUCUN_NIVEAU);
    expect(note).toEqual({
      label: 'Modèle ML non applicable : aucun niveau saisi',
      detail: AUCUN_NIVEAU,
      tone: 'info',
    });
  });

  it('garde-fous déclenchés : signalés comme avertissements', () => {
    expect(describeGapEngine('HEURISTIC_FALLBACK', DERIVE)?.label).toMatch(/dérive/);
    expect(describeGapEngine('HEURISTIC_FALLBACK', DERIVE)?.tone).toBe('warning');
    expect(describeGapEngine('HEURISTIC_FALLBACK', HORS_PLAGE)?.label).toMatch(
      /hors du domaine d'entraînement/,
    );
  });

  it('raison générique du service : pas présentée comme une panne', () => {
    const note = describeGapEngine(
      'HEURISTIC_FALLBACK',
      'dernier calcul hors modèle ML : moteur heuristique explicable appliqué',
    );
    expect(note?.label).toBe("Dernier calcul effectué sans le modèle ML (relancer l'analyse)");
    expect(note?.tone).toBe('info');
  });

  it('raison inconnue ou absente : « indisponible », raison brute conservée', () => {
    expect(describeGapEngine('HEURISTIC_FALLBACK', 'artefact introuvable')).toEqual({
      label: 'Modèle ML indisponible',
      detail: 'artefact introuvable',
      tone: 'warning',
    });
    expect(describeGapEngine(undefined, undefined)?.detail).toBeNull();
  });
});

describe('describeRiskEngine', () => {
  it('ne dit rien quand le modèle de risque a servi', () => {
    expect(describeRiskEngine('ML', null, 'PRODUCTION_ML')).toBeNull();
  });

  it('modèle rejeté + écarts ML : la formule porte sur les écarts prédits par le ML', () => {
    expect(describeRiskEngine('HEURISTIC', RISQUE_REJETE, 'PRODUCTION_ML')).toEqual({
      label: 'Formule pondérée sur les écarts prédits par le ML (modèle de risque non validé)',
      detail: RISQUE_REJETE,
      tone: 'info',
    });
  });

  it('modèle rejeté + écarts heuristiques : la source est dite telle quelle', () => {
    expect(describeRiskEngine('HEURISTIC', RISQUE_REJETE, 'HEURISTIC_FALLBACK')?.label).toBe(
      'Formule pondérée sur les écarts heuristiques (modèle de risque non validé)',
    );
  });

  it('formule mesurée meilleure que le ML : « validée », jamais « non validé »', () => {
    const raison =
      'formule ponderee retenue : validee en simulation (macro-F1 0.7222 >= 0.7) et meilleure que le modele ML de risque (macro-F1 0.6629) — decision=reject';
    expect(describeRiskEngine('HEURISTIC', raison, 'PRODUCTION_ML')).toEqual({
      label: 'Formule pondérée sur les écarts prédits par le ML (validée, meilleure que le modèle ML testé)',
      detail: raison,
      tone: 'info',
    });
  });

  it('raison autre qu un rejet : « indisponible », en avertissement', () => {
    const note = describeRiskEngine('HEURISTIC', 'echec du serving ML : timeout', 'PRODUCTION_ML');
    expect(note?.label).toMatch(/modèle de risque indisponible/);
    expect(note?.tone).toBe('warning');
  });
});
