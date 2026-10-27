/**
 * Helpers purs de l'écran « Modifier une formation » (étape Acteurs).
 *
 * - saisie d'un ou plusieurs e-mails pour ajouter des animateurs / participants ;
 * - fusion sans doublon avec la sélection courante (multi-sélection correcte) ;
 * - report des animateurs de la formation sur chaque séance (le back ne propage
 *   que vers les séances SANS animateur explicite, et cet écran est le seul
 *   endroit où l'équipe pédagogique est modifiée : sans ce report, un animateur
 *   ajouté ne verrait pas la formation dans « Mes formations à animer »,
 *   résolu par seance_animateur).
 */
import type { EditPerson } from './useFormationWorkflowEdit';

export type ActorEmailResolution = {
  /** Personnes trouvées et pas encore sélectionnées. */
  toAdd: EditPerson[];
  /** Adresses valides déjà dans la sélection. */
  already: string[];
  /** Adresses valides mais absentes de l'annuaire chargé. */
  unknown: string[];
  /** Saisies qui ne ressemblent pas à une adresse e-mail. */
  invalid: string[];
};

const EMAIL_SEPARATORS = /[\s,;]+/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Message de confirmation après enregistrement, selon le choix d'e-mail de
 * l'écran de modification (interrupteur « E-mail aux animateurs et participants »).
 */
export function saveSuccessMessage(notifierActeurs: boolean): string {
  return notifierActeurs
    ? 'Formation mise à jour ! Un e-mail a été envoyé aux animateurs et participants.'
    : 'Formation mise à jour ! Aucun e-mail envoyé aux animateurs et participants.';
}

/** Découpe une saisie libre (virgules, points-virgules, espaces) en adresses normalisées. */
export function parseEmails(raw: unknown): string[] {
  const out: string[] = [];
  for (const part of String(raw ?? '').split(EMAIL_SEPARATORS)) {
    const value = part.trim().toLowerCase();
    if (value && !out.includes(value)) out.push(value);
  }
  return out;
}

export function isEmailAddress(value: string): boolean {
  return EMAIL_PATTERN.test(String(value ?? '').trim());
}

/** E-mail d'une personne, quel que soit le nom du champ renvoyé par l'API. */
export function personMail(person: Record<string, unknown> | null | undefined): string {
  if (!person) return '';
  const mail = person.mail ?? person.email ?? person.emailAddress ?? '';
  return String(mail).trim().toLowerCase();
}

/** Index e-mail → personne ; la première occurrence gagne (enseignant avant compte). */
export function buildMailIndex(pool: EditPerson[]): Map<string, EditPerson> {
  const index = new Map<string, EditPerson>();
  for (const person of pool) {
    if (!person || person.id == null) continue;
    const mail = personMail(person as unknown as Record<string, unknown>);
    if (mail && !index.has(mail)) index.set(mail, person);
  }
  return index;
}

/** Résout une saisie d'e-mails contre un annuaire, sans jamais dupliquer la sélection. */
export function resolveActorsByEmails(
  raw: unknown,
  pool: EditPerson[],
  selected: EditPerson[],
): ActorEmailResolution {
  const candidates = parseEmails(raw);
  const index = buildMailIndex(pool);
  const selectedIds = new Set(selected.map((p) => String(p.id)));
  const selectedMails = new Set(
    selected.map((p) => personMail(p as unknown as Record<string, unknown>)).filter(Boolean),
  );
  const toAdd: EditPerson[] = [];
  const already: string[] = [];
  const unknown: string[] = [];
  const invalid: string[] = [];

  for (const email of candidates) {
    if (!isEmailAddress(email)) {
      invalid.push(email);
      continue;
    }
    const match = index.get(email);
    if (!match) {
      unknown.push(email);
      continue;
    }
    const key = String(match.id);
    // Une même personne peut exister sous deux identifiants (compte auth /
    // fiche enseignant) : l'e-mail déjà présent dans la sélection suffit à
    // considérer qu'elle y est, sinon on créerait un doublon visuel.
    if (
      selectedIds.has(key) ||
      selectedMails.has(email) ||
      toAdd.some((p) => String(p.id) === key)
    ) {
      already.push(email);
      continue;
    }
    toAdd.push(match);
  }

  return { toAdd, already, unknown, invalid };
}

/**
 * Options d'une liste à choix multiple : base (filtrée) + personnes déjà
 * sélectionnées, sans doublon d'identifiant. Une personne sélectionnée doit
 * rester dans les options même si les filtres (UP / département / recherche)
 * la masquent, sinon antd affiche son identifiant brut au lieu de son nom.
 */
export function mergeOptionById(base: EditPerson[], selected: EditPerson[]): EditPerson[] {
  const seen = new Set<string>();
  const merged: EditPerson[] = [];
  for (const item of [...base, ...selected]) {
    if (item?.id == null) continue;
    const key = String(item.id);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

/**
 * Sélection issue d'une liste à choix multiple : on repart des options affichées
 * (qui contiennent déjà les personnes sélectionnées) pour retrouver les objets
 * complets, dans l'ordre de la liste. Sans cela, une personne sortie du filtre
 * courant disparaîtrait de la sélection à chaque changement.
 */
export function selectedFromOptions<T extends { id?: unknown }>(
  options: T[],
  ids: (string | number)[],
): T[] {
  const wanted = new Set(ids.map(String));
  return options.filter((option) => option.id != null && wanted.has(String(option.id)));
}

/** Ajoute les personnes manquantes à la fin de la sélection (ordre conservé). */
export function mergeActors(selected: EditPerson[], toAdd: EditPerson[]): EditPerson[] {
  if (toAdd.length === 0) return selected;
  const seen = new Set(selected.map((p) => String(p.id)));
  const extra: EditPerson[] = [];
  for (const person of toAdd) {
    if (person.id == null) continue;
    const key = String(person.id);
    if (seen.has(key)) continue;
    seen.add(key);
    extra.push(person);
  }
  return extra.length > 0 ? [...selected, ...extra] : selected;
}

/** « Prénom Nom » (repli e-mail puis id) pour les messages de confirmation. */
export function actorLabel(person: EditPerson): string {
  const name = [person.prenom, person.nom]
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  if (name) return name;
  const mail = personMail(person as unknown as Record<string, unknown>);
  return mail || String(person.id ?? '');
}

/** Concatène des listes d'identifiants en supprimant vides et doublons (ordre conservé). */
export function uniqueIds(values: unknown[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const id = String(value ?? '').trim();
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

/**
 * Identifiants d'animateurs à envoyer pour une séance : ceux déjà présents,
 * privés des animateurs retirés au niveau formation, enrichis des animateurs
 * ajoutés au niveau formation.
 */
export function synchronizeSeanceAnimateurs(
  seanceAnimateurs: { id?: unknown }[] | undefined | null,
  initialAnimIds: string[],
  currentAnimSel: EditPerson[],
  resolveId: (person: EditPerson) => unknown,
): string[] {
  const initialKeys = new Set(initialAnimIds.map(String));
  const currentKeys = new Set(currentAnimSel.map((p) => String(p.id)));
  const removed = new Set(initialAnimIds.filter((id) => !currentKeys.has(String(id))));
  const added = currentAnimSel.filter((p) => !initialKeys.has(String(p.id)));

  const kept = (seanceAnimateurs ?? [])
    .map((a) => a?.id)
    .filter((id) => id != null && !removed.has(String(id)));

  return uniqueIds([...kept, ...added.map((p) => resolveId(p))]);
}
