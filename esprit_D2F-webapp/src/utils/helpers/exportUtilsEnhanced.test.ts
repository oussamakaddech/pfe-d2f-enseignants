import { describe, it, expect, vi, beforeEach } from 'vitest';

const writeFileMock = vi.fn();

vi.mock('xlsx-js-style', () => {
  const utils = {
    json_to_sheet: (data: Record<string, unknown>[]) => ({
      '!ref': 'A1:A1',
      __data: data,
    }),
    book_new: () => ({ SheetNames: [], Sheets: {} }),
    book_append_sheet: (
      wb: { SheetNames: string[]; Sheets: Record<string, unknown> },
      ws: unknown,
      name: string,
    ) => {
      wb.SheetNames.push(name);
      wb.Sheets[name] = ws;
    },
    decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }),
    encode_cell: ({ r, c }: { r: number; c: number }) => `R${r}C${c}`,
  };
  return {
    utils,
    writeFile: (...args: unknown[]) => writeFileMock(...args),
  };
});

import {
  getExportDateSuffix,
  buildCSVString,
  downloadFile,
  doExportStructureExcel,
  doExportSavoirsExcel,
  doExportSynthesisExcel,
  doExportSavoirsCSV,
  doExportCompetencesCSV,
  doExportStructureJSON,
  savoirRattachement,
} from './exportUtilsEnhanced';

const crud = {
  domaines: [{ id: 1, code: 'D1', nom: 'Domaine 1' }],
  competences: [
    { id: 10, code: 'C1', nom: 'Comp 1', domaineId: 1, upIds: [7], departementIds: [8] },
  ],
  sousComps: [{ id: 100, code: 'SC1', nom: 'SousComp 1', competenceId: 10, parentId: null }],
  savoirs: [
    {
      id: 1000,
      code: 'S1',
      nom: 'Savoir 1',
      type: 'THEORIQUE',
      niveau: 'N1',
      sousCompetenceId: 100,
    },
    { id: 1001, code: 'S2', nom: 'Savoir 2', type: 'PRATIQUE', niveau: 'N2', competenceId: 10 },
  ],
};

describe('exportUtilsEnhanced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getExportDateSuffix', () => {
    it('returns an ISO date (YYYY-MM-DD)', () => {
      expect(getExportDateSuffix()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('buildCSVString', () => {
    it('builds header and rows with quoting', () => {
      const csv = buildCSVString(
        [{ a: 'x', b: 'y' }],
        [
          { key: 'a', label: 'A' },
          { key: 'b', label: 'B' },
        ],
      );
      expect(csv).toBe('"A","B"\n"x","y"');
    });
    it('escapes double quotes and handles missing values', () => {
      const csv = buildCSVString(
        [{ a: 'he "said"', b: undefined }],
        [
          { key: 'a', label: 'A' },
          { key: 'b', label: 'B' },
        ],
      );
      expect(csv).toBe('"A","B"\n"he ""said""",""');
    });
    it('handles empty rows', () => {
      expect(buildCSVString([], [{ key: 'a', label: 'A' }])).toBe('"A"');
    });
  });

  describe('downloadFile', () => {
    it('creates a link, clicks and revokes the url', () => {
      const createObjectURL = vi.fn(() => 'blob:url');
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      downloadFile('content', 'file.txt', 'text/plain');

      expect(createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:url');

      vi.unstubAllGlobals();
      clickSpy.mockRestore();
    });
  });

  describe('savoirRattachement', () => {
    const sousComps = [
      { id: 100, code: 'SC1', nom: 'SousComp 1', competenceId: 10, parentId: null },
      { id: 101, code: 'SC2', nom: 'SousComp 2', competenceId: 10, parentId: 100 },
    ];
    const competences = [{ id: 10, code: 'C1', nom: 'Comp 1', domaineId: 1 }];

    it('savoir porté directement par une compétence : compétence seule, autres colonnes « - »', () => {
      const savoir = {
        id: 2,
        code: 'S2',
        nom: 'S2',
        type: 'PRATIQUE',
        niveau: 'N2',
        competenceId: 10,
      };
      expect(savoirRattachement(savoir, sousComps, competences)).toEqual({
        competence: '[C1] Comp 1',
        sousCompetence: '-',
        parent: '-',
      });
    });

    it('savoir d’une sous-compétence racine : compétence « - » et racine signalée', () => {
      const savoir = {
        id: 1,
        code: 'S1',
        nom: 'S1',
        type: 'THEORIQUE',
        niveau: 'N1',
        sousCompetenceId: 100,
      };
      expect(savoirRattachement(savoir, sousComps, competences)).toEqual({
        competence: '-',
        sousCompetence: '[SC1] SousComp 1',
        parent: 'RACINE',
      });
    });

    it('savoir d’une sous-compétence descendante : parent = sous-compétence parente', () => {
      const savoir = {
        id: 3,
        code: 'S3',
        nom: 'S3',
        type: 'PRATIQUE',
        niveau: 'N3',
        sousCompetenceId: 101,
      };
      expect(savoirRattachement(savoir, sousComps, competences)).toEqual({
        competence: '-',
        sousCompetence: '[SC2] SousComp 2',
        parent: '[SC1] SousComp 1',
      });
    });

    it('remonte à la racine de la branche, même imbriquée', () => {
      const profondes = [
        ...sousComps,
        { id: 102, code: 'SC3', nom: 'SousComp 3', competenceId: 10, parentId: 101 },
      ];
      expect(
        savoirRattachement(
          { id: 7, code: 'S7', nom: 'S7', type: 'PRATIQUE', niveau: 'N1', sousCompetenceId: 102 },
          profondes,
          competences,
        ),
      ).toEqual({
        competence: '-',
        sousCompetence: '[SC3] SousComp 3',
        parent: '[SC1] SousComp 1',
      });
    });

    it('savoir sans aucun rattachement : trois colonnes à « - »', () => {
      expect(
        savoirRattachement(
          { id: 6, code: 'S6', nom: 'S6', type: 'PRATIQUE', niveau: 'N1' },
          sousComps,
          competences,
        ),
      ).toEqual({ competence: '-', sousCompetence: '-', parent: '-' });
    });

    it('signale une compétence puis une sous-compétence hors liste', () => {
      expect(
        savoirRattachement(
          {
            id: 4,
            code: 'S4',
            nom: 'S4',
            type: 'PRATIQUE',
            niveau: 'N1',
            sousCompetenceId: 999,
            competenceId: 10,
          },
          sousComps,
          competences,
        ),
      ).toEqual({
        competence: '-',
        sousCompetence: 'Sous-compétence #999 (hors liste)',
        parent: 'RACINE',
      });
      expect(
        savoirRattachement(
          { id: 5, code: 'S5', nom: 'S5', type: 'PRATIQUE', niveau: 'N1', sousCompetenceId: 999 },
          sousComps,
          competences,
        ),
      ).toEqual({
        competence: '-',
        sousCompetence: 'Sous-compétence #999 (hors liste)',
        parent: 'RACINE',
      });
    });
  });

  describe('excel exporters', () => {
    it('doExportStructureExcel writes a file', () => {
      doExportStructureExcel(crud);
      expect(writeFileMock).toHaveBeenCalledTimes(1);
      expect(writeFileMock.mock.calls[0][1]).toMatch(/^structure_complet_/);
    });
    it('doExportStructureExcel uses domaine suffix when domaineId provided', () => {
      doExportStructureExcel(crud, 1);
      expect(writeFileMock.mock.calls[0][1]).toMatch(/^structure_domaine_/);
    });
    it('doExportStructureExcel expose compétence, sous-compétence et parent/racine', () => {
      doExportStructureExcel(crud);
      const sheets = (writeFileMock.mock.calls[0][0] as { Sheets: Record<string, unknown> }).Sheets;
      const rows = (sheets['04-SAVOIRS'] as { __data: Record<string, unknown>[] }).__data;

      expect(Object.keys(rows[0])).toEqual([
        'CODE',
        'NOM',
        'TYPE',
        'NIVEAU',
        'COMPÉTENCE',
        'SOUS-COMPÉTENCE',
        'PARENT / RACINE',
        'UP',
        'DÉPARTEMENT',
      ]);
      expect(rows[0]).toMatchObject({
        COMPÉTENCE: '-',
        'SOUS-COMPÉTENCE': '[SC1] SousComp 1',
        'PARENT / RACINE': 'RACINE',
      });
      expect(rows[1]).toMatchObject({
        COMPÉTENCE: '[C1] Comp 1',
        'SOUS-COMPÉTENCE': '-',
        'PARENT / RACINE': '-',
      });
    });

    it('doExportStructureExcel ajoute UP et Département aux compétences et aux savoirs', () => {
      const lookups = {
        ups: [{ id: 7, name: 'UP Génie Civil' }],
        depts: [{ id: 8, libelle: 'Département Informatique' }],
      };
      doExportStructureExcel(crud, undefined, lookups);
      const sheets = (writeFileMock.mock.calls[0][0] as { Sheets: Record<string, unknown> }).Sheets;
      const comps = (sheets['02-COMPÉTENCES'] as { __data: Record<string, unknown>[] }).__data;
      const savoirs = (sheets['04-SAVOIRS'] as { __data: Record<string, unknown>[] }).__data;

      expect(Object.keys(comps[0])).toEqual([
        'CODE',
        'NOM',
        'DOMAINE',
        'UP',
        'DÉPARTEMENT',
        'NB SOUS-COMPÉTENCES',
      ]);
      expect(comps[0]).toMatchObject({
        UP: 'UP Génie Civil',
        DÉPARTEMENT: 'Département Informatique',
      });
      // Le savoir d'une sous-compétence hérite de la UP / du département de sa compétence.
      expect(savoirs[0]).toMatchObject({
        UP: 'UP Génie Civil',
        DÉPARTEMENT: 'Département Informatique',
      });
    });

    it("laisse « - » quand ni la compétence ni son domaine n'ont de rattachement", () => {
      doExportStructureExcel(
        { ...crud, competences: [{ id: 10, code: 'C1', nom: 'Comp 1', domaineId: 1 }] },
        undefined,
        { ups: [{ id: 7, name: 'UP GC' }], depts: [] },
      );
      const sheets = (writeFileMock.mock.calls[0][0] as { Sheets: Record<string, unknown> }).Sheets;
      const comps = (sheets['02-COMPÉTENCES'] as { __data: Record<string, unknown>[] }).__data;

      expect(comps[0]).toMatchObject({ UP: '-', DÉPARTEMENT: '-' });
    });

    it('doExportSavoirsExcel expose les mêmes colonnes de rattachement', () => {
      doExportSavoirsExcel(crud);
      const sheets = (writeFileMock.mock.calls[0][0] as { Sheets: Record<string, unknown> }).Sheets;
      const rows = (sheets['SAVOIRS'] as { __data: Record<string, unknown>[] }).__data;

      expect(Object.keys(rows[0])).toEqual([
        'CODE',
        'NOM',
        'TYPE',
        'NIVEAU',
        'COMPÉTENCE',
        'SOUS-COMPÉTENCE',
        'PARENT / RACINE',
        'DOMAINE',
        'UP',
        'DÉPARTEMENT',
      ]);
    });
    it("doExportStructureExcel n'expose plus de colonne PARENT dans les sous-compétences", () => {
      doExportStructureExcel(crud);
      const sheets = (writeFileMock.mock.calls[0][0] as { Sheets: Record<string, unknown> }).Sheets;
      const rows = (sheets['03-SOUS-COMPÉTENCES'] as { __data: Record<string, unknown>[] }).__data;

      expect(Object.keys(rows[0])).toEqual(['CODE', 'NOM', 'COMPÉTENCE']);
    });
    it('doExportSavoirsExcel writes a file', () => {
      doExportSavoirsExcel(crud);
      expect(writeFileMock.mock.calls[0][1]).toMatch(/^savoirs_/);
    });
    it('doExportSynthesisExcel writes a file', () => {
      doExportSynthesisExcel(crud);
      expect(writeFileMock.mock.calls[0][1]).toMatch(/^synthese_referentiel_/);
    });
    it('doExportSynthesisExcel honours provided stats', () => {
      doExportSynthesisExcel(crud, { totalDomaines: 99 });
      expect(writeFileMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('csv/json exporters', () => {
    it('doExportSavoirsCSV downloads a csv', () => {
      const createObjectURL = vi.fn(() => 'blob:url');
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      doExportSavoirsCSV(crud);
      expect(createObjectURL).toHaveBeenCalled();
      vi.unstubAllGlobals();
      clickSpy.mockRestore();
    });
    it('doExportCompetencesCSV downloads a csv', () => {
      const createObjectURL = vi.fn(() => 'blob:url');
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      doExportCompetencesCSV(crud);
      expect(createObjectURL).toHaveBeenCalled();
      vi.unstubAllGlobals();
      clickSpy.mockRestore();
    });
    it('doExportStructureJSON downloads json', () => {
      const createObjectURL = vi.fn(() => 'blob:url');
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      doExportStructureJSON(crud);
      expect(createObjectURL).toHaveBeenCalled();
      vi.unstubAllGlobals();
      clickSpy.mockRestore();
    });
  });
});
