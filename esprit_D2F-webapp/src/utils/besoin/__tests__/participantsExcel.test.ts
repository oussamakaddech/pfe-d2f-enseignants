import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx-js-style';
import { mergeParticipantLines, participantsFromSheetRows } from '../participantsExcel';
import { parseParticipantsText } from '../participants';

/**
 * Simule un vrai fichier .xlsx : construit en mémoire, sérialisé en buffer,
 * relu avec `XLSX.read` + `sheet_to_json(header: 1)` — exactement comme
 * `importParticipantsFromExcel` dans useBesoinForm.
 */
function readSheetBack(aoa: unknown[][]): unknown[][] {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Participants');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown as ArrayBuffer;
  const reloaded = XLSX.read(buffer, { type: 'array' });
  const ws = reloaded.Sheets[reloaded.SheetNames[0]];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
}

describe('import Excel participants (vrai round-trip .xlsx)', () => {
  it('importe Nom/Prénom/Email/Téléphone, ignore doublon + email invalide', () => {
    const rows = readSheetBack([
      ['Nom', 'Prénom', 'Email', 'Téléphone'],
      ['KADDECH', 'Oussama', 'oussama.kaddech@esprit.tn', '+21627326154'],
      ['Ben Ali', 'Sarra', 'sarra@esprit.tn', 21620123456], // téléphone numérique
      ['Mauvais', 'Email', 'pas-un-email', '+21620123456'], // ignorée (skipped)
      ['KADDECH', 'Oussama', 'oussama.kaddech@esprit.tn', '+21627326154'], // doublon
      [], // ligne vide
    ]);

    const { lines, skipped } = participantsFromSheetRows(rows);
    expect(skipped).toBe(1);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('KADDECH Oussama <oussama.kaddech@esprit.tn> (tél: +21627326154)');
    expect(lines[1]).toBe('Ben Ali Sarra <sarra@esprit.tn> (tél: 21620123456)');

    // Les lignes importées s'affichent correctement dans le tableau.
    const parts = parseParticipantsText(lines.join('\n'));
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({
      nom: 'KADDECH',
      prenom: 'Oussama',
      email: 'oussama.kaddech@esprit.tn',
      telephone: '+21627326154',
    });
    expect(parts[1].telephone).toBe('21620123456');
  });

  it('sans en-tête : positions fixes Nom | Prénom | Email | Tél', () => {
    const rows = readSheetBack([
      ['KADDECH', 'Oussama', 'oussama.kaddech@esprit.tn', '+21627326154'],
    ]);
    const { lines, skipped } = participantsFromSheetRows(rows);
    expect(skipped).toBe(0);
    expect(lines).toHaveLength(1);
    expect(parseParticipantsText(lines.join('\n'))[0].email).toBe('oussama.kaddech@esprit.tn');
  });

  it('fusionne en écartant le résidu C:\\fakepath (bubble du change input file)', () => {
    const merged = mergeParticipantLines(
      'C:\\fakepath\\participants_exemple.xlsx\nKADDECH Oussama <oussama.kaddech@esprit.tn> (tél: +21627326154)',
      ['Ben Ali Sarra <sarra@esprit.tn> (tél: 21620123456)'],
    );
    expect(merged).toBe(
      'KADDECH Oussama <oussama.kaddech@esprit.tn> (tél: +21627326154)\n' +
        'Ben Ali Sarra <sarra@esprit.tn> (tél: 21620123456)',
    );
    expect(parseParticipantsText(merged)).toHaveLength(2);
  });

  it('ne réimporte pas les participants déjà présents (anti-doublons email)', () => {
    const rows = readSheetBack([
      ['Nom', 'Prénom', 'Email', 'Téléphone'],
      ['KADDECH', 'Oussama', 'oussama.kaddech@esprit.tn', '+21627326154'],
      ['Nouveau', 'Cas', 'nouveau@esprit.tn', '+21620000000'],
    ]);
    const { lines } = participantsFromSheetRows(rows, new Set(['mail:oussama.kaddech@esprit.tn']));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('nouveau@esprit.tn');
  });
});
