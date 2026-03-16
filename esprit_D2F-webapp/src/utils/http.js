/**
 * http.js — Utilitaires HTTP — D2F Webapp
 * Conformité DSI §1.3 : Modularité et Réutilisabilité
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralise les helpers liés aux appels HTTP/Axios :
 *   - Extraction de messages d'erreur depuis les réponses Axios
 *   - Construction des headers Authorization JWT
 *   - Construction des paramètres de pagination standards
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Extrait le message d'erreur lisible depuis une erreur Axios.
 *
 * Priorité de résolution :
 *   1. response.data.message  (erreur métier Spring Boot)
 *   2. response.data.error    (erreur standard Spring)
 *   3. response.data (si string)
 *   4. error.message          (erreur réseau / JS)
 *   5. fallback fourni en paramètre
 *
 * @param {unknown} error    - L'erreur capturée dans un catch
 * @param {string}  fallback - Message par défaut si rien n'est résolu
 * @returns {string}
 */
export const extractErrorMessage = (
  error,
  fallback = "Une erreur est survenue. Veuillez réessayer."
) => {
  if (!error) return fallback;

  const data = error?.response?.data;

  if (data) {
    if (typeof data === "string" && data.trim().length > 0) return data.trim();
    if (typeof data.message === "string" && data.message.trim().length > 0)
      return data.message.trim();
    if (typeof data.error === "string" && data.error.trim().length > 0)
      return data.error.trim();
  }

  if (typeof error.message === "string" && error.message.trim().length > 0)
    return error.message.trim();

  return fallback;
};

/**
 * Extrait le code HTTP d'une erreur Axios.
 *
 * @param {unknown} error
 * @returns {number|null}
 */
export const extractStatusCode = (error) => error?.response?.status ?? null;

/**
 * Vérifie si l'erreur correspond à un code HTTP 401 (non authentifié).
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export const isUnauthorized = (error) => extractStatusCode(error) === 401;

/**
 * Vérifie si l'erreur correspond à un code HTTP 403 (interdit).
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export const isForbidden = (error) => extractStatusCode(error) === 403;

/**
 * Vérifie si l'erreur correspond à un code HTTP 404 (non trouvé).
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export const isNotFound = (error) => extractStatusCode(error) === 404;

// ─────────────────────────────────────────────────────────────────────────────
// Headers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit l'objet headers avec le token JWT Bearer extrait du localStorage.
 * Retourne un objet vide si aucun token n'est présent.
 *
 * @returns {Record<string, string>}
 *
 * @example
 * axios.get("/api/v1/domaines", { headers: authHeader() });
 */
export const authHeader = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Construit les headers complets pour une requête JSON authentifiée.
 *
 * @returns {Record<string, string>}
 */
export const jsonAuthHeaders = () => ({
  "Content-Type": "application/json",
  ...authHeader(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit les paramètres de pagination conformes à l'API Spring Boot Pageable.
 *
 * Conformité DSI §2.2 : Pagination obligatoire sur les listes volumineuses.
 * Paramètres standards : page (0-based), size, sort.
 *
 * @param {object} options
 * @param {number} [options.page=0]   - Numéro de page (0-based)
 * @param {number} [options.size=20]  - Nombre d'éléments par page
 * @param {string} [options.sort=""]  - Tri ex: "nom,asc" ou "createdAt,desc"
 * @returns {Record<string, string|number>}
 *
 * @example
 * axios.get("/api/v1/competences", {
 *   params: paginationParams({ page: 0, size: 10, sort: "nom,asc" }),
 *   headers: authHeader(),
 * });
 */
export const paginationParams = ({ page = 0, size = 20, sort = "" } = {}) => ({
  page,
  size,
  ...(sort ? { sort } : {}),
});

/**
 * Extrait les métadonnées de pagination depuis une réponse Spring Boot Page<T>.
 *
 * @param {object} pageResponse - Objet Page<T> retourné par Spring Boot
 * @returns {{
 *   content: Array,
 *   totalElements: number,
 *   totalPages: number,
 *   currentPage: number,
 *   pageSize: number,
 *   isFirst: boolean,
 *   isLast: boolean,
 * }}
 */
export const extractPageData = (pageResponse) => {
  if (!pageResponse || typeof pageResponse !== "object") {
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      currentPage: 0,
      pageSize: 20,
      isFirst: true,
      isLast: true,
    };
  }

  return {
    content: pageResponse.content ?? [],
    totalElements: pageResponse.totalElements ?? 0,
    totalPages: pageResponse.totalPages ?? 0,
    currentPage: pageResponse.number ?? 0,
    pageSize: pageResponse.size ?? 20,
    isFirst: pageResponse.first ?? true,
    isLast: pageResponse.last ?? true,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers divers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit une query string à partir d'un objet de paramètres,
 * en ignorant les valeurs null, undefined et chaînes vides.
 *
 * @param {Record<string, unknown>} params
 * @returns {string} - Ex: "page=0&size=20&sort=nom%2Casc"
 */
export const buildQueryString = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );
  return new URLSearchParams(entries).toString();
};
