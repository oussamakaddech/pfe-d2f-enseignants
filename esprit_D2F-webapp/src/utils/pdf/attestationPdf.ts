import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

/** Les deux modèles d'attestation fournis par le D2F. */
export type AttestationType = 'PARTICIPATION' | 'ANIMATION';

export interface AttestationTeacher {
  nom?: string;
  prenom?: string;
  /** Département de l'enseignant (déjà libellé). */
  departement?: string;
}

/** Ligne du tableau : une formation suivie ou animée. */
export interface AttestationRow {
  titreFormation?: string;
  formateurs?: { nom?: string; prenom?: string }[];
  /** Libellé libre des formateurs, prioritaire sur {@link formateurs} (saisie manuelle). */
  formateursLibelle?: string;
  dateDebut?: string;
  chargeHoraireGlobal?: string | number;
  populationCible?: string;
  objectifs?: string;
}

export interface AttestationPdfOptions {
  type: AttestationType;
  teacher: AttestationTeacher;
  rows: AttestationRow[];
  /** Date d'émission (défaut : aujourd'hui). */
  issuedOn?: Date | string;
}

const SIGNER =
  "Je soussignée Mme. Hajer BERHOUMA, cheffe de département formation des formateurs à l'École " +
  "Supérieure Privée d'Ingénierie et de Technologie, atteste que";

const TITLES: Record<AttestationType, string> = {
  PARTICIPATION: 'Attestation de participation à des formations',
  ANIMATION: "Attestation d'animation d'une formation",
};

const CLOSING = 'Cette attestation est délivrée pour servir et valoir ce que de droit.';

/** En-têtes de tableau, conformes aux deux modèles. */
export const ATTESTATION_HEADERS: Record<AttestationType, string[]> = {
  PARTICIPATION: ['Formation', 'Formateur', 'Date'],
  ANIMATION: ['Formation', 'Formateur(s)', 'Date', "Nb. d'heures", 'Public cible', 'Objectifs'],
};

export const attestationTitle = (type: AttestationType) => TITLES[type];

/** « Nom Prénom » (nom en capitales comme dans le modèle). */
export function teacherFullName(teacher: AttestationTeacher): string {
  const nom = (teacher.nom ?? '').trim().toUpperCase();
  const prenom = (teacher.prenom ?? '').trim();
  return `${prenom} ${nom}`.trim();
}

function formateursLabel(row: AttestationRow): string {
  const libre = (row.formateursLibelle ?? '').trim();
  if (libre) return libre;
  if (row.formateurs == null || row.formateurs.length === 0) return '';
  return row.formateurs
    .map((f) => `${(f.prenom ?? '').trim()} ${(f.nom ?? '').trim().toUpperCase()}`.trim())
    .filter(Boolean)
    .join(', ');
}

function formatDate(date?: string): string {
  if (!date) return '';
  const parsed = dayjs(date);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : date;
}

function toBody(type: AttestationType, rows: AttestationRow[]): string[][] {
  return rows.map((row) =>
    type === 'ANIMATION'
      ? [
          row.titreFormation ?? '',
          formateursLabel(row),
          formatDate(row.dateDebut),
          row.chargeHoraireGlobal != null ? `${row.chargeHoraireGlobal} h` : '',
          row.populationCible ?? '',
          row.objectifs ?? '',
        ]
      : [row.titreFormation ?? '', formateursLabel(row), formatDate(row.dateDebut)],
  );
}

function buildIntro(type: AttestationType, teacher: AttestationTeacher): string {
  const dept = (teacher.departement ?? '').trim();
  const who = `${teacherFullName(teacher)}, enseignante titulaire ${
    dept ? `au sein du département ${dept} ` : ''
  }à ESPRIT,`;
  return type === 'ANIMATION'
    ? `${SIGNER} Mme. ${who} a animé la formation suivante :`
    : `${SIGNER} Mme. ${who} a suivi les formations suivantes :`;
}

/**
 * Construit le PDF de l'attestation (participation ou animation) en reprenant
 * la mise en page des modèles Word officiels : titre, paragraphe d'ouverture,
 * tableau, formule de clôture, lieu/date et zone de signature.
 */
export function buildAttestationPdf({
  type,
  teacher,
  rows,
  issuedOn,
}: AttestationPdfOptions): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 20;
  const pageW = 210;
  const contentW = pageW - margin * 2;
  let y = 28;

  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.text(attestationTitle(type), pageW / 2, y, { align: 'center' });
  y += 12;

  doc.setFont('times', 'normal');
  doc.setFontSize(11.5);
  const introLines = doc.splitTextToSize(buildIntro(type, teacher), contentW) as string[];
  doc.text(introLines, margin, y, { align: 'justify', maxWidth: contentW });
  y += introLines.length * 6 + 6;

  const head = ATTESTATION_HEADERS[type];
  const columnStyles: Record<string, { cellWidth: number }> =
    type === 'ANIMATION'
      ? {
          0: { cellWidth: 45 },
          1: { cellWidth: 32 },
          2: { cellWidth: 20 },
          3: { cellWidth: 18 },
          4: { cellWidth: 25 },
          5: { cellWidth: 30 },
        }
      : { 0: { cellWidth: 80 }, 1: { cellWidth: 62 }, 2: { cellWidth: 28 } };

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [head],
    body: toBody(type, rows),
    theme: 'grid',
    styles: {
      font: 'times',
      fontSize: 10,
      overflow: 'linebreak',
      cellPadding: 2,
      valign: 'middle',
    },
    headStyles: { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: 20, halign: 'center' },
    columnStyles,
  });

  y = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 12;
  if (y > 240) {
    doc.addPage();
    y = 30;
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(11.5);
  doc.text(CLOSING, margin, y);
  y += 16;

  const issued = issuedOn ? dayjs(issuedOn) : dayjs();
  doc.text(`Fait à Tunis, le ${issued.format('DD/MM/YYYY')}`, margin, y);
  y += 24;

  doc.text('Signature', pageW - margin, y, { align: 'right' });
  doc.setDrawColor(60, 60, 60);
  doc.line(pageW - margin - 55, y + 2, pageW - margin, y + 2);

  return doc;
}

/** Nom de fichier cohérent avec le type d'attestation et l'enseignant. */
export function attestationFileName(
  type: AttestationType,
  teacher: AttestationTeacher,
  issuedOn?: Date | string,
): string {
  const slug = [teacher.nom, teacher.prenom]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, '');
  const kind = type === 'ANIMATION' ? 'animation' : 'participation';
  const date = (issuedOn ? dayjs(issuedOn) : dayjs()).format('YYYY-MM-DD');
  return `attestation_${kind}_${slug ? `${slug}_` : ''}${date}.pdf`;
}
