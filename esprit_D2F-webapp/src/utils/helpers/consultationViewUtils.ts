import { NIVEAU_SAVOIR_OPTIONS } from '@/utils/constants/competenceOptions';

export const ACCENT = {
  domaine: { color: '#2563eb', bg: '#eff6ff', badgeCls: 'ctp-badge--domaine' },
  competence: { color: '#16a34a', bg: '#f0fdf4', badgeCls: 'ctp-badge--competence' },
  sousComp: { color: '#d97706', bg: '#fffbeb', badgeCls: 'ctp-badge--sousc' },
  savoir: { color: '#7c3aed', bg: '#f5f3ff', badgeCls: 'ctp-badge--savoir' },
  theorique: { color: '#0d9488', bg: '#f0fdfa', badgeCls: 'ctp-badge--theorique' },
  pratique: { color: '#e11d48', bg: '#fff1f2', badgeCls: 'ctp-badge--pratique' },
  muted: { color: '#475569', bg: '#f1f5f9', badgeCls: 'ctp-badge--muted' },
};

export const COMP_PALETTE = [
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#7c3aed',
  '#0f766e',
  '#be123c',
  '#0ea5e9',
  '#9333ea',
];

export const DISPLAY_MODE_KEY = 'ctp-display-mode-v2';
export const OPEN_COMPS_KEY = 'ctp-open-comps';
export const ACTIVE_COMP_KEY = 'ctp-active-comp';

export function toNiveauRank(niveau: unknown): number {
  if (niveau == null) return 999;
  const asText = String(niveau).trim();
  const match = /(\d+)/.exec(asText);
  return match ? Number(match[1]) : 999;
}

export function formatNiveau(niveau: unknown): string {
  const hit = NIVEAU_SAVOIR_OPTIONS?.find((n) => String(n.value) === String(niveau));
  return hit?.label || (niveau ? `Niveau ${niveau}` : '-');
}

export function getNiveauStyle(niveau: unknown): { color: string; bg: string; border: string } {
  const rank = toNiveauRank(niveau);
  const map: Record<number, { color: string; bg: string; border: string }> = {
    1: { color: '#9a3412', bg: '#ffedd5', border: '#fdba74' },
    2: { color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
    3: { color: '#0f766e', bg: '#ccfbf1', border: '#5eead4' },
    4: { color: '#166534', bg: '#dcfce7', border: '#86efac' },
    5: { color: '#7c2d12', bg: '#fef3c7', border: '#fcd34d' },
  };
  return map[rank] || { color: '#334155', bg: '#e2e8f0', border: '#cbd5e1' };
}

export function getTypeLabel(type: string): string {
  if (type === 'THEORIQUE') return 'theorique';
  if (type === 'PRATIQUE') return 'pratique';
  return '-';
}

export function getTypeBadge(type: string): string {
  return type === 'THEORIQUE' ? 'theorique' : 'pratique';
}

export interface FlatSavoir {
  id?: number | string;
  code?: string;
  nom?: string;
  description?: string;
  type?: string;
  niveau?: string;
  sousCompetenceId?: number | string | null;
  sousCompetenceNom?: string | null;
  sousCompetenceCode?: string | null;
  sousCompetencePath?: string | null;
  competenceId?: string | null;
  competenceCode?: string | null;
  competenceNom?: string;
  domaineId?: number | string | null;
  domaineCode?: string | null;
  domaineNom?: string;
  isDirect?: boolean;
}

export interface SousCompInput {
  id?: unknown;
  code?: string;
  nom?: string;
  parentId?: unknown;
  competenceId?: unknown;
}

export interface SousCompInfo {
  id: string;
  code: string;
  nom: string;
  /** Chemin complet « Parent › Enfant » (nom seul pour une sous-compétence racine). */
  path: string;
  competenceId: string | null;
  depth: number;
}

/**
 * Indexe les sous-compétences par id et calcule le chemin hiérarchique.
 * Tolère une liste plate (parentId) comme une liste partiellement chargée.
 */
export function indexSousCompetences(sousComps: SousCompInput[] = []): Map<string, SousCompInfo> {
  const byId = new Map<string, SousCompInput>();
  (sousComps || []).forEach((sc) => {
    if (sc?.id != null) byId.set(String(sc.id), sc);
  });

  const info = new Map<string, SousCompInfo>();

  const resolve = (id: string, seen: Set<string>): SousCompInfo => {
    const cached = info.get(id);
    if (cached) return cached;
    const sc = byId.get(id);
    if (!sc) {
      const orphan: SousCompInfo = {
        id,
        code: '',
        nom: '',
        path: '',
        competenceId: null,
        depth: 0,
      };
      info.set(id, orphan);
      return orphan;
    }

    const nom = sc.nom || sc.code || `Sous-compétence ${id}`;
    let path = nom;
    let depth = 0;
    const parentId = sc.parentId == null ? null : String(sc.parentId);
    if (parentId && parentId !== id && byId.has(parentId) && !seen.has(parentId)) {
      const nextSeen = new Set(seen).add(id);
      const parent = resolve(parentId, nextSeen);
      if (parent.nom) {
        path = `${parent.path} › ${nom}`;
        depth = parent.depth + 1;
      }
    }

    const entry: SousCompInfo = {
      id,
      code: sc.code || '',
      nom,
      path,
      competenceId: sc.competenceId == null ? null : String(sc.competenceId),
      depth,
    };
    info.set(id, entry);
    return entry;
  };

  byId.forEach((_, id) => resolve(id, new Set()));

  return info;
}

export function buildFlatSavoirs(crud: {
  domaines?: Array<{ id?: unknown; code?: string; nom?: string }>;
  competences?: Array<{ id?: unknown; domaineId?: unknown; code?: string; nom?: string }>;
  sousComps?: SousCompInput[];
  savoirs?: Array<{
    id?: unknown;
    code?: string;
    nom?: string;
    description?: string;
    type?: string;
    niveau?: unknown;
    sousCompetenceId?: unknown;
    sousCompetenceNom?: string;
    competenceId?: unknown;
  }>;
}) {
  const domaines = crud.domaines || [];
  const competences = crud.competences || [];
  const savoirs = crud.savoirs || [];

  const domaineById = new Map(domaines.map((d) => [String(d.id), d] as const));
  const compById = new Map(competences.map((c) => [String(c.id), c] as const));
  const scIndex = indexSousCompetences(crud.sousComps);

  return savoirs.map((s) => {
    const hasSousComp = s?.sousCompetenceId != null;
    const sc = hasSousComp ? scIndex.get(String(s.sousCompetenceId)) : undefined;
    // Une sous-compétence absente de la liste chargée (pagination) ne doit PAS
    // être assimilée à un savoir direct : on se rabat sur le DTO du savoir.
    const compId = sc?.competenceId ?? (s?.competenceId == null ? null : String(s.competenceId));
    const comp = compId == null ? null : compById.get(compId);
    const domaine = comp ? domaineById.get(String(comp.domaineId)) : null;
    const sousCompNom = sc?.nom || (hasSousComp ? s.sousCompetenceNom || null : null);

    return {
      id: s.id,
      code: s.code || '-',
      nom: s.nom || '-',
      description: s.description || '',
      type: s.type || '',
      niveau: s.niveau,
      sousCompetenceId: hasSousComp ? (sc?.id ?? String(s.sousCompetenceId)) : null,
      sousCompetenceNom: sousCompNom,
      sousCompetenceCode: sc?.code || null,
      sousCompetencePath: sc?.path || sousCompNom,
      competenceId: comp?.id == null ? null : String(comp.id),
      competenceCode: comp?.code || null,
      competenceNom: comp?.nom || 'Sans competence',
      domaineId: domaine?.id ?? null,
      domaineCode: domaine?.code || null,
      domaineNom: domaine?.nom || 'Sans domaine',
      isDirect: !hasSousComp,
    };
  });
}

export const DIRECT_GROUP_KEY = 'direct';

export interface SavoirGroup {
  key: string;
  label: string;
  code: string;
  isDirect: boolean;
  savoirs: FlatSavoir[];
}

/**
 * Regroupe les savoirs par sous-compétence (les savoirs directs forment leur
 * propre groupe). Les groupes sont ordonnés : directs d'abord, puis par nom.
 */
export function groupSavoirsBySousCompetence(savoirs: FlatSavoir[] = []): SavoirGroup[] {
  const groups = new Map<string, SavoirGroup>();

  (savoirs || []).forEach((s) => {
    const key = s.sousCompetenceId == null ? DIRECT_GROUP_KEY : `sc:${s.sousCompetenceId}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label:
          key === DIRECT_GROUP_KEY
            ? 'Savoirs directs'
            : s.sousCompetencePath || s.sousCompetenceNom || 'Sous-compétence',
        code: key === DIRECT_GROUP_KEY ? '' : s.sousCompetenceCode || '',
        isDirect: key === DIRECT_GROUP_KEY,
        savoirs: [],
      };
      groups.set(key, group);
    }
    group.savoirs.push(s);
  });

  return Array.from(groups.values()).sort((a, b) => {
    if (a.isDirect !== b.isDirect) return a.isDirect ? -1 : 1;
    return a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' });
  });
}

/**
 * Compétences autorisées par les filtres UP / département (null = aucune restriction).
 *
 * Depuis la V24 le rattachement est porté par la compétence (choix multiple).
 * Une compétence sans rattachement explicite retombe sur les colonnes
 * historiques de son domaine, comme le fait le serveur.
 */
export function buildAllowedCompetenceIds(
  competences: Array<{
    id?: unknown;
    domaineId?: unknown;
    upIds?: unknown[];
    departementIds?: unknown[];
  }> = [],
  domaines: Array<{ id?: unknown; upId?: unknown; departementId?: unknown }> = [],
  upId: number | string | null = null,
  departementId: number | string | null = null,
): Set<string> | null {
  if (upId == null && departementId == null) return null;

  const norm = (value: unknown) => (value == null ? '' : String(value));
  const wantedUp = norm(upId);
  const wantedDept = norm(departementId);

  const domaineById = new Map<string, { upId?: unknown; departementId?: unknown }>();
  (domaines || []).forEach((d) => {
    if (d?.id != null) domaineById.set(norm(d.id), d);
  });

  const explicitList = (values: unknown[] | undefined) =>
    (values ?? []).map(norm).filter((v) => v !== '');

  const allowed = new Set<string>();
  (competences || []).forEach((c) => {
    if (c?.id == null) return;
    const domaine = c.domaineId == null ? undefined : domaineById.get(norm(c.domaineId));

    const upList = explicitList(c.upIds);
    const upOk =
      wantedUp === '' ||
      (upList.length > 0 ? upList.includes(wantedUp) : norm(domaine?.upId) === wantedUp);

    const deptList = explicitList(c.departementIds);
    const deptOk =
      wantedDept === '' ||
      (deptList.length > 0
        ? deptList.includes(wantedDept)
        : norm(domaine?.departementId) === wantedDept);

    if (upOk && deptOk) allowed.add(norm(c.id));
  });
  return allowed;
}

export function getFilteredCrud(
  crud: {
    domaines?: Array<{ id: unknown; domaineId?: unknown }>;
    competences?: Array<{ id: unknown; domaineId: unknown }>;
    sousComps?: Array<{ id: unknown; competenceId: unknown }>;
    savoirs?: Array<{ id: unknown; competenceId?: unknown; sousCompetenceId?: unknown }>;
  },
  domaineId: unknown,
) {
  const { domaines = [], competences = [], sousComps = [], savoirs = [] } = crud;
  if (!domaineId) return { domaines, competences, sousComps, savoirs };

  const filteredDomaines = domaines.filter((d) => String(d.id) === String(domaineId));
  const filteredComps = competences.filter((c) => String(c.domaineId) === String(domaineId));
  const compIdSet = new Set(filteredComps.map((c) => String(c.id)));
  const filteredScs = sousComps.filter((sc) => compIdSet.has(String(sc.competenceId)));
  const scIdSet = new Set(filteredScs.map((sc) => String(sc.id)));
  const directSavoirsSet = new Set(
    savoirs.filter((s) => s.competenceId != null && compIdSet.has(String(s.competenceId))),
  );
  const filteredSavoirs = savoirs.filter(
    (s) => scIdSet.has(String(s.sousCompetenceId)) || directSavoirsSet.has(s),
  );

  return {
    domaines: filteredDomaines,
    competences: filteredComps,
    sousComps: filteredScs,
    savoirs: filteredSavoirs,
  };
}

export function hasAnyActiveFilters(
  filters: { q?: string; type?: string; niveau?: string } | null,
  debouncedQ: string,
) {
  if (!filters) return false;
  const query = (debouncedQ ?? filters.q ?? '').trim();
  return query.length > 0 || filters.type !== 'ALL' || filters.niveau !== 'ALL';
}

export function buildFilterChips(
  filters: { q?: string; type?: string; niveau?: string } | null,
): Array<{ key: string; label: string; color: string }> {
  if (!filters) return [];
  const chips = [];

  if (filters.type !== 'ALL') {
    chips.push({
      key: 'type',
      label: filters.type === 'THEORIQUE' ? 'Theorique' : 'Pratique',
      color: filters.type === 'THEORIQUE' ? 'theorique' : 'pratique',
    });
  }

  if (filters.niveau !== 'ALL') {
    chips.push({ key: 'niveau', label: formatNiveau(filters.niveau), color: 'muted' });
  }

  if (filters.q?.trim()) {
    chips.push({ key: 'q', label: `"${filters.q.trim()}"`, color: 'muted' });
  }

  return chips;
}
