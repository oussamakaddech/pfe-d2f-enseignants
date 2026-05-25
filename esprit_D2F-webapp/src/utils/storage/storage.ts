/**
 * storage.js — Abstraction du localStorage — D2F Webapp
 * =============================================================================
 * Centralise toutes les clés localStorage pour éviter les fautes de frappe
 * dispersées dans le code et faciliter la maintenance.
 *
 * Conformité DSI §1.3 : Modularité et Réutilisabilité
 * Conformité DSI §1.4 : Organisation Structurée du Code (src/utils/)
 * =============================================================================
 */

// ── Clés centralisées ─────────────────────────────────────────────────────────
const KEYS = {
  AUTH_TOKEN: "authToken",
  USER_PROFILE: "userProfile",
  ACTIVE_ROLE: "activeRole",
  PREFERRED_LANG: "preferredLang",
};

// ── Token JWT — DEPRECATED ────────────────────────────────────────────────────
// JWT est maintenant stocké en HttpOnly cookie (withCredentials: true).
// Ces fonctions ne font rien et sont conservées uniquement pour éviter de
// casser d'éventuels imports existants. À supprimer lors du prochain refactor.

/** @deprecated JWT est en HttpOnly cookie. Retourne toujours null. */
export const getToken = (): null => null;

/** @deprecated JWT est positionné par le backend via Set-Cookie. */
export const setToken = (_token: string): void => { /* no-op */ };

/** @deprecated Utilisez AuthService.logout() pour invalider la session. */
export const removeToken = (): void => { /* no-op */ };

/** @deprecated JWT est en HttpOnly cookie, non accessible depuis JS. */
export const hasToken = (): false => false;

// ── Profil utilisateur ────────────────────────────────────────────────────────

/**
 * Récupère le profil utilisateur désérialisé.
 * @returns {object|null}
 */
export const getProfile = () => {
  const raw = localStorage.getItem(KEYS.USER_PROFILE);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Stocke le profil utilisateur sérialisé.
 * @param {object} profile
 */
export const setProfile = (profile: Record<string, unknown>): void =>
  localStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));

/**
 * Supprime le profil utilisateur.
 */
export const removeProfile = () => localStorage.removeItem(KEYS.USER_PROFILE);

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
 * Supprime toutes les données de session (logout complet).
 */
export const clearSession = () => {
  localStorage.removeItem(KEYS.USER_PROFILE);
  localStorage.removeItem(KEYS.ACTIVE_ROLE);
};

/**
 * Objet regroupant toutes les méthodes (API objet alternative).
 * Utile pour les injections de dépendances ou les tests.
 */
export const storage = {
  getToken,
  setToken,
  removeToken,
  hasToken,
  getProfile,
  setProfile,
  removeProfile,
  getActiveRole,
  setActiveRole,
  removeActiveRole,
  getPreferredLang,
  setPreferredLang,
  clearSession,
};

export default storage;




