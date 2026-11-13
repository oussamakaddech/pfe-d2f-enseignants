import { describe, expect, it } from 'vitest';
import {
  formatParticipantLine,
  isValidEmail,
  isValidPhone,
  normalizePhone,
  parseParticipantBlocks,
  parseParticipantLine,
  parseParticipantsText,
  participantFullName,
  participantKey,
} from '../participants';

describe('participants utils', () => {
  it('formate une ligne canonique nom + email + téléphone', () => {
    expect(
      formatParticipantLine({
        nom: 'Ben Ali',
        prenom: 'Sarra',
        email: 'sarra@esprit.tn',
        telephone: '+216 20 123 456',
      }),
    ).toBe('Ben Ali Sarra <sarra@esprit.tn> (tél: +21620123456)');
  });

  it('omet les parties absentes', () => {
    expect(formatParticipantLine({ nom: 'Doe', prenom: 'John', email: '', telephone: '' })).toBe(
      'Doe John',
    );
    expect(formatParticipantLine({ nom: '', prenom: '', email: 'a@b.tn', telephone: '' })).toBe(
      '<a@b.tn>',
    );
  });

  it('parse une ligne complète', () => {
    expect(parseParticipantLine('Ben Ali Sarra <sarra@esprit.tn> (tél: +21620123456)')).toEqual({
      nom: 'Ben',
      prenom: 'Ali Sarra',
      email: 'sarra@esprit.tn',
      telephone: '+21620123456',
    });
  });

  it('parse une ligne sans email ni téléphone', () => {
    expect(parseParticipantLine('Doe John')).toEqual({
      nom: 'Doe',
      prenom: 'John',
      email: '',
      telephone: '',
    });
  });

  it('découpe un texte multi-lignes en ignorant les lignes vides', () => {
    const parts = parseParticipantsText('Doe John <j@esprit.tn>\n\nSmith Anna (tél: 20123456)\n');
    expect(parts).toHaveLength(2);
    expect(parts[0].email).toBe('j@esprit.tn');
    expect(parts[1].telephone).toBe('20123456');
  });

  it('valide les emails', () => {
    expect(isValidEmail('')).toBe(true);
    expect(isValidEmail('a@esprit.tn')).toBe(true);
    expect(isValidEmail('pas-un-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });

  it('normalise et valide les téléphones', () => {
    expect(normalizePhone('+216 20 123-456')).toBe('+21620123456');
    expect(isValidPhone('')).toBe(true);
    expect(isValidPhone('+21620123456')).toBe(true);
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('12ab34')).toBe(false);
  });

  it('groupe un participant saisi sur 3 lignes (cas réel Oussama KADDECH)', () => {
    const parts = parseParticipantsText('Oussama KADDECH\noussama.kaddech@esprit.tn\n+21627326154');
    expect(parts).toHaveLength(1);
    expect(parts[0]).toEqual({
      nom: 'Oussama',
      prenom: 'KADDECH',
      email: 'oussama.kaddech@esprit.tn',
      telephone: '+21627326154',
    });
    const blocks = parseParticipantBlocks(
      'Oussama KADDECH\noussama.kaddech@esprit.tn\n+21627326154',
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toBe(0);
    expect(blocks[0].end).toBe(3);
  });

  it('ne confond pas une ligne canonique suivie de résidus avec un nom multi-lignes', () => {
    const text =
      'Oussama KADDECH <oussama.kaddech@esprit.tn> (tél: +21627326154)\n' +
      'oussama.kaddech@esprit.tn\n' +
      '+21627326154';
    const blocks = parseParticipantBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].participant).toEqual({
      nom: 'Oussama',
      prenom: 'KADDECH',
      email: 'oussama.kaddech@esprit.tn',
      telephone: '+21627326154',
    });
    // Le bloc couvre les 3 lignes : édition/suppression nettoie les résidus.
    expect(blocks[0]).toMatchObject({ start: 0, end: 3 });
  });

  it('absorbe un résidu placé AVANT la ligne canonique (cas réel affiché)', () => {
    const text =
      '+21627326154\n' + 'Oussama KADDECH <oussama.kaddech@esprit.tn> (tél: +21627326154)';
    const blocks = parseParticipantBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].participant).toEqual({
      nom: 'Oussama',
      prenom: 'KADDECH',
      email: 'oussama.kaddech@esprit.tn',
      telephone: '+21627326154',
    });
    expect(blocks[0]).toMatchObject({ start: 0, end: 2 });
  });

  it('supprime un bloc multi-lignes entier sans laisser de lignes orphelines', () => {
    const text = 'Oussama KADDECH\noussama.kaddech@esprit.tn\n+21627326154\nAutre Personne';
    const lines = text.split(/\r?\n/);
    const target = parseParticipantBlocks(text)[0];
    const remaining = [...lines.slice(0, target.start), ...lines.slice(target.end)];
    expect(parseParticipantsText(remaining.join('\n'))).toHaveLength(1);
    expect(parseParticipantsText(remaining.join('\n'))[0].nom).toBe('Autre');
  });

  it('construit le nom complet et la clé de dédup', () => {
    expect(participantFullName({ nom: 'Doe', prenom: 'John' })).toBe('Doe John');
    expect(participantKey({ nom: 'X', prenom: 'Y', email: 'A@Esprit.tn', telephone: '' })).toBe(
      'mail:a@esprit.tn',
    );
  });
});
