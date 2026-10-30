import * as XLSX from 'xlsx-js-style';
import { getFilteredCrud } from './consultationViewUtils';

type CellWithStyle = XLSX.CellObject & { s?: Record<string, unknown> };
type FilteredCrudParam = Parameters<typeof getFilteredCrud>[0];
type NullableId = string | number | null;

interface Domaine {
  id: string | number;
  code: string;
  nom: string;
  upId?: NullableId;
  departementId?: NullableId;
}

interface Competence {
  id: string | number;
  code: string;
  nom: string;
  domaineId: string | number;
  upIds?: NullableId[];
  departementIds?: NullableId[];
}

/** Item de référentiel UP / département (id + libellé). */
export interface ScopeLookupItem {
  id?: string | number;
  name?: string | null;
  libelle?: string | null;
}

export interface ScopeLookups {
  ups?: ScopeLookupItem[];
  depts?: ScopeLookupItem[];
}

interface SousCompetence {
  id: string | number;
  code: string;
  nom: string;
  competenceId: string | number;
  parentId?: NullableId;
}

interface Savoir {
  id: string | number;
  code: string;
  nom: string;
  type: string;
  niveau: string;
  sousCompetenceId?: NullableId;
  competenceId?: NullableId;
}

interface ReferentielCrud {
  domaines: Domaine[];
  competences: Competence[];
  sousComps: SousCompetence[];
  savoirs: Savoir[];
}

export function getExportDateSuffix(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildCSVString(
  rows: Array<Record<string, unknown>>,
  columns: Array<{ key: string; label: string }>,
): string {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const body = rows.map((row) =>
    columns.map((c) => `"${String(row[c.key] ?? '').replaceAll('"', '""')}"`).join(','),
  );
  return [header, ...body].join('\n');
}

export function downloadFile(content: BlobPart, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Helper pour créer une feuille stylisée avec en-tête en gras et bordures
const createStyledSheet = (
  data: Array<Record<string, unknown>>,
  sheetName: string,
  headerColors: { fg: string; bg: string },
) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');

  // Style pour les en-têtes
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_cell({ r: 0, c: C });
    const cell = ws[address];
    if (cell) {
      (cell as CellWithStyle).s = {
        fill: {
          fgColor: { rgb: headerColors.fg },
          bgColor: { rgb: headerColors.bg },
        },
        font: {
          bold: true,
          sz: 12,
          color: { rgb: headerColors.fg },
        },
        border: {
          top: { style: 'thin', color: { auto: 1 } },
          right: { style: 'thin', color: { auto: 1 } },
          bottom: { style: 'thin', color: { auto: 1 } },
          left: { style: 'thin', color: { auto: 1 } },
        },
      };
    }
  }

  // Style pour les données
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[address];
      if (cell) {
        (cell as CellWithStyle).s = {
          fill: {
            fgColor: { rgb: '000000' },
            bgColor: { rgb: R % 2 === 0 ? 'FFFFFF' : 'F5F7FA' },
          },
          font: {
            sz: 11,
            color: { rgb: '1A1A1A' },
          },
          border: {
            top: { style: 'thin', color: { rgb: 'D0D7DE' } },
            right: { style: 'thin', color: { rgb: 'D0D7DE' } },
            bottom: { style: 'thin', color: { rgb: 'D0D7DE' } },
            left: { style: 'thin', color: { rgb: 'D0D7DE' } },
          },
        };
      }
    }
  }

  // Ajuster la largeur des colonnes
  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...data.map((row) => String(row[key] || '').length)) + 5,
  }));
  ws['!cols'] = colWidths;

  return ws;
};

function referentielLabel(code?: string | null, nom?: string | null): string {
  return (
    [code ? `[${code}]` : '', nom ?? '']
      .filter((part) => part !== '')
      .join(' ')
      .trim() || '—'
  );
}

/** Valeur affichée quand le savoir n'est rattaché à rien. */
export const LIEN_ABSENT = '-';

export interface SavoirRattachement {
  competence: string;
  sousCompetence: string;
  parent: string;
}

/** Sous-compétence racine de la branche qui porte `sc` (garde anti-cycle). */
function racineDe(
  sc: SousCompetence,
  sousComps: SousCompetence[],
): { racine: SousCompetence | null; parentIdHorsListe: boolean } {
  let courant = sc;
  const vus = new Set<string>([String(sc.id)]);
  for (;;) {
    if (courant.parentId == null) return { racine: courant, parentIdHorsListe: false };
    const parent = sousComps.find((item) => String(item.id) === String(courant.parentId));
    if (!parent) return { racine: null, parentIdHorsListe: true };
    if (vus.has(String(parent.id))) return { racine: courant, parentIdHorsListe: false };
    vus.add(String(parent.id));
    courant = parent;
  }
}

/**
 * Rattachement d'un savoir, sans redondance :
 * - savoir porté directement par une compétence → COMPÉTENCE remplie, le reste « - » ;
 * - savoir rangé sous une sous-compétence → COMPÉTENCE « - », SOUS-COMPÉTENCE remplie,
 *   PARENT / RACINE = racine de la branche (ou « RACINE » si c'est elle la racine) ;
 * - savoir rattaché à rien → « - » partout.
 */
export function savoirRattachement(
  savoir: Savoir,
  sousComps: SousCompetence[],
  competences: Competence[],
): SavoirRattachement {
  const sc =
    savoir.sousCompetenceId == null
      ? null
      : (sousComps.find((item) => String(item.id) === String(savoir.sousCompetenceId)) ?? null);

  if (sc) {
    const { racine, parentIdHorsListe } = racineDe(sc, sousComps);
    return {
      competence: LIEN_ABSENT,
      sousCompetence: referentielLabel(sc.code, sc.nom),
      parent:
        sc.parentId == null
          ? 'RACINE'
          : racine && String(racine.id) !== String(sc.id)
            ? referentielLabel(racine.code, racine.nom)
            : parentIdHorsListe
              ? `Sous-compétence #${sc.parentId} (hors liste)`
              : 'RACINE',
    };
  }

  if (savoir.sousCompetenceId != null) {
    return {
      competence: LIEN_ABSENT,
      sousCompetence: `Sous-compétence #${savoir.sousCompetenceId} (hors liste)`,
      parent: 'RACINE',
    };
  }

  // `savoirs.competence_id` n'est pas renseigné pour un savoir rangé sous une
  // sous-compétence : ici le savoir est bien direct sur une compétence.
  const competence =
    savoir.competenceId == null
      ? null
      : (competences.find((c) => String(c.id) === String(savoir.competenceId)) ?? null);

  return {
    competence: competence
      ? referentielLabel(competence.code, competence.nom)
      : savoir.competenceId != null
        ? `Compétence #${savoir.competenceId} (hors liste)`
        : LIEN_ABSENT,
    sousCompetence: LIEN_ABSENT,
    parent: LIEN_ABSENT,
  };
}

/** Compétence porteuse d'un savoir (remontée par sa sous-compétence si besoin). */
export function competenceDuSavoir(
  savoir: Savoir,
  sousComps: SousCompetence[],
  competences: Competence[],
): Competence | null {
  const sc =
    savoir.sousCompetenceId == null
      ? null
      : (sousComps.find((item) => String(item.id) === String(savoir.sousCompetenceId)) ?? null);
  const competenceId = sc ? sc.competenceId : savoir.competenceId;
  if (competenceId == null) return null;
  return competences.find((c) => String(c.id) === String(competenceId)) ?? null;
}

function scopeLabel(items: ScopeLookupItem[], id: NullableId): string {
  const found = items.find((item) => String(item.id) === String(id));
  return found?.name ?? found?.libelle ?? String(id);
}

/**
 * UP et département d'une compétence : le rattachement explicite de la
 * compétence prime, sinon elle hérite de son domaine (comme la colonne
 * « UP / Départements » de l'écran).
 */
export function competenceScope(
  competence: Competence | null,
  domaine: Domaine | null | undefined,
  lookups?: ScopeLookups,
): { up: string; departement: string } {
  const ups = lookups?.ups ?? [];
  const depts = lookups?.depts ?? [];
  const labels = (
    ids: NullableId[] | undefined,
    items: ScopeLookupItem[],
    heritage: NullableId | undefined,
  ): string => {
    const list = (ids ?? []).filter((id) => id != null);
    if (list.length > 0) return list.map((id) => scopeLabel(items, id)).join(', ');
    return heritage != null ? scopeLabel(items, heritage) : LIEN_ABSENT;
  };

  return {
    up: labels(competence?.upIds, ups, domaine?.upId),
    departement: labels(competence?.departementIds, depts, domaine?.departementId),
  };
}

export function doExportStructureExcel(
  crud: unknown,
  domaineId?: unknown,
  lookups?: ScopeLookups,
): void {
  const f = getFilteredCrud(crud as FilteredCrudParam, domaineId) as unknown as ReferentielCrud;
  const wb = XLSX.utils.book_new();
  const sfx = domaineId ? '_domaine' : '_complet';
  const domaineDe = (competence: Competence | null) =>
    competence
      ? (f.domaines.find((d) => String(d.id) === String(competence.domaineId)) ?? null)
      : null;

  // Feuille Domaines
  XLSX.utils.book_append_sheet(
    wb,
    createStyledSheet(
      f.domaines.map((d) => ({
        CODE: d.code,
        NOM: d.nom,
        'NB COMPÉTENCES': f.competences.filter((c) => String(c.domaineId) === String(d.id)).length,
      })),
      '01-DOMAINES',
      { fg: 'FFFFFF', bg: '1E40AF' },
    ),
    '01-DOMAINES',
  );

  // Feuille Compétences
  XLSX.utils.book_append_sheet(
    wb,
    createStyledSheet(
      f.competences.map((c) => {
        const scope = competenceScope(c, domaineDe(c), lookups);
        return {
          CODE: c.code,
          NOM: c.nom,
          DOMAINE: f.domaines.find((d) => String(d.id) === String(c.domaineId))?.nom || '',
          UP: scope.up,
          DÉPARTEMENT: scope.departement,
          'NB SOUS-COMPÉTENCES': f.sousComps.filter(
            (sc) => String(sc.competenceId) === String(c.id),
          ).length,
        };
      }),
      '02-COMPÉTENCES',
      { fg: 'FFFFFF', bg: '059669' },
    ),
    '02-COMPÉTENCES',
  );

  // Feuille Sous-compétences
  XLSX.utils.book_append_sheet(
    wb,
    createStyledSheet(
      f.sousComps.map((sc) => ({
        CODE: sc.code,
        NOM: sc.nom,
        COMPÉTENCE: f.competences.find((c) => String(c.id) === String(sc.competenceId))?.nom || '',
      })),
      '03-SOUS-COMPÉTENCES',
      { fg: 'FFFFFF', bg: '7C3AED' },
    ),
    '03-SOUS-COMPÉTENCES',
  );

  // Feuille Savoirs
  XLSX.utils.book_append_sheet(
    wb,
    createStyledSheet(
      f.savoirs.map((s) => {
        const lien = savoirRattachement(s, f.sousComps, f.competences);
        const competence = competenceDuSavoir(s, f.sousComps, f.competences);
        const scope = competenceScope(competence, domaineDe(competence), lookups);
        return {
          CODE: s.code,
          NOM: s.nom,
          TYPE: s.type,
          NIVEAU: s.niveau,
          COMPÉTENCE: lien.competence,
          'SOUS-COMPÉTENCE': lien.sousCompetence,
          'PARENT / RACINE': lien.parent,
          UP: scope.up,
          DÉPARTEMENT: scope.departement,
        };
      }),
      '04-SAVOIRS',
      { fg: 'FFFFFF', bg: 'DC2626' },
    ),
    '04-SAVOIRS',
  );

  XLSX.writeFile(wb, `structure${sfx}_${getExportDateSuffix()}.xlsx`);
}

export function doExportSavoirsExcel(
  crud: unknown,
  domaineId?: unknown,
  lookups?: ScopeLookups,
): void {
  const f = getFilteredCrud(crud as FilteredCrudParam, domaineId) as unknown as ReferentielCrud;
  const sfx = domaineId ? '_domaine' : '';
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    createStyledSheet(
      f.savoirs.map((s) => {
        const comp = competenceDuSavoir(s, f.sousComps, f.competences);
        const dom = comp ? f.domaines.find((d) => String(d.id) === String(comp.domaineId)) : null;
        const lien = savoirRattachement(s, f.sousComps, f.competences);
        const scope = competenceScope(comp, dom, lookups);
        return {
          CODE: s.code,
          NOM: s.nom,
          TYPE: s.type,
          NIVEAU: s.niveau,
          COMPÉTENCE: lien.competence,
          'SOUS-COMPÉTENCE': lien.sousCompetence,
          'PARENT / RACINE': lien.parent,
          DOMAINE: dom?.nom || '',
          UP: scope.up,
          DÉPARTEMENT: scope.departement,
        };
      }),
      'SAVOIRS',
      { fg: 'FFFFFF', bg: 'DC2626' },
    ),
    'SAVOIRS',
  );

  XLSX.writeFile(wb, `savoirs${sfx}_${getExportDateSuffix()}.xlsx`);
}

export function doExportSynthesisExcel(
  crud: unknown,
  stats?: Record<string, number | null | undefined>,
): void {
  const c = crud as ReferentielCrud;
  const wb = XLSX.utils.book_new();

  // Feuille Statistiques
  const statsRows = [
    { INDICATEUR: 'Domaines', VALEUR: stats?.totalDomaines ?? (c.domaines || []).length },
    { INDICATEUR: 'Compétences', VALEUR: stats?.totalCompetences ?? (c.competences || []).length },
    {
      INDICATEUR: 'Sous-compétences',
      VALEUR: stats?.totalSousCompetences ?? (c.sousComps || []).length,
    },
    { INDICATEUR: 'Savoirs', VALEUR: stats?.totalSavoirs ?? (c.savoirs || []).length },
    {
      INDICATEUR: 'Savoirs théoriques',
      VALEUR:
        stats?.totalSavoirsTheoriques ??
        (c.savoirs || []).filter((s) => s.type === 'THEORIQUE').length,
    },
    {
      INDICATEUR: 'Savoirs pratiques',
      VALEUR:
        stats?.totalSavoirsPratiques ??
        (c.savoirs || []).filter((s) => s.type === 'PRATIQUE').length,
    },
  ];

  XLSX.utils.book_append_sheet(
    wb,
    createStyledSheet(statsRows, 'STATISTIQUES', { fg: 'FFFFFF', bg: '1E40AF' }),
    'STATISTIQUES',
  );

  // Feuille Par domaine
  XLSX.utils.book_append_sheet(
    wb,
    createStyledSheet(
      (c.domaines || []).map((d) => {
        const comps = (c.competences || []).filter(
          (comp) => String(comp.domaineId) === String(d.id),
        );
        const compIds = new Set(comps.map((comp) => String(comp.id)));
        const scs = (c.sousComps || []).filter((sc) => compIds.has(String(sc.competenceId)));
        const scIds = new Set(scs.map((sc) => String(sc.id)));
        const savs = (c.savoirs || []).filter(
          (s) =>
            scIds.has(String(s.sousCompetenceId)) ||
            (s.competenceId != null && compIds.has(String(s.competenceId))),
        );

        return {
          CODE: d.code,
          DOMAINE: d.nom,
          COMPÉTENCES: comps.length,
          'SOUS-COMPÉTENCES': scs.length,
          SAVOIRS: savs.length,
          THÉORIQUES: savs.filter((s) => s.type === 'THEORIQUE').length,
          PRATIQUES: savs.filter((s) => s.type === 'PRATIQUE').length,
        };
      }),
      'PAR DOMAINE',
      { fg: 'FFFFFF', bg: '059669' },
    ),
    'PAR DOMAINE',
  );

  XLSX.writeFile(wb, `synthese_referentiel_${getExportDateSuffix()}.xlsx`);
}

export function doExportSavoirsCSV(crud: unknown, domaineId?: unknown): void {
  const f = getFilteredCrud(crud as FilteredCrudParam, domaineId) as unknown as ReferentielCrud;
  const sfx = domaineId ? '_domaine' : '';
  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'nom', label: 'Nom' },
    { key: 'type', label: 'Type' },
    { key: 'niveau', label: 'Niveau' },
    { key: 'sousc', label: 'Sous-competence' },
    { key: 'comp', label: 'Competence' },
    { key: 'domaine', label: 'Domaine' },
  ];

  const rows = f.savoirs.map((s) => {
    const fsc = f.sousComps.find((sc) => String(sc.id) === String(s.sousCompetenceId));
    let comp: Competence | null = null;
    if (fsc) comp = f.competences.find((c) => String(c.id) === String(fsc.competenceId)) ?? null;
    else if (s.competenceId != null)
      comp = f.competences.find((c) => String(c.id) === String(s.competenceId)) ?? null;
    const dom = comp ? f.domaines.find((d) => String(d.id) === String(comp.domaineId)) : null;

    return {
      code: s.code,
      nom: s.nom,
      type: s.type,
      niveau: s.niveau,
      sousc: fsc?.nom || '',
      comp: comp?.nom || '',
      domaine: dom?.nom || '',
    };
  });

  downloadFile(
    '\uFEFF' + buildCSVString(rows, columns),
    `savoirs${sfx}_${getExportDateSuffix()}.csv`,
    'text/csv;charset=utf-8;',
  );
}

export function doExportCompetencesCSV(crud: unknown, domaineId?: unknown): void {
  const f = getFilteredCrud(crud as FilteredCrudParam, domaineId) as unknown as ReferentielCrud;
  const sfx = domaineId ? '_domaine' : '';
  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'nom', label: 'Nom' },
    { key: 'domaine', label: 'Domaine' },
    { key: 'nbSousComps', label: 'Nb Sous-comp.' },
    { key: 'nbSavoirs', label: 'Nb Savoirs' },
  ];

  const rows = f.competences.map((c) => {
    const scs = f.sousComps.filter((sc) => String(sc.competenceId) === String(c.id));
    const scIds = new Set(scs.map((sc) => String(sc.id)));
    const direct = f.savoirs.filter((s) => String(s.competenceId) === String(c.id)).length;

    return {
      code: c.code,
      nom: c.nom,
      domaine: f.domaines.find((d) => String(d.id) === String(c.domaineId))?.nom || '',
      nbSousComps: scs.length,
      nbSavoirs: f.savoirs.filter((s) => scIds.has(String(s.sousCompetenceId))).length + direct,
    };
  });

  downloadFile(
    '\uFEFF' + buildCSVString(rows, columns),
    `competences${sfx}_${getExportDateSuffix()}.csv`,
    'text/csv;charset=utf-8;',
  );
}

const mapSavoir = (s: Savoir) => ({
  id: s.id,
  code: s.code,
  nom: s.nom,
  type: s.type,
  niveau: s.niveau,
});

const buildSousCompetenceNode = (sc: SousCompetence, savoirs: Savoir[]) => ({
  id: sc.id,
  code: sc.code,
  nom: sc.nom,
  parentId: sc.parentId || null,
  savoirs: (savoirs || [])
    .filter((s) => String(s.sousCompetenceId) === String(sc.id))
    .map(mapSavoir),
});

const buildCompetenceNode = (c: Competence, crud: ReferentielCrud) => {
  const scs = (crud.sousComps || []).filter((sc) => String(sc.competenceId) === String(c.id));
  return {
    id: c.id,
    code: c.code,
    nom: c.nom,
    savoirsDirects: (crud.savoirs || [])
      .filter((s) => String(s.competenceId) === String(c.id) && !s.sousCompetenceId)
      .map(mapSavoir),
    sousCompetences: scs.map((sc) => buildSousCompetenceNode(sc, crud.savoirs)),
  };
};

export function doExportStructureJSON(crud: unknown): void {
  const c = crud as ReferentielCrud;
  const json = {
    exportedAt: new Date().toISOString(),
    stats: {
      domaines: (c.domaines || []).length,
      competences: (c.competences || []).length,
      sousCompetences: (c.sousComps || []).length,
      savoirs: (c.savoirs || []).length,
    },
    domaines: (c.domaines || []).map((d) => ({
      id: d.id,
      code: d.code,
      nom: d.nom,
      competences: (c.competences || [])
        .filter((comp) => String(comp.domaineId) === String(d.id))
        .map((comp) => buildCompetenceNode(comp, c)),
    })),
  };

  downloadFile(
    JSON.stringify(json, null, 2),
    `structure_${getExportDateSuffix()}.json`,
    'application/json',
  );
}
