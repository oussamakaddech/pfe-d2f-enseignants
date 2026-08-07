import type { PersonItem } from '@/pages/formation/hooks/useFormationWorkflow';

export interface ExcelParseResult {
  emails: string[];
  rows: number;
  headers: string[];
}

const EMAIL_KEYS = [
  'email',
  'mail',
  'e-mail',
  'adresse email',
  'adresse e-mail',
  'email_address',
  'emailaddress',
  'courriel',
  'courrier',
];

function normalizeHeader(h: string): string {
  return String(h || '')
    .toLowerCase()
    .trim()
    .replaceAll(/\s+/g, ' ');
}

export async function parseEmailsFromExcel(file: File): Promise<ExcelParseResult> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  const wb = XLSX.read(data, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
  if (aoa.length < 2) {
    return { emails: [], rows: 0, headers: [] };
  }
  const headers = aoa[0].map((h) => String(h ?? ''));
  const idx = headers.findIndex((h) => {
    const n = normalizeHeader(h).replaceAll(/[_-]+/g, ' ');
    return EMAIL_KEYS.some((k) => n === k || n.includes(k));
  });
  if (idx < 0) {
    return { emails: [], rows: aoa.length - 1, headers };
  }
  const emails = aoa
    .slice(1)
    .map((row) => {
      const r = row;
      const cell = r?.[idx];
      return cell == null ? '' : String(cell).trim().toLowerCase();
    })
    .filter((m) => m.length > 0);
  return { emails: [...new Set(emails)], rows: aoa.length - 1, headers };
}

export function getPersonEmailList(
  list: Array<{ id?: unknown; mail?: string; email?: string }>,
): string[] {
  return list
    .map((p) => (p.mail || (p as { email?: string }).email || '').trim().toLowerCase())
    .filter(Boolean);
}

export function filterExistingByEmails(
  pool: PersonItem[],
  emails: string[],
): { matched: PersonItem[]; missing: string[] } {
  const set = new Set(emails);
  const matched: PersonItem[] = [];
  const found = new Set<string>();
  pool.forEach((p) => {
    const m = (p.mail || (p as { email?: string }).email || '').trim().toLowerCase();
    if (m && set.has(m)) {
      matched.push(p);
      found.add(m);
    }
  });
  const missing = emails.filter((e) => !found.has(e));
  return { matched, missing };
}
