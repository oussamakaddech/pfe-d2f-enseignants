import { describe, it, expect, vi, beforeEach } from 'vitest';

const readMock = vi.fn();
const sheetToJsonMock = vi.fn();

vi.mock('xlsx', () => ({
  read: (...args: unknown[]) => readMock(...args),
  utils: {
    sheet_to_json: (...args: unknown[]) => sheetToJsonMock(...args),
  },
}));

import { parseEmailsFromExcel, getPersonEmailList, filterExistingByEmails } from './actorImport';

const makeFile = () => ({ arrayBuffer: async () => new ArrayBuffer(8) }) as unknown as File;

const setSheet = (aoa: unknown[][]) => {
  readMock.mockReturnValue({ SheetNames: ['s'], Sheets: { s: {} } });
  sheetToJsonMock.mockReturnValue(aoa);
};

describe('actorImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseEmailsFromExcel', () => {
    it('returns empty result when fewer than 2 rows', async () => {
      setSheet([['email']]);
      const res = await parseEmailsFromExcel(makeFile());
      expect(res).toEqual({ emails: [], rows: 0, headers: [] });
    });

    it('returns rows with no emails when no email column', async () => {
      setSheet([
        ['name', 'age'],
        ['Bob', 30],
      ]);
      const res = await parseEmailsFromExcel(makeFile());
      expect(res.emails).toEqual([]);
      expect(res.rows).toBe(1);
      expect(res.headers).toEqual(['name', 'age']);
    });

    it('extracts, lowercases and dedupes emails', async () => {
      setSheet([
        ['Nom', 'Email'],
        ['A', 'A@X.com'],
        ['B', 'a@x.com'],
        ['C', 'b@x.com'],
        ['D', ''],
      ]);
      const res = await parseEmailsFromExcel(makeFile());
      expect(res.emails).toEqual(['a@x.com', 'b@x.com']);
      expect(res.rows).toBe(4);
    });

    it('matches alternative email header keys', async () => {
      setSheet([['courriel'], ['x@y.com']]);
      const res = await parseEmailsFromExcel(makeFile());
      expect(res.emails).toEqual(['x@y.com']);
    });
  });

  describe('getPersonEmailList', () => {
    it('reads mail or email field, lowercased', () => {
      expect(getPersonEmailList([{ mail: 'A@X.com' }, { email: 'B@Y.com' }, { mail: '' }])).toEqual(
        ['a@x.com', 'b@y.com'],
      );
    });
    it('returns empty for empty list', () => {
      expect(getPersonEmailList([])).toEqual([]);
    });
  });

  describe('filterExistingByEmails', () => {
    it('splits pool into matched and missing', () => {
      const pool = [
        { id: 1, mail: 'a@x.com' },
        { id: 2, mail: 'b@x.com' },
      ] as unknown as Parameters<typeof filterExistingByEmails>[0];
      const { matched, missing } = filterExistingByEmails(pool, ['a@x.com', 'c@x.com']);
      expect(matched).toHaveLength(1);
      expect((matched[0] as { id: number }).id).toBe(1);
      expect(missing).toEqual(['c@x.com']);
    });
    it('handles empty emails', () => {
      const pool = [{ id: 1, mail: 'a@x.com' }] as unknown as Parameters<
        typeof filterExistingByEmails
      >[0];
      const { matched, missing } = filterExistingByEmails(pool, []);
      expect(matched).toEqual([]);
      expect(missing).toEqual([]);
    });
  });
});
