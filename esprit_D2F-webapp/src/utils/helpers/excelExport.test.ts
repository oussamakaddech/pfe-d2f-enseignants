import { describe, it, expect, vi, beforeEach } from 'vitest';

const writeFileMock = vi.fn();

vi.mock('xlsx-js-style', () => {
  const encode_cell = ({ r, c }: { r: number; c: number }) => {
    const col = String.fromCharCode(65 + c);
    return `${col}${r + 1}`;
  };
  const aoa_to_sheet = (aoa: unknown[][]) => {
    const ws: Record<string, unknown> = {};
    let maxC = 0;
    aoa.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val === null || val === undefined) return;
        ws[encode_cell({ r, c })] = { v: val, t: typeof val === 'number' ? 'n' : 's' };
        if (c > maxC) maxC = c;
      });
    });
    ws['!ref'] = `A1:${encode_cell({ r: Math.max(aoa.length - 1, 0), c: maxC })}`;
    return ws;
  };
  const utils = {
    aoa_to_sheet,
    encode_cell,
    encode_range: () => 'A1:B2',
    book_new: () => ({ SheetNames: [], Sheets: {} }),
    book_append_sheet: (wb: { SheetNames: string[]; Sheets: Record<string, unknown> }, ws: unknown, name: string) => {
      wb.SheetNames.push(name);
      wb.Sheets[name] = ws;
    },
  };
  return {
    utils,
    writeFile: (...args: unknown[]) => writeFileMock(...args),
  };
});

import { styledSheet, writeExcel, exportDateLabel, isoDate } from './excelExport';

describe('excelExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('styledSheet', () => {
    it('returns a placeholder sheet for empty rows', () => {
      const ws = styledSheet([]) as Record<string, { v: unknown }>;
      expect(ws.A1?.v).toBe('Aucune donnée à exporter');
    });

    it('builds a sheet with header and data', () => {
      const ws = styledSheet([{ Nom: 'Alice', Age: 30 }]) as Record<string, unknown>;
      expect(ws['!ref']).toBeDefined();
      expect(ws['!cols']).toHaveLength(2);
      expect(ws['!autofilter']).toBeDefined();
    });

    it('adds title and subtitle merges', () => {
      const ws = styledSheet([{ Nom: 'Alice' }], { title: 'T', subtitle: 'S' }) as Record<string, unknown>;
      expect(ws['!merges']).toHaveLength(2);
    });

    it('handles title only', () => {
      const ws = styledSheet([{ Nom: 'Alice' }], { title: 'Only title' }) as Record<string, unknown>;
      expect(ws['!merges']).toHaveLength(1);
    });
  });

  describe('writeExcel', () => {
    it('writes a workbook and sanitizes sheet names', () => {
      writeExcel([{ name: 'a/b:c*name that is way too long to fit inside excel tab', rows: [{ x: 1 }] }], 'out.xlsx');
      expect(writeFileMock).toHaveBeenCalledTimes(1);
      expect(writeFileMock.mock.calls[0][1]).toBe('out.xlsx');
    });
    it('handles multiple sheets', () => {
      writeExcel([{ name: 'S1', rows: [{ x: 1 }] }, { name: 'S2', rows: [] }], 'multi.xlsx');
      expect(writeFileMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('exportDateLabel', () => {
    it('returns a French date/time label', () => {
      const label = exportDateLabel();
      expect(label).toContain('Généré le');
    });
  });

  describe('isoDate', () => {
    it('returns YYYY-MM-DD', () => {
      expect(isoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
