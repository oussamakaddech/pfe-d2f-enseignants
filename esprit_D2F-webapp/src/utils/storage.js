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

// ── Token JWT ─────────────────────────────────────────────────────────────────

/**
 * Récupère le token JWT stocké.
 * @returns {string|null}
 */
export const getToken = () => localStorage.getItem(KEYS.AUTH_TOKEN);

/**
 * Stocke le token JWT.
 * @param {string} token
 */
export const setToken = (token) => localStorage.setItem(KEYS.AUTH_TOKEN, token);

/**
 * Supprime le token JWT.
 */
export const removeToken = () => localStorage.removeItem(KEYS.AUTH_TOKEN);

/**
 * Vérifie si un token JWT est présent.
 * @returns {boolean}
 */
export const hasToken = () => !!localStorage.getItem(KEYS.AUTH_TOKEN);

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
export const setProfile = (profile) =>
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
export const setActiveRole = (role) =>
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
export const setPreferredLang = (lang) =>
  localStorage.setItem(KEYS.PREFERRED_LANG, lang);

// ── Utilitaires globaux ───────────────────────────────────────────────────────

/**
 * Supprime toutes les données de session (logout complet).
 */
export const clearSession = () => {
  localStorage.removeItem(KEYS.AUTH_TOKEN);
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
