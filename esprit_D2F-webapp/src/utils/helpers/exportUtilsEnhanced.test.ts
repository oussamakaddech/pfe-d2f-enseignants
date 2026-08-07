import { describe, it, expect, vi, beforeEach } from 'vitest';

const writeFileMock = vi.fn();

vi.mock('xlsx', () => {
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
} from './exportUtilsEnhanced';

const crud = {
  domaines: [{ id: 1, code: 'D1', nom: 'Domaine 1' }],
  competences: [{ id: 10, code: 'C1', nom: 'Comp 1', domaineId: 1 }],
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
