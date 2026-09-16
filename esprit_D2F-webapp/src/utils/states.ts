// États d'absence de données — vocabulaire unique pour ne jamais afficher
// un zéro trompeur ou un placeholder comme s'il s'agissait d'une mesure réelle.

/** La métrique existe mais ne peut pas être calculée (ex : aucune évaluation). */
export const NA_CALC = "Non calculable";

/** La métrique n'est pas disponible pour le périmètre / le rôle courant. */
export const NA_AVAIL = "Non disponible";

/** Les données sont insuffisantes pour être représentatives. */
export const NA_DATA = "Données insuffisantes";

/** Indicateur de chargement neutre (jamais affiché comme une valeur réelle). */
export const LOADING = "…";
