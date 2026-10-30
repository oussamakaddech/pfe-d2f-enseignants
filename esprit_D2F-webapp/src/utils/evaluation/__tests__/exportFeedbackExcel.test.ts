import { describe, it, expect } from 'vitest';
import { EXPORT_HEADERS, feedbackRows } from '../exportFeedbackExcel';

describe('exportFeedbackExcel — lignes de l’export', () => {
  it('une ligne par réponse : numéro, date, « anonymous », UP, titre, niveaux en toutes lettres, Oui/Non, textes', () => {
    const rows = feedbackRows(
      [
        {
          id: 41,
          date: '2026-09-07T10:53:00',
          formationId: 7,
          up: 'Système',
          aspectOrganisationnel: 4,
          aspectTechnique: 5,
          aspectPedagogique: 1,
          besoinComplementaire: false,
          autresInformations: null,
          autresBesoins: 'Kubernetes',
        },
      ],
      (id) => (id === 7 ? 'Conteneurisation' : `Formation ${id}`),
    );

    expect(rows).toEqual([
      [
        1,
        '07/09/2026 10:53',
        'anonymous',
        'Système',
        'Conteneurisation',
        'Satisfaisant',
        'Très satisfaisant',
        'Pas du tout satisfaisant',
        'Non',
        '',
        'Kubernetes',
      ],
    ]);
    expect(rows[0]).toHaveLength(EXPORT_HEADERS.length);
  });
});
