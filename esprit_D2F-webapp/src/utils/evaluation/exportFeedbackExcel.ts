import dayjs from 'dayjs';
import {
  NIVEAUX_SATISFACTION,
  type FeedbackReponse,
} from '@/services/evaluation/FormationFeedbackService';

/** En-têtes de l'export (même logique que l'export Microsoft Forms, réponses anonymes). */
export const EXPORT_HEADERS = [
  'Id',
  'Date de réponse',
  'Adresse de messagerie',
  'Votre UP est',
  'Choisissez la formation',
  'Aspect organisationnel',
  'Aspect technique',
  'Aspect pédagogique',
  "Besoin d'une formation complémentaire",
  'Autres informations à signaler',
  'Autres besoins en formation',
] as const;

const niveau = (n?: number | null) => (n && n >= 1 && n <= 5 ? NIVEAUX_SATISFACTION[n - 1] : '');

/** Lignes de l'export (une par réponse), dans l'ordre des en-têtes. */
export function feedbackRows(
  reponses: FeedbackReponse[],
  titre: (formationId: number) => string,
): (string | number)[][] {
  return reponses.map((r, i) => [
    i + 1,
    r.date ? dayjs(r.date).format('DD/MM/YYYY HH:mm') : '',
    'anonymous',
    r.up ?? '',
    titre(r.formationId),
    niveau(r.aspectOrganisationnel),
    niveau(r.aspectTechnique),
    niveau(r.aspectPedagogique),
    r.besoinComplementaire == null ? '' : r.besoinComplementaire ? 'Oui' : 'Non',
    r.autresInformations ?? '',
    r.autresBesoins ?? '',
  ]);
}

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '4472C4' } },
  alignment: { vertical: 'center', wrapText: true },
  border: { bottom: { style: 'thin', color: { rgb: '8EA9DB' } } },
};
const BAND_STYLE = { fill: { fgColor: { rgb: 'D9E1F2' } } };
const WIDTHS = [6, 18, 22, 16, 34, 24, 24, 24, 20, 40, 40];

/** Génère et télécharge le classeur (tableau bleu à bandes, filtres sur l'en-tête). */
export async function exportFeedbackExcel(
  reponses: FeedbackReponse[],
  titre: (formationId: number) => string,
  fileName: string,
): Promise<void> {
  const XLSX = await import('xlsx-js-style');
  const rows = feedbackRows(reponses, titre);
  const ws = XLSX.utils.aoa_to_sheet([[...EXPORT_HEADERS], ...rows]);

  EXPORT_HEADERS.forEach((_, c) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    ws[ref].s = HEADER_STYLE;
    rows.forEach((_, r) => {
      const cell = ws[XLSX.utils.encode_cell({ r: r + 1, c })];
      if (cell && r % 2 === 0) cell.s = BAND_STYLE;
    });
  });
  ws['!cols'] = WIDTHS.map((wch) => ({ wch }));
  ws['!rows'] = [{ hpt: 30 }];
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: rows.length, c: EXPORT_HEADERS.length - 1 },
    }),
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Réponses');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
