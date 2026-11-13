/**
 * Affichage de l'état d'une formation de calendrier.
 *
 * La page « Gestion du calendrier » reçoit l'énumération brute du serveur
 * (`NOUVEAU`, `ENREGISTRE`, `PLANIFIE`, `VISIBLE`, `EN_COURS`, `ACHEVE`,
 * `ANNULE`). On l'affiche en clair, avec la terminologie déjà utilisée par les
 * autres écrans (FormationList, FormationHeaderCard, DashboardStatusChart) :
 * « Planifiée », « En cours », « Achevée », « Annulée ».
 */

export interface EtatFormationAffichage {
  /** Valeur transmise au serveur (enum EtatFormation). */
  value: string;
  /** Libellé lisible affiché à l'écran. */
  label: string;
  /** Couleur du Tag antd. */
  color: string;
}

/** Tous les états connus, dans l'ordre du cycle de vie d'une formation. */
export const ETAT_FORMATION_AFFICHAGES: EtatFormationAffichage[] = [
  { value: 'NOUVEAU', label: 'Nouveau', color: 'default' },
  { value: 'ENREGISTRE', label: 'Enregistrée', color: 'blue' },
  { value: 'PLANIFIE', label: 'Planifiée', color: 'geekblue' },
  { value: 'VISIBLE', label: 'Publiée', color: 'purple' },
  { value: 'EN_COURS', label: 'En cours', color: 'gold' },
  { value: 'ACHEVE', label: 'Achevée', color: 'green' },
  { value: 'ANNULE', label: 'Annulée', color: 'red' },
];

const PAR_VALEUR = new Map(ETAT_FORMATION_AFFICHAGES.map((e) => [e.value, e]));

/**
 * Affichage d'un état reçu du serveur. Un état inconnu (valeur future de l'enum)
 * garde sa valeur brute plutôt que d'être masqué : on ne peut pas inventer un
 * libellé, mais on ne cache pas l'information.
 */
export function etatFormationAffichage(etat?: string | null): EtatFormationAffichage {
  if (!etat) return { value: '', label: '—', color: 'default' };
  return PAR_VALEUR.get(etat) ?? { value: etat, label: etat, color: 'default' };
}

/** Options du filtre « État » : mêmes libellés que la colonne du tableau. */
export const ETAT_FORMATION_OPTIONS = ETAT_FORMATION_AFFICHAGES.map((e) => ({
  value: e.value,
  label: e.label,
}));
