/**
 * utils/index.js — Point d'entrée centralisé des utilitaires D2F Webapp
 * =============================================================================
 * Barrel export : importer depuis "@/utils" ou "../utils" au lieu de cibler
 * chaque fichier individuellement.
 *
 * Conformité DSI §1.3 : Modularité et Réutilisabilité
 * Conformité DSI §1.4 : Organisation Structurée du Code
 *
 * Usage :
 *   import { formatDate, requiredRule, authHeader } from "../utils";
 * =============================================================================
 */

// ── Formatage ─────────────────────────────────────────────────────────────────
export {
  formatDate,
  formatDateTime,
  formatDateShort,
  formatRelativeTime,
  truncate,
  capitalize,
  toTitleCase,
  normalizeForSearch,
  formatNumber,
  formatPercent,
  formatCode,
  formatNiveauMaitrise,
  formatTypeSavoir,
} from "./formatters";

// ── Validation ────────────────────────────────────────────────────────────────
export {
  // Fonctions pures
  isNotEmpty,
  isValidEmail,
  minLength,
  maxLength,
  isPositiveNumber,
  isNonNegativeInteger,
  isValidCode,
  // Règles Ant Design
  requiredRule,
  emailRule,
  minLengthRule,
  maxLengthRule,
  positiveNumberRule,
  codeFormatRule,
  rangeRule,
  noLeadingTrailingSpacesRule,
  confirmPasswordRule,
  // Combinaisons prêtes à l'emploi
  nomRules,
  codeRules,
  descriptionRules,
  emailRules,
} from "./validators";

// ── Stockage local ────────────────────────────────────────────────────────────
export {
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
  storage,
} from "./storage";

// ── HTTP / Axios ──────────────────────────────────────────────────────────────
export {
  extractErrorMessage,
  extractStatusCode,
  isUnauthorized,
  isForbidden,
  isNotFound,
  authHeader,
  jsonAuthHeaders,
  paginationParams,
  extractPageData,
  buildQueryString,
} from "./http";
