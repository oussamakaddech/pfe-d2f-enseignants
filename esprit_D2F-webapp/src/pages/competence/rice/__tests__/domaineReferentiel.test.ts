import { describe, expect, it } from 'vitest';
import { champsDepuisDomaine } from '../review/domaineReferentiel';

describe('champsDepuisDomaine — reprise d’un domaine du référentiel', () => {
  it('reprend code, nom et description et retient le rattachement', () => {
    expect(
      champsDepuisDomaine({
        id: 12,
        code: 'INFO',
        nom: 'Informatique',
        description: 'Domaine du référentiel',
      }),
    ).toEqual({
      domaineExistantId: '12',
      code: 'INFO',
      nom: 'Informatique',
      description: 'Domaine du référentiel',
    });
  });

  it('garde le code RICE quand le domaine du référentiel n’en a pas', () => {
    const champs = champsDepuisDomaine({ id: 7, nom: 'Génie civil' }, 'MT-34');

    expect(champs.code).toBe('MT-34');
    expect(champs.nom).toBe('Génie civil');
    expect(champs.description).toBe('');
  });
});
