/* ─────────────────────────────────────────────────────────────────────────
 * participants — Parsing / formatage des lignes participants du besoin.
 *
 * Format canonique (une ligne par participant dans `publicCible`) :
 *   Nom Prénom <email@esprit.tn> (tél: +216 20 123 456)
 * Les parties <email> et (tél: …) sont optionnelles.
 * ─────────────────────────────────────────────────────────────────────── */

export interface Participant {
  readonly nom: string;
  readonly prenom: string;
  readonly email: string;
  readonly telephone: string;
}

/** Nom complet affiché (Nom + Prénom). */
export function participantFullName(p: Pick<Participant, 'nom' | 'prenom'>): string {
  return [p.nom, p.prenom].filter(Boolean).join(' ').trim();
}

const EMAIL_RE = /^[^\s@]+@[^.\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?\d[\d\s.\-()]{5,}$/;
/** Marqueurs du format canonique : jamais présents dans une ligne « nom » multi-lignes. */
const CANONICAL_MARKER_RE = /<[^<>]*>|\(t[eé]l\s*:/i;

/** Email syntaxiquement valide (vide = absent, donc valide). */
export function isValidEmail(email: string): boolean {
  const v = email.trim();
  return v === '' || EMAIL_RE.test(v);
}

/** Normalise un téléphone : supprime espaces, points et tirets (garde le `+`). */
export function normalizePhone(raw: string): string {
  return raw.trim().replace(/[\s.\-()]/g, '');
}

/** Un téléphone est plausible s'il contient entre 6 et 16 chiffres. */
export function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone).replace(/^\+/, '');
  return digits === '' || (/^\d+$/.test(digits) && digits.length >= 6 && digits.length <= 16);
}

/**
 * Formate un participant en ligne canonique :
 * `Nom Prénom <email> (tél: phone)`.
 */
export function formatParticipantLine(p: Participant): string {
  const name = participantFullName(p);
  const email = p.email.trim();
  const phone = normalizePhone(p.telephone);
  let line = name;
  if (email) line += (line ? ' ' : '') + `<${email}>`;
  if (phone) line += (line ? ' ' : '') + `(tél: ${phone})`;
  return line.trim();
}

/**
 * Parse une ligne `Nom Prénom <email> (tél: phone)`.
 * Le nom complet est découpé : premier mot → nom, reste → prénom.
 */
export function parseParticipantLine(line: string): Participant {
  const text = line.trim();
  const emailMatch = /<([^<>]*)>/.exec(text);
  const email = (emailMatch?.[1] || '').trim();
  const phoneMatch = /\(t[eé]l\s*:([^()]*)\)/i.exec(text);
  const telephone = normalizePhone(phoneMatch?.[1] || '');
  const namePart = text
    .replace(/<[^<>]*>/, '')
    .replace(/\([^()]*\)/, '')
    .trim()
    .replace(/\s+/g, ' ');
  const [nom = '', ...rest] = namePart.split(' ');
  return { nom, prenom: rest.join(' '), email, telephone };
}

/**
 * Un bloc = un participant + la plage de lignes brutes couverte `[start, end[`.
 * Les index portent sur `String(text).split(/\r?\n/)` (lignes vides incluses)
 * afin que l'édition/suppression remplace exactement les bonnes lignes.
 */
export interface ParticipantBlock {
  readonly participant: Participant;
  /** Index (inclus) de la première ligne brute du bloc. */
  readonly start: number;
  /** Index (exclus) de fin du bloc dans les lignes brutes. */
  readonly end: number;
}

/**
 * Découpe un texte `publicCible` en blocs participants.
 * Supporte deux formats :
 *   1) Format canonique (1 ligne) : `Nom Prénom <email> (tél: phone)`
 *   2) Format multi-lignes (nom, email, téléphone sur 3 lignes non vides
 *      consécutives — les lignes vides intercalées sont absorbées) :
 *        Nom Prénom
 *        email@esprit.tn
 *        +216 20 123 456
 *
 * Garde-fous :
 * - une ligne canonique (avec `<email>` ou `(tél: …)`) n'est JAMAIS traitée
 *   comme un « nom » multi-lignes, même suivie d'un email + téléphone ;
 * - une ligne email/téléphone seule qui duplique le champ du participant
 *   précédent OU SUIVANT (résidu d'une ancienne édition/suppression
 *   ligne-à-ligne) est absorbée dans le bloc voisin au lieu de créer
 *   un participant fantôme.
 */

function _collectUpcoming(rawLines: string[], start: number, n: number): number[] {
  const upcoming: number[] = [];
  for (let j = start; j < n && upcoming.length < 3; j++) {
    if (rawLines[j].trim() !== '') upcoming.push(j);
  }
  return upcoming;
}

function _tryMultiLineBlock(
  rawLines: string[],
  i: number,
  n: number,
): { block: ParticipantBlock; nextIndex: number } | null {
  const upcoming = _collectUpcoming(rawLines, i, n);
  if (upcoming.length < 3) return null;
  const [a, b, c] = upcoming as [number, number, number];
  const nameLine = rawLines[a].trim();
  const emailLine = rawLines[b].trim();
  const phoneLine = rawLines[c].trim();
  const isBareName =
    !EMAIL_RE.test(nameLine) && !PHONE_RE.test(nameLine) && !CANONICAL_MARKER_RE.test(nameLine);
  if (!isBareName || !EMAIL_RE.test(emailLine) || !PHONE_RE.test(phoneLine)) return null;
  const [nom = '', ...rest] = nameLine.split(/\s+/);
  return {
    block: {
      participant: { nom, prenom: rest.join(' ').trim(), email: emailLine, telephone: normalizePhone(phoneLine) },
      start: i,
      end: c + 1,
    },
    nextIndex: c + 1,
  };
}

function _isOrphanOfPrev(prev: ParticipantBlock | undefined, line: string): boolean {
  if (prev === undefined) return false;
  const prevEmail = prev.participant.email.trim().toLowerCase();
  const prevPhone = prev.participant.telephone;
  return (
    (EMAIL_RE.test(line) && prevEmail !== '' && line.toLowerCase() === prevEmail) ||
    (PHONE_RE.test(line) && prevPhone !== '' && normalizePhone(line) === prevPhone)
  );
}

function _mergeForwardOrphans(
  blocks: ParticipantBlock[],
  rawLines: string[],
): ParticipantBlock[] {
  const merged: ParticipantBlock[] = [];
  for (let k = 0; k < blocks.length; k++) {
    const current = blocks[k];
    const next = blocks[k + 1];
    if (next !== undefined && current.end === current.start + 1) {
      const raw = rawLines[current.start].trim();
      const nextEmail = next.participant.email.trim().toLowerCase();
      const nextPhone = next.participant.telephone;
      const dupEmail = EMAIL_RE.test(raw) && nextEmail !== '' && raw.toLowerCase() === nextEmail;
      const dupPhone = PHONE_RE.test(raw) && nextPhone !== '' && normalizePhone(raw) === nextPhone;
      if (dupEmail || dupPhone) {
        blocks[k + 1] = { ...next, start: current.start };
        continue;
      }
    }
    merged.push(current);
  }
  return merged;
}

export function parseParticipantBlocks(text: string | null | undefined): ParticipantBlock[] {
  const rawLines = String(text || '').split(/\r?\n/);
  const n = rawLines.length;
  const blocks: ParticipantBlock[] = [];

  let i = 0;
  while (i < n) {
    if (rawLines[i].trim() === '') { i++; continue; }

    const multi = _tryMultiLineBlock(rawLines, i, n);
    if (multi !== null) { blocks.push(multi.block); i = multi.nextIndex; continue; }

    const line = rawLines[i].trim();
    const prev = blocks.at(-1);
    if (_isOrphanOfPrev(prev, line)) {
      blocks[blocks.length - 1] = { ...prev!, end: i + 1 };
      i++;
      continue;
    }

    blocks.push({ participant: parseParticipantLine(line), start: i, end: i + 1 });
    i++;
  }

  return _mergeForwardOrphans(blocks, rawLines);
}

/**
 * Découpe un texte `publicCible` en participants.
 * Voir `parseParticipantBlocks` pour les formats supportés.
 */
export function parseParticipantsText(text: string | null | undefined): Participant[] {
  return parseParticipantBlocks(text).map((b) => b.participant);
}

/** Clé de déduplication : email en minuscules, sinon ligne complète. */
export function participantKey(p: Participant): string {
  const email = p.email.trim().toLowerCase();
  if (email) return `mail:${email}`;
  return `line:${participantFullName(p).toLowerCase()}|${normalizePhone(p.telephone)}`;
}
