/* ─────────────────────────────────────────────────────────────────────────
 * participantsExcel — Conversion pure des lignes d'une feuille Excel
 * (déjà lues via `XLSX.utils.sheet_to_json(ws, { header: 1 })`) en lignes
 * participants canoniques `Nom Prénom <email> (tél: phone)`.
 *
 * Format attendu :
 *   - avec en-tête reconnue (nom/prénom/email/téléphone…) : colonnes
 *     mappées par libellé (insensible à la casse) ;
 *   - sans en-tête : positions fixes Nom | Prénom | Email | Tél.
 * ─────────────────────────────────────────────────────────────────────── */

import {
  formatParticipantLine,
  isValidEmail,
  isValidPhone,
  normalizePhone,
  participantKey,
} from './participants';

/** Libellés d'en-tête reconnus (comparés en minuscules, sans espaces). */
const HEADER_WORDS = new Set([
  'nom',
  'name',
  'prénom',
  'prenom',
  'first name',
  'firstname',
  'email',
  'mail',
  'téléphone',
  'telephone',
  'tél',
  'tel',
  'phone',
  'portable',
  'gsm',
  'numéro',
  'numero',
  'contact',
]);

export interface ParticipantsSheetResult {
  /** Lignes canoniques prêtes à rejoindre `publicCible`. */
  readonly lines: string[];
  /** Lignes ignorées (email ou téléphone mal formé). */
  readonly skipped: number;
}

/** Résidu laissé par un `<input type="file">` dont le `change` a bubblé. */
const FAKEPATH_RE = /^C:\\fakepath\\/i;

/**
 * Fusionne les lignes existantes + les lignes importées.
 * Nettoie au passage les résidus `C:\fakepath\…` (un `change` d'input file
 * ayant bubblé jusqu'au `Form.Item` écrase le champ avec le nom du fichier).
 */
export function mergeParticipantLines(
  current: string | null | undefined,
  newLines: readonly string[],
): string {
  const kept = String(current || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '' && !FAKEPATH_RE.test(l));
  return [...kept, ...newLines].filter(Boolean).join('\n');
}

/**
 * Convertit les lignes brutes d'une feuille Excel en lignes participants.
 * Pure (sans I/O ni UI) — testable avec un vrai buffer .xlsx.
 */
export function participantsFromSheetRows(
  rows: unknown[][],
  existingKeys: ReadonlySet<string> = new Set(),
): ParticipantsSheetResult {
  const firstCells = (Array.isArray(rows[0]) ? rows[0] : []).map((cell) =>
    String(cell || '')
      .trim()
      .toLowerCase(),
  );
  const hasHeader = firstCells.some((c) => HEADER_WORDS.has(c));
  const header = hasHeader ? firstCells : [];
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const findCol = (words: string[]): number =>
    hasHeader ? header.findIndex((h: string) => words.includes(h)) : -1;
  const idxNom = findCol(['nom', 'name']);
  const idxPrenom = findCol(['prénom', 'prenom', 'first name', 'firstname']);
  const idxEmail = findCol(['email', 'mail']);
  const idxTel = findCol([
    'téléphone',
    'telephone',
    'tél',
    'tel',
    'phone',
    'portable',
    'gsm',
    'numéro',
    'numero',
    'contact',
  ]);

  const seen = new Set(existingKeys);
  const lines: string[] = [];
  let skipped = 0;
  dataRows.forEach((row) => {
    if (!Array.isArray(row)) return;
    const cell = (i: number): string => (i >= 0 ? String(row[i] || '').trim() : '');
    const nom = hasHeader ? cell(idxNom) : cell(0);
    const prenom = hasHeader ? cell(idxPrenom) : cell(1);
    const email = hasHeader ? cell(idxEmail) : cell(2);
    const rawTel = hasHeader ? cell(idxTel) : cell(3);
    const telephone = normalizePhone(rawTel);
    const fallback = String(row[0] || '').trim();
    if (!nom && !prenom && !email && !telephone) {
      if (!fallback) return;
      // Ligne libre sans colonne reconnue : conservée telle quelle
      // si elle n'existe pas déjà.
      const key = `line:${fallback.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      lines.push(fallback);
      return;
    }
    // Lignes invalides (email ou téléphone mal formés) : ignorées + comptées.
    if (!isValidEmail(email) || !isValidPhone(telephone)) {
      skipped += 1;
      return;
    }
    const line = formatParticipantLine({ nom, prenom, email, telephone });
    if (!line) return;
    const key = participantKey({ nom, prenom, email, telephone });
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(line);
  });
  return { lines, skipped };
}
