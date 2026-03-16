/**
 * formatters.js — Utilitaires de formatage — D2F Webapp
 * Conformité DSI §1.3 : Modularité et Réutilisabilité
 * ─────────────────────────────────────────────────────
 * Centralise toutes les fonctions de formatage pour éviter
 * la duplication de logique dans les composants.
 */

// ── Dates ─────────────────────────────────────────────────────────────────────

/**
 * Formate une date ISO en format lisible fr-FR (ex: "12 janv. 2025")
 * @param {string|Date|null} value
 * @returns {string}
 */
export const formatDate = (value) => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * Formate une date ISO avec heure (ex: "12 janv. 2025, 14:30")
 * @param {string|Date|null} value
 * @returns {string}
 */
export const formatDateTime = (value) => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Formate une date ISO en format court (ex: "12/01/2025")
 * @param {string|Date|null} value
 * @returns {string}
 */
export const formatDateShort = (value) => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR");
};

/**
 * Retourne le temps relatif depuis une date (ex: "il y a 3 jours")
 * @param {string|Date|null} value
 * @returns {string}
 */
export const formatRelativeTime = (value) => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "—";

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffH   = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffH / 24);

  if (diffSec < 60)  return "À l'instant";
  if (diffMin < 60)  return `Il y a ${diffMin} min`;
  if (diffH < 24)    return `Il y a ${diffH}h`;
  if (diffDay < 30)  return `Il y a ${diffDay} jour${diffDay > 1 ? "s" : ""}`;
  return formatDate(d);
};

// ── Texte ─────────────────────────────────────────────────────────────────────

/**
 * Tronque un texte à n caractères et ajoute "…"
 * @param {string|null} text
 * @param {number} n
 * @returns {string}
 */
export const truncate = (text, n = 80) => {
  if (!text) return "";
  const str = String(text);
  return str.length > n ? `${str.slice(0, n)}…` : str;
};

/**
 * Capitalise la première lettre, met le reste en minuscules
 * @param {string|null} str
 * @returns {string}
 */
export const capitalize = (str) => {
  if (!str) return "";
  const s = String(str);
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

/**
 * Met en titre chaque mot (ex: "gestion des compétences" → "Gestion Des Compétences")
 * @param {string|null} str
 * @returns {string}
 */
export const toTitleCase = (str) => {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Normalise une chaîne pour la recherche : minuscules + suppression des accents
 * @param {string|null} str
 * @returns {string}
 */
export const normalizeForSearch = (str) => {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// ── Nombres ───────────────────────────────────────────────────────────────────

/**
 * Formate un nombre avec séparateur de milliers (ex: 1 234 567)
 * @param {number|null} value
 * @returns {string}
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString("fr-FR");
};

/**
 * Formate un pourcentage (ex: 0.856 → "85,6 %")
 * @param {number|null} value   Valeur entre 0 et 1
 * @param {number}      digits  Nombre de décimales
 * @returns {string}
 */
export const formatPercent = (value, digits = 1) => {
  if (value === null || value === undefined) return "—";
  return `${(Number(value) * 100).toFixed(digits).replace(".", ",")} %`;
};

// ── Codes / Labels ────────────────────────────────────────────────────────────

/**
 * Formate un code en majuscules avec tirets (ex: "inf 01" → "INF-01")
 * @param {string|null} code
 * @returns {string}
 */
export const formatCode = (code) => {
  if (!code) return "";
  return String(code).toUpperCase().replace(/\s+/g, "-");
};

/**
 * Retourne le label d'un NiveauMaitrise (ex: "N3_INTERMEDIAIRE" → "N3 — Intermédiaire")
 * @param {string|null} niveau
 * @returns {string}
 */
export const formatNiveauMaitrise = (niveau) => {
  const labels = {
    N1_DEBUTANT:       "N1 — Débutant",
    N2_ELEMENTAIRE:    "N2 — Élémentaire",
    N3_INTERMEDIAIRE:  "N3 — Intermédiaire",
    N4_AVANCE:         "N4 — Avancé",
    N5_EXPERT:         "N5 — Expert",
  };
  return labels[niveau] ?? niveau ?? "—";
};

/**
 * Retourne le label d'un TypeSavoir (ex: "THEORIQUE" → "Théorique")
 * @param {string|null} type
 * @returns {string}
 */
export const formatTypeSavoir = (type) => {
  const labels = {
    THEORIQUE: "Théorique",
    PRATIQUE:  "Pratique",
  };
  return labels[type] ?? type ?? "—";
};
