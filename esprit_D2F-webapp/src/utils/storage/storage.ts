/**
 * storage.ts — Abstraction du localStorage — D2F Webapp
 * =============================================================================
 * Centralise les clés localStorage non sensibles (rôle actif, langue).
 *
 * SÉCURITÉ : le profil utilisateur (PII) N'EST PAS stocké ici. La source unique
 * de l'identité de session est `AuthContext` (sessionStorage "d2f_user"), et le
 * JWT reste dans un cookie HttpOnly. Ne jamais réintroduire de stockage de PII
 * en clair dans localStorage.
 *
 * Conformité DSI §1.3 : Modularité et Réutilisabilité
 * Conformité DSI §1.4 : Organisation Structurée du Code (src/utils/)
 * =============================================================================
 */

// ── Clés centralisées ─────────────────────────────────────────────────────────
const KEYS = {
  ACTIVE_ROLE: "activeRole",
  PREFERRED_LANG: "preferredLang",
};

// ── Rôle actif ────────────────────────────────────────────────────────────────

/**
 * Récupère le rôle actif de l'utilisateur.
 * @returns {string|null}
 */
export const getActiveRole = () => localStorage.getItem(KEYS.ACTIVE_ROLE);

/**
 * Stocke le rôle actif.
 * @param {string} role
 */
export const setActiveRole = (role: string): void =>
  localStorage.setItem(KEYS.ACTIVE_ROLE, role);

/**
 * Supprime le rôle actif.
 */
export const removeActiveRole = () => localStorage.removeItem(KEYS.ACTIVE_ROLE);

// ── Langue préférée ───────────────────────────────────────────────────────────

/**
 * Récupère la langue préférée de l'utilisateur.
 * @returns {string} code langue (ex: "fr", "en"), "fr" par défaut
 */
export const getPreferredLang = () =>
  localStorage.getItem(KEYS.PREFERRED_LANG) ?? "fr";

/**
 * Stocke la langue préférée.
 * @param {string} lang
 */
export const setPreferredLang = (lang: string): void =>
  localStorage.setItem(KEYS.PREFERRED_LANG, lang);

// ── Utilitaires globaux ───────────────────────────────────────────────────────

/**
 * Supprime les données de session non sensibles (rôle actif).
 * Le profil/JWT est géré par AuthContext + cookie HttpOnly.
 */
export const clearSession = () => {
  localStorage.removeItem(KEYS.ACTIVE_ROLE);
};

/**
 * Objet regroupant toutes les méthodes (API objet alternative).
 * Utile pour les injections de dépendances ou les tests.
 */
export const storage = {
  getActiveRole,
  setActiveRole,
  removeActiveRole,
  getPreferredLang,
  setPreferredLang,
  clearSession,
};

export default storage;




