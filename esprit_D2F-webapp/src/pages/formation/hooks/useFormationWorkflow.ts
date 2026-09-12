import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import {
  useAllFormations,
  useCreateFormation,
  useAllAccounts,
} from '@/hooks/formation/useFormations';
import { useAllUps } from '@/hooks/formation/useUpCrud';
import { useAllDepts } from '@/hooks/formation/useDeptCrud';
import { useEnseignants } from '@/hooks/enseignant/useEnseignants';
import { useReplaceAllFormationCompetences } from '@/hooks/competence/useFormationCompetence';
import { useCompetenceDomaineApi, useCompetenceApi } from '@/hooks/competence/useCompetenceService';
import { useBesoinCompetences } from '@/hooks/besoin/useBesoins';
import { isAdmin } from '@/utils/constants/roles';
import useAppNotification from '@/hooks/ui/useAppNotification';
import EnseignantService from '@/services/formation/EnseignantService';
import CompetenceService from '@/services/competence/CompetenceService';
import type { AnimateurExterne } from '@/models/bureau';
import type { ActorDraft } from '@/components/formation/AddActorModal';
import {
  filterExistingByEmails,
  getPersonEmailList,
  parseEmailsFromExcel,
} from '@/utils/formation/actorImport';
import type { EnseignantItem } from '@/pages/formation/formationWorkflowTypes';

export type PersonItem = {
  id?: unknown;
  type?: string;
  cup?: string;
  chefDepartement?: string;
  nom?: string;
  prenom?: string;
  mail?: string;
  upLibelle?: string;
  deptLibelle?: string;
  isAuthUser?: boolean;
  userName?: string;
  etat?: string;
  isManual?: boolean;
  source?: 'system' | 'manual' | 'import';
};
export type AccountItem = {
  id?: unknown;
  role?: string;
  userName?: string;
  username?: string;
  lastName?: string;
  firstName?: string;
  firsName?: string;
  emailAddress?: string;
  email?: string;
  type?: string;
  upLibelle?: string;
  deptLibelle?: string;
};
export type SeanceItem = {
  id?: unknown;
  dateSeance?: string;
  heureDebut?: unknown;
  heureFin?: unknown;
  salle?: unknown;
  animateurs?: { id?: unknown }[];
  participants?: { id?: unknown }[];
  seances?: SeanceItem[];
};
export type FormationRaw = {
  idFormation?: unknown;
  id?: unknown;
  titreFormation?: string;
  seances?: SeanceItem[];
  participants?: { id?: unknown }[];
};
export type LookupNode = { id?: unknown; libelle?: string; nom?: string };
export type NullableId = string | number | null;
export type BesoinLinkRaw = {
  _id?: string;
  domaineId?: number | null;
  competenceId?: number | null;
  competenceNom?: string;
  sousCompetenceId?: number | null;
  sousCompetenceNom?: string;
  savoirId?: number | null;
  savoirNom?: string;
};

/** Nœud de référentiel avec identifiant et libellé (compétence, savoir…). */
export type ReferentielNode = {
  id?: unknown;
  nom?: string;
  domaineId?: number | string | null;
  type?: string;
};

export interface CompetenceLinkContext {
  compCompetences: ReferentielNode[];
  savoirsByCompetence: Record<string, ReferentielNode[]>;
  sousCompetencesByCompetence: Record<string, ReferentielNode[]>;
  savoirsBySousCompetence: Record<string, ReferentielNode[]>;
}

/**
 * Construit les liens plats (1 compétence × 1 savoir) d'une ligne de
 * cartographie. Fonction pure extraite du useMemo pour limiter
 * l'imbrication (S2004) : lignes multi. Les sous-compétences/savoirs
 * cochés ne sont associés qu'aux compétences qui les possèdent ; une
 * compétence sans sous-compétence/savoir coché est émise seule.
 */
export function buildCompetenceLinks(
  row: CompetencyRow,
  ctx: CompetenceLinkContext,
): BesoinLinkRaw[] {
  const links: BesoinLinkRaw[] = [];
  const { compCompetences, sousCompetencesByCompetence } = ctx;
  row.competenceIds.filter(Boolean).forEach((cid) => {
    const comp = compCompetences.find((c) => Number(c.id) === Number(cid));
    const domainId = comp?.domaineId == null ? null : Number(comp.domaineId);
    const compName = comp?.nom || '';
    const rowScIds = row.sousCompetenceIds.filter(Boolean).map(Number);
    const compScs = sousCompetencesByCompetence[Number(cid)] || [];
    const matchedScs = rowScIds.filter((sid) => compScs.some((sc) => Number(sc.id) === sid));
    const rowSavIds = row.savoirIds.filter(Boolean).map(Number);
    const savoirScope = resolveSavoirScope(matchedScs, cid, ctx);
    const matchedSavoirs = rowSavIds.filter((sid) =>
      savoirScope.some((s) => Number(s.id) === sid),
    );
    appendCompetenceLinks(links, {
      cid, domainId, compName, compScs, matchedScs, matchedSavoirs, savoirScope, ctx,
    });
  });
  return links;
}

interface AppendLinksParams {
  cid: NullableId;
  domainId: number | null;
  compName: string;
  compScs: ReferentielNode[];
  matchedScs: number[];
  matchedSavoirs: number[];
  savoirScope: ReferentielNode[];
  ctx: CompetenceLinkContext;
}

function appendCompetenceLinks(links: BesoinLinkRaw[], p: AppendLinksParams): void {
  const { cid, domainId, compName, compScs, matchedScs, matchedSavoirs } = p;
  if (matchedSavoirs.length > 0) {
    appendSavoirLinks(links, p);
    return;
  }
  if (matchedScs.length > 0) {
    matchedScs.forEach((scId) => {
      links.push({
        _id: crypto.randomUUID(),
        domaineId: domainId,
        competenceId: Number(cid),
        competenceNom: compName,
        sousCompetenceId: scId,
        sousCompetenceNom: findSousCompetenceNom(compScs, scId),
        savoirId: null,
        savoirNom: '',
      });
    });
    return;
  }
  links.push({
    _id: crypto.randomUUID(),
    domaineId: domainId,
    competenceId: Number(cid),
    competenceNom: compName,
    sousCompetenceId: null,
    sousCompetenceNom: '',
    savoirId: null,
    savoirNom: '',
  });
}

function appendSavoirLinks(links: BesoinLinkRaw[], p: AppendLinksParams): void {
  const { cid, domainId, compName, compScs, matchedSavoirs, savoirScope, ctx } = p;
  const scToSavoirIds = buildScToSavoirIds(p.matchedScs, ctx);
  matchedSavoirs.forEach((sid) => {
    // la sous-compétence qui possède ce savoir (première trouvée)
    let ownerSc: number | null = null;
    scToSavoirIds.forEach((sids, scId) => {
      if (ownerSc == null && sids.includes(sid)) ownerSc = scId;
    });
    const sv = savoirScope.find((s) => Number(s.id) === sid);
    links.push({
      _id: crypto.randomUUID(),
      domaineId: domainId,
      competenceId: Number(cid),
      competenceNom: compName,
      sousCompetenceId: ownerSc,
      sousCompetenceNom: ownerSc == null ? '' : findSousCompetenceNom(compScs, ownerSc),
      savoirId: sid,
      savoirNom: sv?.nom || '',
    });
  });
}

/** Scope des savoirs : sous-compétences cochées, sinon savoirs directs. */
function resolveSavoirScope(
  matchedScs: number[],
  cid: NullableId,
  ctx: CompetenceLinkContext,
): ReferentielNode[] {
  if (matchedScs.length === 0) {
    return ctx.savoirsByCompetence[Number(cid)] || [];
  }
  const uniqScope = new Map<string, ReferentielNode>();
  matchedScs.forEach((scId) => {
    const scSavoirs = ctx.savoirsBySousCompetence[scId] || [];
    scSavoirs.forEach((s) => {
      if (s?.id != null) uniqScope.set(String(s.id), s);
    });
  });
  return Array.from(uniqScope.values());
}

/** Map sous-compétence → ids de ses savoirs (portée de la compétence). */
function buildScToSavoirIds(
  matchedScs: number[],
  ctx: CompetenceLinkContext,
): Map<number, number[]> {
  const scToSavoirIds = new Map<number, number[]>();
  matchedScs.forEach((scId) => {
    const scSavoirs = ctx.savoirsBySousCompetence[scId] || [];
    scToSavoirIds.set(scId, scSavoirs.map((s) => Number(s.id)).filter(Boolean));
  });
  return scToSavoirIds;
}

function findSousCompetenceNom(compScs: ReferentielNode[], scId: number): string {
  return compScs.find((sc) => Number(sc.id) === scId)?.nom || '';
}

/**
 * Ligne de la cartographie RICE : un domaine + plusieurs compétences
 * et plusieurs savoirs. Au moment de la soumission, les liens plats
 * (1 compétence × 1 savoir) sont dérivés depuis ces lignes.
 */
export type CompetencyRow = {
  _id: string;
  domaineId: NullableId | null;
  competenceIds: NullableId[];
  sousCompetenceIds: NullableId[];
  savoirIds: NullableId[];
};

function extractAngleContents(input: string): string[] {
  const results: string[] = [];
  let start = input.indexOf('<');
  while (start >= 0) {
    const end = input.indexOf('>', start);
    if (end < 0) break;
    results.push(
      input
        .slice(start + 1, end)
        .trim()
        .toLowerCase(),
    );
    start = input.indexOf('<', end);
  }
  return results;
}

function stripAngleBrackets(input: string): string {
  let result = '';
  let i = 0;
  while (i < input.length) {
    if (input[i] === '<') {
      const end = input.indexOf('>', i);
      if (end < 0) break;
      i = end + 1;
    } else {
      result += input[i];
      i += 1;
    }
  }
  return result;
}

export type BesoinInfoShape = {
  titre?: string;
  objectifFormation?: string;
  dateDebut?: string;
  dateFin?: string;
  dureeFormation?: number;
  estOuverte?: boolean;
  periodCode?: string;
  customPeriodLabel?: string;
  periodeFormation?: string;
  publicCible?: string;
  propositionAnimateur?: string;
  objectifsPedagogiques?: string;
  methodesEvaluationAcquis?: string;
  theme?: string;
  up?: unknown;
  departement?: unknown;
  idBesoinFormation?: number | string;
  typeBesoin?: string;
  priorite?: string;
};

/** Convertit des liens plats (1 compétence × 1 sous-compétence × 1 savoir) en lignes structurées. */
export function linksToCompRows(links: BesoinLinkRaw[]): CompetencyRow[] {
  const byDomaine = new Map<string, CompetencyRow>();
  links.forEach((l) => {
    const key = `d:${String(l.domaineId ?? '')}`;
    if (!byDomaine.has(key)) {
      byDomaine.set(key, {
        _id: crypto.randomUUID(),
        domaineId: l.domaineId ?? null,
        competenceIds: [],
        sousCompetenceIds: [],
        savoirIds: [],
      });
    }
    const row = byDomaine.get(key)!;
    const compId = Number(l.competenceId);
    if (l.competenceId != null && !row.competenceIds.some((c) => Number(c) === compId)) {
      row.competenceIds.push(compId);
    }
    const scId = Number(l.sousCompetenceId);
    if (l.sousCompetenceId != null && !row.sousCompetenceIds.some((sc) => Number(sc) === scId)) {
      row.sousCompetenceIds.push(scId);
    }
    const savId = Number(l.savoirId);
    if (l.savoirId != null && !row.savoirIds.some((s) => Number(s) === savId)) {
      row.savoirIds.push(savId);
    }
  });
  return Array.from(byDomaine.values());
}

export const getPersonIds = (arr: { id?: unknown }[]) =>
  (Array.isArray(arr) ? arr : []).map((a) => a?.id).filter(Boolean);

function mergeFormateursAccounts(
  accountsData: AccountItem[],
  enseignantsData: PersonItem[],
): PersonItem[] {
  // Comptes auth ANIMATEUR → on les ajoute à la liste des "formateurs"
  // (utilisée pour peupler la liste des animateurs d'une formation).
  // (Rôle FORMATEUR consolidé dans ANIMATEUR — cf. migration V19.)
  const formateurs = accountsData
    .filter((a) => {
      const role = String(a.role ?? '').toUpperCase();
      return role === 'ANIMATEUR';
    })
    .map<PersonItem>((a) => ({
      id: a.id,
      nom: a.lastName || a.userName || a.username || 'Formateur',
      prenom: a.firstName || a.firsName || '',
      mail: a.emailAddress || a.email || '',
      type: 'V',
      etat: 'A',
      cup: 'N',
      chefDepartement: 'N',
      upLibelle: '',
      deptLibelle: '',
    }));
  const fUserNames = new Set(
    formateurs.map((f) => f.userName).filter((n): n is string => Boolean(n)),
  );
  const enriched = formateurs.map((f) => {
    const prefix = f.mail ? f.mail.split('@')[0] : '';
    const match = enseignantsData.find(
      (ex) =>
        (typeof ex.id === 'string' && fUserNames.has(ex.id)) ||
        ex.mail === f.mail ||
        ex.mail?.split('@')[0] === prefix,
    );
    return match
      ? {
          ...f,
          upLibelle: match.upLibelle || '',
          deptLibelle: match.deptLibelle || '',
          type: match.type || f.type,
        }
      : f;
  });
  return enriched;
}

export function toMinutes(timeValue: unknown): number | null {
  if (!timeValue) return null;
  const parts = String(timeValue).split(':');
  if (parts.length < 2) return null;
  const h = Number.parseInt(parts[0], 10);
  const m = Number.parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function getAnimateurStableId(anim: PersonItem): unknown {
  return anim?.isAuthUser
    ? String(anim.userName || anim.nom || '')
        .substring(0, 10)
        .toUpperCase()
    : anim?.id;
}

export type FormationWorkflowFormProps = {
  initialDate?: string;
  onFormationCreated?: (f?: import('@/models/formation').Formation) => void;
  besoinInfo?: BesoinInfoShape;
};

const intersects = (left: unknown[], right: unknown[]) => left.some((id) => right.includes(id));

function sameTimeWindow(
  a: { dateSeance?: string; heureDebut?: unknown; heureFin?: unknown },
  b: { dateSeance?: string; heureDebut?: unknown; heureFin?: unknown },
) {
  if (!a?.dateSeance || !b?.dateSeance || a.dateSeance !== b.dateSeance) return false;
  const aStart = toMinutes(a.heureDebut);
  const aEnd = toMinutes(a.heureFin);
  const bStart = toMinutes(b.heureDebut);
  const bEnd = toMinutes(b.heureFin);
  if (aStart === null || aEnd === null || bStart === null || bEnd === null) return false;
  return aStart < bEnd && bStart < aEnd;
}

function normalizedSalle(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function checkExistingFormationConflicts(
  localSeance: SeanceItem,
  idx: number,
  formations: FormationRaw[],
  msgs: string[],
  participantIds: unknown[],
  animateurIds: unknown[],
) {
  if (!Array.isArray(formations)) return;
  formations.forEach((f) => {
    const existingSeances: SeanceItem[] = Array.isArray(f.seances) ? f.seances : [];
    const existingParticipants = [
      ...(Array.isArray(f.participants) ? f.participants : []),
      ...existingSeances.flatMap((s) => (Array.isArray(s.participants) ? s.participants : [])),
    ]
      .map((p) => p?.id)
      .filter(Boolean);
    existingSeances.forEach((existingSeance) => {
      if (!sameTimeWindow(localSeance, existingSeance)) return;
      const formationName = f.titreFormation || `#${f.idFormation || f.id || '?'}`;
      const localSalle = normalizedSalle(localSeance.salle);
      const existingSalle = normalizedSalle(existingSeance.salle);
      if (localSalle && existingSalle && localSalle === existingSalle)
        msgs.push(
          `Conflit salle: séance #${idx + 1} chevauche la formation ${formationName} dans la salle ${localSeance.salle}.`,
        );
      const existingAnimIds = getPersonIds(existingSeance.animateurs ?? []);
      if (
        participantIds.length > 0 &&
        existingParticipants.length > 0 &&
        intersects(participantIds, existingParticipants)
      )
        msgs.push(
          `Conflit participants: séance #${idx + 1} chevauche la formation ${formationName}.`,
        );
      if (
        animateurIds.length > 0 &&
        existingAnimIds.length > 0 &&
        intersects(animateurIds, existingAnimIds)
      )
        msgs.push(
          `Conflit animateurs: séance #${idx + 1} chevauche la formation ${formationName}.`,
        );
    });
  });
}

function checkSeancePairConflicts(
  left: SeanceItem,
  right: SeanceItem,
  i: number,
  j: number,
  participantIds: unknown[],
  animateurIds: unknown[],
  msgs: string[],
) {
  if (!sameTimeWindow(left, right)) return;
  const leftSalle = normalizedSalle(left.salle);
  const rightSalle = normalizedSalle(right.salle);
  if (leftSalle && rightSalle && leftSalle === rightSalle)
    msgs.push(
      `Conflit interne: les séances #${i + 1} et #${j + 1} utilisent la même salle au même horaire.`,
    );
  const leftPartIds = getPersonIds(left.participants ?? []);
  const rightPartIds = getPersonIds(right.participants ?? []);
  if (leftPartIds.length > 0 && rightPartIds.length > 0 && intersects(leftPartIds, rightPartIds))
    msgs.push(
      `Conflit interne: les séances #${i + 1} et #${j + 1} se chevauchent pour les mêmes participants.`,
    );
  const leftAnimIds = getPersonIds(left.animateurs ?? []);
  const rightAnimIds = getPersonIds(right.animateurs ?? []);
  if (leftAnimIds.length > 0 && rightAnimIds.length > 0 && intersects(leftAnimIds, rightAnimIds))
    msgs.push(
      `Conflit interne: les séances #${i + 1} et #${j + 1} se chevauchent pour les mêmes animateurs.`,
    );
}

function buildConflictMessages({
  localSeances,
  participantIds,
  animateurIds,
  existingFormations,
}: {
  localSeances: SeanceItem[];
  participantIds: unknown[];
  animateurIds: unknown[];
  existingFormations: FormationRaw[];
}) {
  const msgs: string[] = [];
  localSeances.forEach((s, idx) => {
    const start = toMinutes(s.heureDebut);
    const end = toMinutes(s.heureFin);
    if (start !== null && end !== null && start >= end)
      msgs.push(`Séance #${idx + 1}: heure de fin doit être après l&apos;heure de début.`);
  });
  localSeances.forEach((seanceI, i) => {
    localSeances.forEach((seanceJ, j) => {
      if (j > i)
        checkSeancePairConflicts(seanceI, seanceJ, i, j, participantIds, animateurIds, msgs);
    });
  });
  localSeances.forEach((localSeance, idx) =>
    checkExistingFormationConflicts(
      localSeance,
      idx,
      existingFormations,
      msgs,
      participantIds,
      animateurIds,
    ),
  );
  return [...new Set(msgs)];
}

function getEnseignantLabel(
  opt: {
    type?: string;
    cup?: string;
    chefDepartement?: string;
    nom?: string;
    prenom?: string;
    mail?: string;
  } | null,
) {
  if (!opt) return '';
  const roles = [];
  if (opt.type === 'P') roles.push('Perm.');
  if (opt.type === 'V') roles.push('Vac.');
  if (opt.cup === 'O' || opt.cup === 'Y' || opt.cup === '1') roles.push('CUP');
  if (opt.chefDepartement === 'O' || opt.chefDepartement === 'Y' || opt.chefDepartement === '1')
    roles.push('ChefDep');
  const roleStr = roles.length > 0 ? ` [${roles.join(', ')}]` : '';
  return `${opt.nom} ${opt.prenom} (${opt.mail})${roleStr}`;
}

function getAnimateurLabel(
  opt: { type?: string; cup?: string; nom?: string; prenom?: string; mail?: string } | null,
) {
  if (!opt) return '';
  let type = '';
  if (opt.type === 'P') type = ' · Perm.';
  else if (opt.type === 'V') type = ' · Vac.';
  const cup = opt.cup === 'O' || opt.cup === 'Y' || opt.cup === '1' ? ' · CUP' : '';
  return `${opt.nom} ${opt.prenom} (${opt.mail})${type}${cup}`;
}

function extractErrorMsg(err: unknown): string {
  const e = err as {
    response?: {
      data?:
        | { error?: string; message?: string; defaultMessage?: string }[]
        | { error?: string; message?: string };
    };
    message?: string;
  };
  const backendErrors = e.response?.data;
  if (Array.isArray(backendErrors))
    return backendErrors
      .map((r) => r.defaultMessage || r.message || 'Erreur de validation')
      .join(' | ');
  if (backendErrors && !Array.isArray(backendErrors)) {
    if (backendErrors.error && backendErrors.message)
      return `${backendErrors.error} : ${backendErrors.message}`;
    if (backendErrors.error) return backendErrors.error;
    if (backendErrors.message) return backendErrors.message;
  }
  return e.message || 'Échec de la création de la formation.';
}

/**
 * Creates (or retrieves) the enseignant record in the formation service for an
 * auth-user animateur. Returns the real enseignant ID to be used in animateursIds.
 * On 409 (duplicate email), finds the existing enseignant by mail and returns their ID.
 */
export async function createOrFindEnseignant(anim: PersonItem): Promise<string | null> {
  if (!anim.isAuthUser) return null;
  try {
    const created = await EnseignantService.createEnseignant({
      id: getAnimateurStableId(anim),
      nom: anim.nom,
      prenom: anim.prenom,
      mail: anim.mail,
      type: anim.type,
      etat: anim.etat,
      cup: anim.cup,
      chefDepartement: anim.chefDepartement,
    });
    return (created as { id?: string })?.id ?? (getAnimateurStableId(anim) as string);
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 409) {
      try {
        const all = await EnseignantService.getAllEnseignants();
        const existing = all.find(
          (e) =>
            (e.email ?? (e as Record<string, unknown>).mail ?? '').toString().toLowerCase() ===
            anim.mail!.toLowerCase(),
        );
        if (existing?.id) return String(existing.id);
      } catch {
        // fallback: use stable ID (may not resolve, but won't block the form)
      }
      return getAnimateurStableId(anim) as string;
    }
    throw err;
  }
}

function importSuccessMsg(total: number, found: number, added: number, entity: string): string {
  const s = (n: number) => (n > 1 ? 's' : '');
  return `${total} ${entity}${s(total)} importé${s(total)} (${found} trouvé${s(found)}, ${added} ajouté${s(added)} manuellement).`;
}

function warnExcelEmpty(rows: number, headers: string[], warn: (msg: string) => void): void {
  if (rows === 0) {
    warn('Fichier Excel vide ou mal formaté.');
  } else {
    warn(`Colonne Email introuvable. Colonnes trouvées : ${headers.join(', ') || '(aucune)'}`);
  }
}

export function useFormationWorkflow({
  initialDate,
  onFormationCreated,
  besoinInfo,
}: FormationWorkflowFormProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const { message } = useAppNotification();
  const isAdminUser = isAdmin(auth?.user?.role);
  const [activeStep, setActiveStep] = useState(0);

  const { data: upsData } = useAllUps();
  const { data: deptsData } = useAllDepts();
  const { data: enseignantsData } = useEnseignants();
  const { data: formationsData } = useAllFormations();
  const { data: accountsData } = useAllAccounts();
  const { data: besoinCompetencesData } = useBesoinCompetences(
    activeStep === 3 ? besoinInfo?.idBesoinFormation : undefined,
  );
  const { mutateAsync: createFormation } = useCreateFormation();
  const { mutateAsync: replaceCompetences } = useReplaceAllFormationCompetences();
  const domaineApi = useCompetenceDomaineApi();
  const competenceApi = useCompetenceApi();

  const [titre, setTitre] = useState(besoinInfo?.titre || besoinInfo?.objectifFormation || '');
  const [dateDebut, setDateDebut] = useState(
    besoinInfo?.dateDebut || (initialDate ? format(new Date(initialDate), 'yyyy-MM-dd') : ''),
  );
  const [dateFin, setDateFin] = useState(
    besoinInfo?.dateFin || (initialDate ? format(new Date(initialDate), 'yyyy-MM-dd') : ''),
  );
  const [typeFormation, setTypeFormation] = useState('INTERNE');
  const [etatFormation, setEtatFormation] = useState('ENREGISTRE');
  const [cout, setCout] = useState(0);
  const [organisme, setOrganisme] = useState('');
  const [chargeH, setChargeH] = useState(besoinInfo?.dureeFormation || 40);
  const [ouverte, setOuverte] = useState(besoinInfo?.estOuverte || false);
  const [periodCode, setPeriodCode] = useState(besoinInfo?.periodCode || 'OTHER');
  const [customPeriodLabel, setCustomPeriodLabel] = useState(
    besoinInfo?.customPeriodLabel || besoinInfo?.periodeFormation || '',
  );

  const [formNom, setFormNom] = useState('');
  const [formPrenom, setFormPrenom] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [salle, setSalle] = useState('');
  const [bureauNom, setBureauNom] = useState('');
  const [bureauMail, setBureauMail] = useState('');
  const [bureauTelephone, setBureauTelephone] = useState('');
  const [externeBureauId, setExterneBureauId] = useState<number | null>(null);
  const [animExterneSel, setAnimExterneSel] = useState<AnimateurExterne[]>([]);

  const [ups, setUps] = useState<LookupNode[]>([]);
  const [depts, setDepts] = useState<LookupNode[]>([]);
  const [selectedUp, setSelectedUp] = useState<LookupNode | null>(null);
  const [selectedDept, setSelectedDept] = useState<LookupNode | null>(null);

  const [enseignants, setEnseignants] = useState<PersonItem[]>([]);
  const [existingFormations, setExistingFormations] = useState<unknown[]>([]);
  const [formateursList, setFormateursList] = useState<PersonItem[]>([]);

  const [animSel, setAnimSel] = useState<PersonItem[]>([]);
  const [animFilterUp, setAnimFilterUp] = useState<LookupNode | null>(null);
  const [animFilterDept, setAnimFilterDept] = useState<LookupNode | null>(null);

  const [partSel, setPartSel] = useState<PersonItem[]>([]);
  const [partFilterUp, setPartFilterUp] = useState<LookupNode | null>(null);
  const [partFilterDept, setPartFilterDept] = useState<LookupNode | null>(null);

  const [manualAnimateurs, setManualAnimateurs] = useState<PersonItem[]>([]);
  const [manualParticipants, setManualParticipants] = useState<PersonItem[]>([]);
  const [importedAnimateurEmails, setImportedAnimateurEmails] = useState<string[]>([]);
  const [importedParticipantEmails, setImportedParticipantEmails] = useState<string[]>([]);

  const [overlapWarnings, setOverlapWarnings] = useState<unknown[]>([]);
  const [domaine, setDomaine] = useState(besoinInfo?.theme || '');
  const [populationCible, setPopulationCible] = useState(besoinInfo?.publicCible || '');
  const [objectifs, setObjectifs] = useState(besoinInfo?.objectifFormation || '');
  const [objectifsPedago, setObjectifsPedago] = useState(besoinInfo?.objectifsPedagogiques || '');
  const [evalMethods, setEvalMethods] = useState(besoinInfo?.methodesEvaluationAcquis || '');

  const [coutTransport, setCoutTransport] = useState(0);
  const [coutHebergement, setCoutHebergement] = useState(0);
  const [coutRepas, setCoutRepas] = useState(0);

  const [compDomaines, setCompDomaines] = useState<{ id?: NullableId; nom?: string }[]>([]);
  const [compCompetences, setCompCompetences] = useState<
    { id?: NullableId; nom?: string; domaineId?: NullableId }[]
  >([]);
  const [compRows, setCompRows] = useState<CompetencyRow[]>([]);
  const [savoirsByCompetence, setSavoirsByCompetence] = useState<
    Record<number, { id?: unknown; nom?: string; type?: string }[]>
  >({});
  const [sousCompetencesByCompetence, setSousCompetencesByCompetence] = useState<
    Record<number, { id?: unknown; nom?: string; code?: string }[]>
  >({});
  const [savoirsBySousCompetence, setSavoirsBySousCompetence] = useState<
    Record<number, { id?: unknown; nom?: string; type?: string }[]>
  >({});
  const [compSearch, setCompSearch] = useState('');

  const [seances, setSeances] = useState([
    {
      id: Date.now(),
      dateSeance: dateDebut || format(new Date(), 'yyyy-MM-dd'),
      heureDebut: '08:00:00',
      heureFin: '10:00:00',
      salle: '',
      onlineMeetingUrl: '',
      typeSeance: 'THEORIQUE',
      contenus: '',
      methodes: '',
      dureeTheorique: 0,
      dureePratique: 0,
      animateurs: [] as EnseignantItem[],
      expanded: true,
    },
  ]);

  const [showUpload, setShowUpload] = useState(false);
  type FormationId = number | string | null;
  const [newFormationId, setNewFormationId] = useState<FormationId>(null);

  const enseignantsList = useMemo(
    () => (Array.isArray(enseignants) ? enseignants : []) as PersonItem[],
    [enseignants],
  );

  const optionsAnim = [...formateursList, ...manualAnimateurs].filter(
    (x) =>
      (!animFilterUp || x.upLibelle === animFilterUp.libelle) &&
      (!animFilterDept || x.deptLibelle === animFilterDept.libelle),
  );

  // Emails already covered by the animateurs pool → exclude from participants
  const animateurMailSet = new Set(
    optionsAnim.map((a) => (a.mail || '').toLowerCase()).filter(Boolean),
  );

  // Participants = formation-service enseignants + auth accounts (ENSEIGNANT + ANIMATEUR)
  // not already present in the animateurs section
  const enseignantMails = new Set(
    enseignantsList.map((e) => (e.mail || '').toLowerCase()).filter(Boolean),
  );
  const accountsFallbackForParticipants = Array.isArray(accountsData)
    ? (accountsData as AccountItem[])
        .filter((a) => {
          const role = (a.role || '').toUpperCase();
          return role === 'ENSEIGNANT' || role === 'ANIMATEUR';
        })
        .filter((a) => {
          const mail = (a.emailAddress || a.email || '').toLowerCase();
          // Exclude if already in formation-service enseignants list or in animateurs pool
          return mail && !enseignantMails.has(mail) && !animateurMailSet.has(mail);
        })
        .map(
          (a) =>
            ({
              id: a.id,
              isAuthUser: true,
              userName: a.userName || a.username,
              nom: a.lastName || a.userName || a.username || 'Compte',
              prenom: a.firstName || a.firsName || '',
              mail: a.emailAddress || a.email || '',
              type: (a.role || '').toUpperCase() === 'ENSEIGNANT' ? 'P' : 'V',
              etat: 'A',
              cup: 'N',
              chefDepartement: 'N',
              upLibelle: '',
              deptLibelle: '',
            }) as PersonItem,
        )
    : [];

  const optionsPart = [
    ...enseignantsList,
    ...accountsFallbackForParticipants,
    ...manualParticipants,
  ].filter(
    (x) =>
      (!partFilterUp || x.upLibelle === partFilterUp.libelle) &&
      (!partFilterDept || x.deptLibelle === partFilterDept.libelle),
  );

  useEffect(() => {
    if (besoinInfo?.publicCible && enseignantsList.length > 0 && partSel.length === 0) {
      const emails = extractAngleContents(besoinInfo.publicCible);
      if (emails.length > 0) {
        const matched = enseignantsList.filter(
          (e) => e.mail && emails.includes(e.mail.toLowerCase()),
        );
        if (matched.length > 0) setPartSel(matched);
      }
    }
  }, [besoinInfo, enseignantsList, partSel.length]);

  useEffect(() => {
    if (!besoinInfo?.propositionAnimateur || formateursList.length === 0 || animSel.length > 0)
      return;
    const text = besoinInfo.propositionAnimateur.trim();
    const angleContents = extractAngleContents(text);
    const emailMatch = angleContents[0] ?? null;
    let matched: PersonItem | undefined = undefined;
    if (emailMatch) {
      const email = emailMatch.trim().toLowerCase();
      matched = formateursList.find((f) => f.mail?.toLowerCase() === email);
    }
    if (!matched) {
      const norm = stripAngleBrackets(text).toLowerCase().trim();
      matched = formateursList.find((f) => {
        const full = `${f.nom} ${f.prenom}`.toLowerCase();
        const fullR = `${f.prenom} ${f.nom}`.toLowerCase();
        return full === norm || fullR === norm || norm.includes(full) || norm.includes(fullR);
      });
    }
    if (matched) setAnimSel([matched]);
  }, [formateursList, besoinInfo, animSel.length]);

  useEffect(() => {
    const u = (upsData ?? []) as LookupNode[];
    const d = (deptsData ?? []) as LookupNode[];
    const e = (enseignantsData ?? []) as PersonItem[];
    const formations = (formationsData ?? []) as FormationRaw[];
    setUps(u);
    setDepts(d);
    setEnseignants(e);
    if (besoinInfo) {
      if (besoinInfo.up) {
        const foundUp = u.find((up: LookupNode) => String(up.id) === String(besoinInfo.up));
        if (foundUp) setSelectedUp(foundUp);
      }
      if (besoinInfo.departement) {
        const foundDept = d.find(
          (dept: LookupNode) => String(dept.id) === String(besoinInfo.departement),
        );
        if (foundDept) setSelectedDept(foundDept);
      }
    }
    setExistingFormations(formations);
    setFormateursList(mergeFormateursAccounts((accountsData ?? []) as AccountItem[], e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upsData, deptsData, enseignantsData, formationsData, accountsData]);

  useEffect(() => {
    if (activeStep === 3 && compDomaines.length === 0) {
      Promise.all([domaineApi.getAll(), competenceApi.getAll()])
        .then(([domainesData, competencesData]) => {
          const domaines = Array.isArray(domainesData) ? domainesData : [];
          const competences = Array.isArray(competencesData) ? competencesData : [];
          setCompDomaines(domaines);
          setCompCompetences(competences);
          if (besoinCompetencesData && compRows.length === 0) {
            const links = Array.isArray(besoinCompetencesData) ? besoinCompetencesData : [];
            if (links.length > 0) setCompRows(linksToCompRows(links));
          }
        })
        .catch(() => message.error('Impossible de charger le référentiel de compétences'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  useEffect(() => {
    const localAnimIds = animSel.map(getAnimateurStableId).filter(Boolean);
    const localParticipantIds = partSel.map((p) => p.id).filter(Boolean);
    setOverlapWarnings(
      buildConflictMessages({
        localSeances: seances,
        participantIds: localParticipantIds,
        animateurIds: localAnimIds,
        existingFormations: (Array.isArray(existingFormations)
          ? existingFormations
          : []) as FormationRaw[],
      }),
    );
  }, [seances, partSel, animSel, existingFormations]);

  const validateStep0 = () => {
    if (!titre || titre.trim().length < 5) {
      message.error('Le titre doit contenir au moins 5 caractères');
      return false;
    }
    if (!typeFormation) {
      message.error('Sélectionnez un type de formation');
      return false;
    }
    if (dateDebut && dateFin && dateDebut > dateFin) {
      message.error('La date de fin doit être postérieure à la date de début');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (seances.length === 0) {
      message.error('Ajoutez au moins une séance avant de continuer');
      return false;
    }
    const missDate = seances.findIndex((s) => !s.dateSeance);
    if (missDate !== -1) {
      message.error(`La séance #${missDate + 1} n'a pas de date`);
      return false;
    }
    const badTime = seances.findIndex((s) => {
      const sd = toMinutes(s.heureDebut);
      const ed = toMinutes(s.heureFin);
      return sd !== null && ed !== null && sd >= ed;
    });
    if (badTime !== -1) {
      message.error(`La séance #${badTime + 1} : l'heure de fin doit être après l'heure de début`);
      return false;
    }
    const totalMin = seances.reduce((acc, s) => {
      const start = toMinutes(s.heureDebut) ?? 0;
      const end = toMinutes(s.heureFin) ?? 0;
      return acc + Math.max(0, end - start);
    }, 0);
    if (totalMin > 0) setChargeH(Math.round((totalMin / 60) * 10) / 10);
    return true;
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateStep0()) return;
    if (activeStep === 2 && !validateStep2()) return;
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const addSeance = () =>
    setSeances([
      ...seances,
      {
        id: Date.now(),
        dateSeance: dateDebut,
        heureDebut: '08:00:00',
        heureFin: '10:00:00',
        salle: '',
        onlineMeetingUrl: '',
        typeSeance: 'THEORIQUE',
        contenus: '',
        methodes: '',
        dureeTheorique: 0,
        dureePratique: 0,
        animateurs: [] as EnseignantItem[],
        expanded: true,
      },
    ]);
  const updateSeance = (i: number, f: string, v: unknown) => {
    const a = [...seances];
    a[i] = { ...a[i], [f]: v };
    setSeances(a);
  };
  const removeSeance = (i: number) => setSeances(seances.filter((_, idx) => idx !== i));
  const toggleSeance = (i: number) => updateSeance(i, 'expanded', !seances[i].expanded);

  // ── Cartographie RICE : lignes Domaine → Compétence(s) → Savoir(s) ──
  const updateCompRow = (idx: number, patch: Partial<CompetencyRow>) =>
    setCompRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const addCompRow = () =>
    setCompRows((prev) => [
      ...prev,
      {
        _id: crypto.randomUUID(),
        domaineId: null,
        competenceIds: [],
        sousCompetenceIds: [],
        savoirIds: [],
      },
    ]);

  const removeCompRow = (idx: number) => setCompRows((prev) => prev.filter((_, i) => i !== idx));

  const handleRowDomaineChange = (idx: number, val: number | string | null | undefined) =>
    updateCompRow(idx, {
      domaineId: val ?? null,
      competenceIds: [],
      sousCompetenceIds: [],
      savoirIds: [],
    });

  /** Chargement cache : sous-compétences d'une compétence. */
  const loadSousCompetencesForCompetence = useCallback(
    async (competenceId: NullableId) => {
      if (competenceId == null) return;
      const cid = Number(competenceId);
      if (sousCompetencesByCompetence[cid]) return;
      const sc = await CompetenceService.sousCompetence.getByCompetence(cid);
      setSousCompetencesByCompetence((prev) => ({
        ...prev,
        [cid]: Array.isArray(sc) ? sc : [],
      }));
    },
    [sousCompetencesByCompetence],
  );

  /** Chargement cache : savoirs d'une sous-compétence. */
  const loadSavoirsForSousCompetence = useCallback(
    async (sousCompetenceId: NullableId) => {
      if (sousCompetenceId == null) return;
      const sid = Number(sousCompetenceId);
      if (savoirsBySousCompetence[sid]) return;
      const sv = await CompetenceService.savoir.getBySousCompetence(sid);
      setSavoirsBySousCompetence((prev) => ({ ...prev, [sid]: Array.isArray(sv) ? sv : [] }));
    },
    [savoirsBySousCompetence],
  );

  /** Charge les savoirs d'une compétence en cache (déclenché au besoin). */
  const loadSavoirsForCompetence = useCallback(
    async (competenceId: NullableId) => {
      if (competenceId == null) return;
      const cid = Number(competenceId);
      if (savoirsByCompetence[cid]) return;
      const sv = await CompetenceService.savoir.getByCompetence(cid);
      setSavoirsByCompetence((prev) => ({ ...prev, [cid]: Array.isArray(sv) ? sv : [] }));
    },
    [savoirsByCompetence],
  );

  // Charge sous-compétences + savoirs de toutes les compétences des lignes
  // (y compris pré-remplies) et savoirs des sous-compétences cochées.
  useEffect(() => {
    const compIds = compRows.flatMap((r) => r.competenceIds).filter(Boolean);
    compIds.forEach((cid) => {
      void loadSousCompetencesForCompetence(cid).catch(() => {});
      void loadSavoirsForCompetence(cid).catch(() => {});
    });
    compRows
      .flatMap((r) => r.sousCompetenceIds)
      .filter(Boolean)
      .forEach((sid) => void loadSavoirsForSousCompetence(sid).catch(() => {}));
  }, [
    compRows,
    loadSousCompetencesForCompetence,
    loadSavoirsForCompetence,
    loadSavoirsForSousCompetence,
  ]);

  const handleRowCompetencesChange = (idx: number, vals: NullableId[]) => {
    updateCompRow(idx, {
      competenceIds: vals.filter(Boolean),
      sousCompetenceIds: [],
      savoirIds: [],
    });
    vals.filter(Boolean).forEach((cid) => {
      void loadSousCompetencesForCompetence(cid).catch(() => {});
      void loadSavoirsForCompetence(cid).catch(() => {});
    });
  };

  const handleRowSousCompetencesChange = (idx: number, vals: NullableId[]) => {
    updateCompRow(idx, { sousCompetenceIds: vals.filter(Boolean), savoirIds: [] });
    vals.filter(Boolean).forEach((sid) => void loadSavoirsForSousCompetence(sid).catch(() => {}));
  };

  const handleRowSavoirsChange = (idx: number, vals: NullableId[]) =>
    updateCompRow(idx, { savoirIds: vals.filter(Boolean) });

  /** Union (dédupliquée) des sous-compétences de toutes les compétences d'une ligne. */
  const getRowSousCompetenceOptions = (row: CompetencyRow) => {
    const unique = new Map<string | number, { id?: unknown; nom?: string; code?: string }>();
    row.competenceIds.filter(Boolean).forEach((cid) => {
      (sousCompetencesByCompetence[Number(cid)] || []).forEach((sc) => {
        if (sc?.id != null) unique.set(String(sc.id), sc);
      });
    });
    return Array.from(unique.values());
  };

  /**
   * Union des savoirs d'une ligne.
   * Si des sous-compétences sont cochées → savoirs de ces sous-compétences ;
   * sinon → savoirs des compétences cochées.
   */
  const getRowSavoirOptions = (row: CompetencyRow) => {
    const unique = new Map<string | number, { id?: unknown; nom?: string; type?: string }>();
    const scIds = row.sousCompetenceIds.filter(Boolean);
    if (scIds.length > 0) {
      scIds.forEach((sid) => {
        (savoirsBySousCompetence[Number(sid)] || []).forEach((s) => {
          if (s?.id != null) unique.set(String(s.id), s);
        });
      });
    } else {
      row.competenceIds.filter(Boolean).forEach((cid) => {
        (savoirsByCompetence[Number(cid)] || []).forEach((s) => {
          if (s?.id != null) unique.set(String(s.id), s);
        });
      });
    }
    return Array.from(unique.values());
  };

  /**
   * Liens plats (1 compétence × 1 sous-compétence × 1 savoir) dérivés des
   * lignes multi. Les sous-compétences/savoirs cochés ne sont associés qu'aux
   * compétences qui les possèdent ; une compétence sans sous-compétence/savoir
   * coché est émise seule.
   */
  const selectedCompLinks = useMemo<BesoinLinkRaw[]>(() => {
    const ctx: CompetenceLinkContext = {
      compCompetences,
      savoirsByCompetence,
      sousCompetencesByCompetence,
      savoirsBySousCompetence,
    };
    const links: BesoinLinkRaw[] = [];
    compRows.forEach((row) => {
      links.push(...buildCompetenceLinks(row, ctx));
    });
    return links;
  }, [
    compRows,
    compCompetences,
    savoirsByCompetence,
    sousCompetencesByCompetence,
    savoirsBySousCompetence,
  ]);

  const getCompetenceOptions = (domaineId: number | string | null | undefined) => {
    const kw = compSearch.trim().toLowerCase();
    return compCompetences
      .filter(
        (c) =>
          (!domaineId || c.domaineId === domaineId) && (!kw || c.nom?.toLowerCase().includes(kw)),
      )
      .map((c) => ({ value: c.id, label: c.nom }));
  };

  const handleExcelImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { emails, rows, headers } = await parseEmailsFromExcel(file);
      if (emails.length === 0) {
        warnExcelEmpty(rows, headers, message.warning);
        e.target.value = '';
        return;
      }
      const { matched, missing } = filterExistingByEmails(
        [...enseignantsList, ...manualParticipants],
        emails,
      );
      const newManual = missing
        .filter((m) => !manualParticipants.some((p) => (p.mail || '').toLowerCase() === m))
        .map((m) => ({
          id: `manual-part-${m}`,
          mail: m,
          isManual: true,
          source: 'import' as const,
          etat: 'A',
        }));
      setManualParticipants((prev) => [...prev, ...newManual]);
      setImportedParticipantEmails((prev) => [...new Set([...prev, ...emails])]);
      setPartSel([
        ...partSel.filter((p) => !missing.includes((p.mail || '').toLowerCase())),
        ...matched,
        ...newManual,
      ]);
      if (matched.length > 0 || newManual.length > 0) {
        message.success(
          importSuccessMsg(
            matched.length + newManual.length,
            matched.length,
            newManual.length,
            'participant',
          ),
        );
      } else {
        message.warning('Aucun participant correspondant trouvé.');
      }
    } catch {
      message.error('Échec de la lecture du fichier Excel.');
    } finally {
      e.target.value = '';
    }
  };

  const handleExcelImportAnimateurFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { emails, rows, headers } = await parseEmailsFromExcel(file);
      if (emails.length === 0) {
        warnExcelEmpty(rows, headers, message.warning);
        e.target.value = '';
        return;
      }
      const { matched, missing } = filterExistingByEmails(
        [...formateursList, ...manualAnimateurs],
        emails,
      );
      const newManual = missing
        .filter((m) => !manualAnimateurs.some((p) => (p.mail || '').toLowerCase() === m))
        .map((m) => ({
          id: `manual-anim-${m}`,
          mail: m,
          type: 'V',
          cup: 'N',
          chefDepartement: 'N',
          etat: 'A',
          isManual: true,
          source: 'import' as const,
        }));
      setManualAnimateurs((prev) => [...prev, ...newManual]);
      setImportedAnimateurEmails((prev) => [...new Set([...prev, ...emails])]);
      setAnimSel([
        ...animSel.filter((p) => !missing.includes((p.mail || '').toLowerCase())),
        ...matched,
        ...newManual,
      ]);
      if (matched.length > 0 || newManual.length > 0) {
        message.success(
          importSuccessMsg(
            matched.length + newManual.length,
            matched.length,
            newManual.length,
            'animateur',
          ),
        );
      } else {
        message.warning('Aucun animateur correspondant trouvé.');
      }
    } catch {
      message.error('Échec de la lecture du fichier Excel.');
    } finally {
      e.target.value = '';
    }
  };

  const addManualAnimateur = (draft: ActorDraft) => {
    const id = `manual-anim-${draft.email}`;
    const exists = [...animSel, ...manualAnimateurs].some(
      (p) => (p.mail || '').toLowerCase() === draft.email.toLowerCase(),
    );
    if (exists) {
      message.warning('Cet animateur est déjà dans la sélection.');
      return;
    }
    const person: PersonItem = {
      id,
      nom: draft.nom,
      prenom: draft.prenom,
      mail: draft.email,
      type: draft.type,
      cup: draft.cup,
      chefDepartement: draft.chefDepartement,
      upLibelle: draft.upLibelle || '',
      deptLibelle: draft.deptLibelle || '',
      isManual: true,
      source: 'manual',
      etat: 'A',
    };
    setManualAnimateurs((prev) => [...prev, person]);
    setAnimSel((prev) => [...prev, person]);
    message.success(`Animateur ${draft.prenom} ${draft.nom} ajouté.`);
  };

  const addManualParticipant = (draft: ActorDraft) => {
    const id = `manual-part-${draft.email}`;
    const exists = [...partSel, ...manualParticipants].some(
      (p) => (p.mail || '').toLowerCase() === draft.email.toLowerCase(),
    );
    if (exists) {
      message.warning('Ce participant est déjà dans la sélection.');
      return;
    }
    const person: PersonItem = {
      id,
      nom: draft.nom,
      prenom: draft.prenom,
      mail: draft.email,
      type: draft.type,
      cup: draft.cup,
      chefDepartement: draft.chefDepartement,
      upLibelle: draft.upLibelle || '',
      deptLibelle: draft.deptLibelle || '',
      isManual: true,
      source: 'manual',
      etat: 'A',
    };
    setManualParticipants((prev) => [...prev, person]);
    setPartSel((prev) => [...prev, person]);
    message.success(`Participant ${draft.prenom} ${draft.nom} ajouté.`);
  };

  const selectAllVisibleAnim = () => {
    const currentIds = new Set(animSel.map((a) => String(a.id ?? a.mail)));
    const merged = [...animSel];
    optionsAnim.forEach((a) => {
      const key = String(a.id ?? a.mail);
      if (!currentIds.has(key)) merged.push(a);
    });
    setAnimSel(merged);
    message.success(`${merged.length} animateur(s) au total.`);
  };

  const selectAllVisiblePart = () => {
    const currentIds = new Set(partSel.map((p) => String(p.id ?? p.mail)));
    const merged = [...partSel];
    optionsPart.forEach((p) => {
      const key = String(p.id ?? p.mail);
      if (!currentIds.has(key)) merged.push(p);
    });
    setPartSel(merged);
    message.success(`${merged.length} participant(s) au total.`);
  };

  const clearAnimSel = () => setAnimSel([]);
  const clearPartSel = () => setPartSel([]);

  const exportPersonsToExcel = async (
    sel: PersonItem[],
    all: PersonItem[],
    sheetName: string,
    title: string,
    filename: string,
  ) => {
    try {
      const { writeExcel, exportDateLabel, isoDate } = await import('utils/helpers/excelExport');
      const source = sel.length > 0 ? sel : all;
      if (source.length === 0) {
        message.warning('Aucune donnée à exporter.');
        return;
      }
      const rows = source.map((p) => {
        let pType = p.type || '';
        if (p.type === 'P') pType = 'Permanent';
        else if (p.type === 'V') pType = 'Vacataire';
        return {
          Nom: p.nom || '',
          Prénom: p.prenom || '',
          Email: p.mail || '',
          Type: pType,
          UP: p.upLibelle || '',
          Département: p.deptLibelle || '',
        };
      });
      writeExcel(
        [{ name: sheetName, rows, title, subtitle: exportDateLabel() }],
        `${filename}_${isoDate()}.xlsx`,
      );
    } catch {
      message.error("Erreur lors de l'export Excel.");
    }
  };

  const exportAnimateursExcel = () =>
    exportPersonsToExcel(
      animSel,
      optionsAnim,
      'Animateurs',
      'Liste des Animateurs — Esprit',
      'animateurs',
    );

  const exportParticipantsExcel = () =>
    exportPersonsToExcel(
      partSel,
      optionsPart,
      'Participants',
      'Liste des Participants — Esprit',
      'participants',
    );

  const validateSeancesForSubmit = () => {
    const valid = seances.every((seance, i) => {
      if (!seance.dateSeance || seance.dateSeance.trim() === '') {
        message.warning(`Séance #${i + 1}: veuillez remplir la date.`);
        return false;
      }
      if (!seance.heureDebut || seance.heureDebut.trim() === '') {
        message.warning(`Séance #${i + 1}: veuillez remplir l'heure de début.`);
        return false;
      }
      if (!seance.heureFin || seance.heureFin.trim() === '') {
        message.warning(`Séance #${i + 1}: veuillez remplir l'heure de fin.`);
        return false;
      }
      return true;
    });
    return valid;
  };

  function buildPayload(finalAnimIds: unknown[], resolvedAnimIdMap?: Map<PersonItem, unknown>) {
    return {
      idBesoinFormation: besoinInfo?.idBesoinFormation || null,
      typeBesoin: besoinInfo?.typeBesoin || null,
      titreFormation: titre,
      salle: salle || null,
      dateDebut: dateDebut || null,
      dateFin: dateFin || null,
      typeFormation,
      etatFormation,
      ouverte,
      coutFormation: cout || 0,
      externeFormateurNom: formNom,
      externeFormateurPrenom: formPrenom,
      externeFormateurEmail: formEmail || null,
      organismeRefExterne: organisme,
      bureauFormationNom: bureauNom || null,
      bureauFormationMail: bureauMail || null,
      bureauFormationTelephone: bureauTelephone || null,
      chargeHoraireGlobal: chargeH || 0,
      upId: selectedUp?.id,
      departementId: selectedDept?.id,
      animateursIds: finalAnimIds,
      participantsIds: partSel.map((p) => p.id),
      animateursExternesIds: typeFormation === 'EXTERNE' ? animExterneSel.map((a) => a.id) : [],
      domaine,
      populationCible,
      objectifs,
      objectifsPedago,
      evalMethods,
      coutTransport: coutTransport || 0,
      coutHebergement: coutHebergement || 0,
      coutRepas: coutRepas || 0,
      periodCode,
      customPeriodLabel,
      seances: seances.map((s) => ({
        dateSeance: s.dateSeance || null,
        heureDebut: s.heureDebut,
        heureFin: s.heureFin,
        salle: s.salle,
        onlineMeetingUrl: s.onlineMeetingUrl,
        typeSeance: s.typeSeance,
        contenus: s.contenus,
        methodes: s.methodes,
        dureeTheorique: s.dureeTheorique || 0,
        dureePratique: s.dureePratique || 0,
        animateursIds: (s.animateurs ?? [])
          .map((a) => {
            if (resolvedAnimIdMap?.has(a)) return resolvedAnimIdMap.get(a);
            return a.id;
          })
          .filter(Boolean)
          .map(String),
      })),
    };
  }

  const handleSubmit = async () => {
    if (seances.length === 0) {
      message.warning('Ajoutez au moins une séance.');
      return;
    }
    if (!validateSeancesForSubmit()) return;
    if (titre.trim().length < 5) {
      message.warning('Le titre doit contenir au moins 5 caractères.');
      return;
    }
    try {
      const finalAnimIds = animSel.map(getAnimateurStableId).filter(Boolean);
      const blockingConflicts = buildConflictMessages({
        localSeances: seances,
        participantIds: partSel.map((p) => p.id).filter(Boolean),
        animateurIds: finalAnimIds,
        existingFormations: [],
      });
      if (blockingConflicts.length > 0) {
        setOverlapWarnings(blockingConflicts);
        message.error('Conflits détectés: corrigez les dates/salles/personnes.');
        return;
      }

      // Persist auth-user animateurs as enseignants — createOrFindEnseignant handles 409
      // (duplicate email) by finding the existing record and returning its real ID.
      const authAnimIdMap = new Map<string, string>();
      await Promise.all(
        animSel
          .filter((a) => a.isAuthUser)
          .map(async (a) => {
            const realId = await createOrFindEnseignant(a);
            if (realId) authAnimIdMap.set(String(a.id ?? a.mail ?? ''), realId);
          }),
      );

      // Persist manually-added / imported persons so backend has a real id.
      const manualAnimsToCreate = animSel.filter(
        (a) => a.isManual && String(a.id ?? '').startsWith('manual-anim-'),
      );
      const manualPartsToCreate = partSel.filter(
        (p) => p.isManual && String(p.id ?? '').startsWith('manual-part-'),
      );
      const persistedAnimByKey = new Map<string, unknown>();
      const persistedPartByKey = new Map<string, unknown>();
      await Promise.all(
        manualAnimsToCreate.map(async (a) => {
          try {
            const res = await EnseignantService.createEnseignant({
              nom: a.nom,
              prenom: a.prenom,
              mail: a.mail,
              type: a.type || 'V',
              etat: a.etat || 'A',
              cup: a.cup || 'N',
              chefDepartement: a.chefDepartement || 'N',
            });
            persistedAnimByKey.set(String(a.id), res);
          } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 409 && a.mail) {
              try {
                const all = await EnseignantService.getAllEnseignants();
                const existing = all.find(
                  (e) =>
                    (e.email ?? (e as Record<string, unknown>).mail ?? '')
                      .toString()
                      .toLowerCase() === a.mail!.toLowerCase(),
                );
                if (existing?.id) persistedAnimByKey.set(String(a.id), existing);
              } catch {
                /* fallback: no persisted ID */
              }
            }
          }
        }),
      );
      await Promise.all(
        manualPartsToCreate.map(async (p) => {
          try {
            const res = await EnseignantService.createEnseignant({
              nom: p.nom,
              prenom: p.prenom,
              mail: p.mail,
              type: p.type || 'P',
              etat: p.etat || 'A',
              cup: p.cup || 'N',
              chefDepartement: p.chefDepartement || 'N',
            });
            persistedPartByKey.set(String(p.id), res);
          } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 409 && p.mail) {
              try {
                const all = await EnseignantService.getAllEnseignants();
                const existing = all.find(
                  (e) =>
                    (e.email ?? (e as Record<string, unknown>).mail ?? '')
                      .toString()
                      .toLowerCase() === p.mail!.toLowerCase(),
                );
                if (existing?.id) persistedPartByKey.set(String(p.id), existing);
              } catch {
                /* fallback: no persisted ID */
              }
            }
          }
        }),
      );

      // Build final anim IDs — prefer real IDs from createOrFindEnseignant over stable IDs
      const finalAnimIdsWithPersisted = animSel
        .map((a) => {
          if (a.isManual && String(a.id ?? '').startsWith('manual-anim-')) {
            const persisted = persistedAnimByKey.get(String(a.id)) as { id?: unknown } | undefined;
            return persisted?.id ?? getAnimateurStableId(a);
          }
          if (a.isAuthUser) {
            const key = String(a.id ?? a.mail ?? '');
            return authAnimIdMap.get(key) ?? getAnimateurStableId(a);
          }
          return getAnimateurStableId(a);
        })
        .filter(Boolean);

      // Build a map from animateur item → resolved DB ID for seance-level resolution
      const resolvedAnimIdMap = new Map<PersonItem, unknown>();
      animSel.forEach((a, i) => {
        resolvedAnimIdMap.set(a, finalAnimIdsWithPersisted[i]);
      });

      const finalPartIdsWithPersisted = partSel
        .map((p) => {
          if (p.isManual && String(p.id ?? '').startsWith('manual-part-')) {
            const persisted = persistedPartByKey.get(String(p.id)) as { id?: unknown } | undefined;
            return persisted?.id ?? p.id;
          }
          return p.id;
        })
        .filter(Boolean);

      const payload = buildPayload(finalAnimIdsWithPersisted, resolvedAnimIdMap);
      payload.participantsIds = finalPartIdsWithPersisted;
      const newF = await createFormation(payload);
      const fId = newF.idFormation;
      setNewFormationId(fId ?? null);
      if (selectedCompLinks.length > 0 && fId) {
        const compLinks = selectedCompLinks.filter((l) => l.competenceId).map((l) => ({ ...l }));
        await replaceCompetences({
          formationId: fId,
          newLinks: compLinks as unknown as Record<string, unknown>[],
        });
      }
      setShowUpload(true);
      message.success('Formation créée !');
      onFormationCreated?.(newF);
      setTimeout(() => navigate('/home/ListeFormation'), 2000);
    } catch (err: unknown) {
      message.error(extractErrorMsg(err));
    }
  };

  return {
    activeStep,
    setActiveStep,
    isAdminUser,
    titre,
    setTitre,
    dateDebut,
    setDateDebut,
    dateFin,
    setDateFin,
    typeFormation,
    setTypeFormation,
    etatFormation,
    setEtatFormation,
    cout,
    setCout,
    organisme,
    setOrganisme,
    chargeH,
    setChargeH,
    ouverte,
    setOuverte,
    periodCode,
    setPeriodCode,
    customPeriodLabel,
    setCustomPeriodLabel,
    formNom,
    setFormNom,
    formPrenom,
    setFormPrenom,
    formEmail,
    setFormEmail,
    salle,
    setSalle,
    bureauNom,
    setBureauNom,
    bureauMail,
    setBureauMail,
    bureauTelephone,
    setBureauTelephone,
    externeBureauId,
    setExterneBureauId,
    animExterneSel,
    setAnimExterneSel,
    ups,
    depts,
    selectedUp,
    setSelectedUp,
    selectedDept,
    setSelectedDept,
    enseignants,
    enseignantsList,
    formateursList,
    animSel,
    setAnimSel,
    animFilterUp,
    setAnimFilterUp,
    animFilterDept,
    setAnimFilterDept,
    partSel,
    setPartSel,
    partFilterUp,
    setPartFilterUp,
    partFilterDept,
    setPartFilterDept,
    optionsAnim,
    optionsPart,
    overlapWarnings,
    domaine,
    setDomaine,
    populationCible,
    setPopulationCible,
    objectifs,
    setObjectifs,
    objectifsPedago,
    setObjectifsPedago,
    evalMethods,
    setEvalMethods,
    coutTransport,
    setCoutTransport,
    coutHebergement,
    setCoutHebergement,
    coutRepas,
    setCoutRepas,
    compDomaines,
    compCompetences,
    compRows,
    setCompRows,
    savoirsByCompetence,
    sousCompetencesByCompetence,
    savoirsBySousCompetence,
    compSearch,
    setCompSearch,
    seances,
    addSeance,
    updateSeance,
    removeSeance,
    toggleSeance,
    showUpload,
    setShowUpload,
    newFormationId,
    handleNext,
    handleBack,
    handleSubmit,
    updateCompRow,
    addCompRow,
    removeCompRow,
    handleRowDomaineChange,
    handleRowCompetencesChange,
    handleRowSousCompetencesChange,
    handleRowSavoirsChange,
    getRowSousCompetenceOptions,
    getRowSavoirOptions,
    getCompetenceOptions,
    getEnseignantLabel,
    getAnimateurLabel,
    handleExcelImportFile,
    exportAnimateursExcel,
    exportParticipantsExcel,
    manualAnimateurs,
    manualParticipants,
    addManualAnimateur,
    addManualParticipant,
    handleExcelImportAnimateurFile,
    selectAllVisibleAnim,
    selectAllVisiblePart,
    clearAnimSel,
    clearPartSel,
    getAllEmailsAnimateurs: () => getPersonEmailList(animSel),
    getAllEmailsParticipants: () => getPersonEmailList(partSel),
    importedAnimateurEmails,
    importedParticipantEmails,
  };
}
