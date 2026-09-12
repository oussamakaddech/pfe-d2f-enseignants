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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
  const emailMatch = text.match(/<([^<>]*)>/);
  const email = (emailMatch?.[1] || '').trim();
  const phoneMatch = text.match(/\(t[eé]l\s*:\s*([^()]*)\)/i);
  const telephone = normalizePhone(phoneMatch?.[1] || '');
  const namePart = text
    .replace(/<[^<>]*>/, '')
    .replace(/\([^()]*\)/, '')
    .trim()
    .replace(/\s+/g, ' ');
  const [nom = '', ...rest] = namePart.split(' ');
  return { nom, prenom: rest.join(' '), email, telephone };
}

/** Découpe un texte `publicCible` en participants (lignes non vides). */
export function parseParticipantsText(text: string | null | undefined): Participant[] {
  return String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseParticipantLine);
}

/** Clé de déduplication : email en minuscules, sinon ligne complète. */
export function participantKey(p: Participant): string {
  const email = p.email.trim().toLowerCase();
  if (email) return `mail:${email}`;
  return `line:${participantFullName(p).toLowerCase()}|${normalizePhone(p.telephone)}`;
}
