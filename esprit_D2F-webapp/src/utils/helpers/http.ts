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
function extractMessageFromData(data: unknown): string | null {
  if (typeof data === "string") { const t = data.trim(); return t.length > 0 ? t : null; }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.message === "string") { const t = obj.message.trim(); if (t.length > 0) return t; }
    if (typeof obj.error === "string") { const t = obj.error.trim(); if (t.length > 0) return t; }
  }
  return null;
}

export const extractErrorMessage = (
  error: unknown,
  fallback = "Une erreur est survenue. Veuillez réessayer."
) => {
  if (!error) return fallback;

  const errorObj = error as { response?: { data?: unknown }; message?: string } | null | undefined;
  const msg = extractMessageFromData(errorObj?.response?.data);
  if (msg) return msg;

  if (errorObj && typeof errorObj.message === "string") {
    const t = errorObj.message.trim();
    if (t.length > 0) return t;
  }

  return fallback;
};

/**
 * Extrait le code HTTP d'une erreur Axios.
 *
 * @param {unknown} error
 * @returns {number|null}
 */
export const extractStatusCode = (error: unknown): number | null =>
  (error as { response?: { status?: number } })?.response?.status ?? null;

/**
 * Vérifie si l'erreur correspond à un code HTTP 401 (non authentifié).
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export const isUnauthorized = (error: unknown): boolean => extractStatusCode(error) === 401;

/**
 * Vérifie si l'erreur correspond à un code HTTP 403 (interdit).
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export const isForbidden = (error: unknown): boolean => extractStatusCode(error) === 403;

/**
 * Vérifie si l'erreur correspond à un code HTTP 404 (non trouvé).
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export const isNotFound = (error: unknown): boolean => extractStatusCode(error) === 404;

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
export const extractPageData = (pageResponse: unknown): { content: unknown[]; totalElements: number; totalPages: number; currentPage: number; pageSize: number; isFirst: boolean; isLast: boolean } => {
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

  const pageObj = pageResponse as Record<string, unknown>;

  return {
    content: (pageObj.content as unknown[]) ?? [],
    totalElements: (pageObj.totalElements as number) ?? 0,
    totalPages: (pageObj.totalPages as number) ?? 0,
    currentPage: (pageObj.number as number) ?? 0,
    pageSize: (pageObj.size as number) ?? 20,
    isFirst: (pageObj.first as boolean) ?? true,
    isLast: (pageObj.last as boolean) ?? true,
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
export const buildQueryString = (params: Record<string, unknown> = {}): string => {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => [k, String(v)]);
  return new URLSearchParams(entries).toString();
};




