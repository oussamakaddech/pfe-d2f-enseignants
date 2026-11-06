import { describe, expect, it } from 'vitest';
import {
  ATTESTATION_HEADERS,
  attestationFileName,
  attestationTitle,
  buildAttestationPdf,
  teacherFullName,
} from '../attestationPdf';

describe('attestationPdf', () => {
  it('reprend les titres des deux modèles', () => {
    expect(attestationTitle('PARTICIPATION')).toBe('Attestation de participation à des formations');
    expect(attestationTitle('ANIMATION')).toBe("Attestation d'animation d'une formation");
  });

  it('utilise les colonnes exactes des modèles', () => {
    expect(ATTESTATION_HEADERS.PARTICIPATION).toEqual(['Formation', 'Formateur', 'Date']);
    expect(ATTESTATION_HEADERS.ANIMATION).toEqual([
      'Formation',
      'Formateur(s)',
      'Date',
      "Nb. d'heures",
      'Public cible',
      'Objectifs',
    ]);
  });

  it('met le nom de famille en capitales', () => {
    expect(teacherFullName({ nom: 'ben ali', prenom: 'Samia' })).toBe('Samia BEN ALI');
    expect(teacherFullName({})).toBe('');
  });

  it('nomme le fichier selon le type et la date', () => {
    expect(
      attestationFileName('ANIMATION', { nom: 'Ben Ali', prenom: 'Samia' }, '2026-11-03'),
    ).toBe('attestation_animation_Ben_Ali_Samia_2026-11-03.pdf');
    expect(attestationFileName('PARTICIPATION', {}, '2026-01-05')).toBe(
      'attestation_participation_2026-01-05.pdf',
    );
  });

  it('génère une page A4 avec le titre et le tableau de participation', () => {
    const doc = buildAttestationPdf({
      type: 'PARTICIPATION',
      teacher: { nom: 'Ben Ali', prenom: 'Samia', departement: 'Informatique' },
      rows: [
        {
          titreFormation: 'Spring Boot avancé',
          formateurs: [{ nom: 'Maalej', prenom: 'Khaled' }],
          dateDebut: '2026-03-02',
        },
      ],
      issuedOn: '2026-11-03',
    });
    const text = doc.output();
    expect(doc.getNumberOfPages()).toBe(1);
    expect(text).toContain('Attestation de participation');
    expect(text).toContain('Samia BEN ALI');
    expect(text).toContain('Informatique');
    expect(text).toContain('Spring Boot avancé');
    expect(text).toContain('Khaled MAALEJ');
    expect(text).toContain('02/03/2026');
    expect(text).toContain('servir et valoir ce que de droit');
    expect(text).toContain('Fait à Tunis, le 03/11/2026');
  });

  it('n’affiche aucun point de remplissage quand le département manque', () => {
    const doc = buildAttestationPdf({
      type: 'PARTICIPATION',
      teacher: { nom: 'Ben Ali', prenom: 'Samia' },
      rows: [{ titreFormation: 'Spring Boot avancé', dateDebut: '2026-03-02' }],
      issuedOn: '2026-11-03',
    });
    const text = doc.output();
    expect(text).not.toContain('………');
    expect(text).not.toContain('au sein du département');
    expect(text).toContain('ESPRIT');
  });

  it('accepte un libellé de formateur saisi à la main', () => {
    const doc = buildAttestationPdf({
      type: 'PARTICIPATION',
      teacher: { nom: 'Ben Ali', prenom: 'Samia', departement: 'Informatique' },
      rows: [
        {
          titreFormation: 'Spring Boot avancé',
          formateursLibelle: 'K. MAALEJ',
          dateDebut: '2026-03-02',
        },
      ],
      issuedOn: '2026-11-03',
    });
    expect(doc.output()).toContain('K. MAALEJ');
  });

  it('génère le tableau d’animation avec les six colonnes', () => {
    const doc = buildAttestationPdf({
      type: 'ANIMATION',
      teacher: { nom: 'Trabelsi', prenom: 'Nadia', departement: 'Génie Civil' },
      rows: [
        {
          titreFormation: 'BIM niveau 2',
          formateurs: [{ nom: 'Trabelsi', prenom: 'Nadia' }],
          dateDebut: '2026-05-11',
          chargeHoraireGlobal: 21,
          populationCible: 'Ingénieurs GC',
          objectifs: 'Maîtriser la maquette numérique',
        },
      ],
      issuedOn: '2026-11-03',
    });
    const text = doc.output();
    expect(text).toContain("Attestation d'animation");
    expect(text).toContain('Nadia TRABELSI');
    expect(text).toContain('BIM niveau 2');
    expect(text).toContain('21 h');
    expect(text).toContain('Ingénieurs GC');
    expect(text).toContain('a animé la formation suivante');
  });
});
