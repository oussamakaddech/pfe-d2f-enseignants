/**
 * validators.js — Utilitaires de validation — D2F Webapp
 * Conformité DSI §1.3 : Modularité et Réutilisabilité
 *
 * Fournit des règles de validation réutilisables compatibles Ant Design Form
 * ainsi que des fonctions de validation pures utilisables partout.
 */

// =============================================================================
// FONCTIONS DE VALIDATION PURES
// =============================================================================

/**
 * Vérifie qu'une valeur n'est pas vide (null, undefined, chaîne vide ou espaces).
 * @param {*} value
 * @returns {boolean}
 */
export const isNotEmpty = (value) =>
  value !== null && value !== undefined && String(value).trim().length > 0;

/**
 * Vérifie le format d'une adresse email.
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? "");

/**
 * Vérifie la longueur minimale d'une chaîne.
 * @param {string} value
 * @param {number} min
 * @returns {boolean}
 */
export const minLength = (value, min) =>
  String(value ?? "").trim().length >= min;

/**
 * Vérifie la longueur maximale d'une chaîne.
 * @param {string} value
 * @param {number} max
 * @returns {boolean}
 */
export const maxLength = (value, max) =>
  String(value ?? "").trim().length <= max;

/**
 * Vérifie qu'une valeur est un nombre positif.
 * @param {*} value
 * @returns {boolean}
 */
export const isPositiveNumber = (value) =>
  !isNaN(value) && Number(value) > 0;

/**
 * Vérifie qu'une valeur est un entier positif ou nul.
 * @param {*} value
 * @returns {boolean}
 */
export const isNonNegativeInteger = (value) =>
  Number.isInteger(Number(value)) && Number(value) >= 0;

/**
 * Vérifie qu'un code respecte le format attendu (lettres, chiffres, tirets).
 * Ex : "INF-01", "GC-SC-02"
 * @param {string} code
 * @returns {boolean}
 */
export const isValidCode = (code) =>
  /^[A-Za-z0-9_-]{1,50}$/.test(code ?? "");

// =============================================================================
// RÈGLES ANT DESIGN — utilisables directement dans Form.Item rules={[...]}
// =============================================================================

/**
 * Règle : champ obligatoire.
 * @param {string} [message]
 * @returns {import('antd/es/form').Rule}
 */
export const requiredRule = (message = "Ce champ est obligatoire") => ({
  required: true,
  message,
});

/**
 * Règle : email valide.
 * @param {string} [message]
 * @returns {import('antd/es/form').Rule}
 */
export const emailRule = (message = "Adresse email invalide") => ({
  type: "email",
  message,
});

/**
 * Règle : longueur minimale.
 * @param {number} min
 * @param {string} [message]
 * @returns {import('antd/es/form').Rule}
 */
export const minLengthRule = (min, message) => ({
  min,
  message: message ?? `Minimum ${min} caractère(s) requis`,
});

/**
 * Règle : longueur maximale.
 * @param {number} max
 * @param {string} [message]
 * @returns {import('antd/es/form').Rule}
 */
export const maxLengthRule = (max, message) => ({
  max,
  message: message ?? `Maximum ${max} caractère(s) autorisés`,
});

/**
 * Règle : nombre positif.
 * @param {string} [message]
 * @returns {import('antd/es/form').Rule}
 */
export const positiveNumberRule = (message = "La valeur doit être un nombre positif") => ({
  validator(_, value) {
    if (!value || isPositiveNumber(value)) return Promise.resolve();
    return Promise.reject(new Error(message));
  },
});

/**
 * Règle : format de code valide (lettres, chiffres, tirets, underscores).
 * @param {string} [message]
 * @returns {import('antd/es/form').Rule}
 */
export const codeFormatRule = (message = "Format invalide (lettres, chiffres, tirets uniquement)") => ({
  validator(_, value) {
    if (!value || isValidCode(value)) return Promise.resolve();
    return Promise.reject(new Error(message));
  },
});

/**
 * Règle : valeur comprise entre min et max (inclus).
 * @param {number} min
 * @param {number} max
 * @param {string} [message]
 * @returns {import('antd/es/form').Rule}
 */
export const rangeRule = (min, max, message) => ({
  validator(_, value) {
    const num = Number(value);
    if (!value || (num >= min && num <= max)) return Promise.resolve();
    return Promise.reject(
      new Error(message ?? `La valeur doit être comprise entre ${min} et ${max}`)
    );
  },
});

/**
 * Règle : pas d'espaces en début/fin.
 * @param {string} [message]
 * @returns {import('antd/es/form').Rule}
 */
export const noLeadingTrailingSpacesRule = (
  message = "Pas d'espaces en début ou en fin de chaîne"
) => ({
  validator(_, value) {
    if (!value || value === value.trim()) return Promise.resolve();
    return Promise.reject(new Error(message));
  },
});

/**
 * Règle : confirmation de mot de passe (valeur identique à un autre champ).
 * @param {Function} getFieldValue — fourni par Form instance
 * @param {string} fieldName — nom du champ à comparer
 * @param {string} [message]
 * @returns {import('antd/es/form').Rule}
 */
export const confirmPasswordRule = (
  getFieldValue,
  fieldName = "password",
  message = "Les mots de passe ne correspondent pas"
) => ({
  validator(_, value) {
    if (!value || getFieldValue(fieldName) === value) return Promise.resolve();
    return Promise.reject(new Error(message));
  },
});

// =============================================================================
// COMBINAISONS PRÊTES À L'EMPLOI
// =============================================================================

/**
 * Règles standard pour un champ "nom" (obligatoire, 2–100 chars, pas d'espaces parasites).
 * @param {string} [label="Ce champ"]
 * @returns {import('antd/es/form').Rule[]}
 */
export const nomRules = (label = "Ce champ") => [
  requiredRule(`${label} est obligatoire`),
  minLengthRule(2, `${label} doit contenir au moins 2 caractères`),
  maxLengthRule(100, `${label} ne peut pas dépasser 100 caractères`),
  noLeadingTrailingSpacesRule(),
];

/**
 * Règles standard pour un champ "code" (obligatoire + format alphanumérique).
 * @returns {import('antd/es/form').Rule[]}
 */
export const codeRules = () => [
  requiredRule("Le code est obligatoire"),
  maxLengthRule(50, "Le code ne peut pas dépasser 50 caractères"),
  codeFormatRule(),
];

/**
 * Règles standard pour un champ "description" (optionnel, max 500 chars).
 * @returns {import('antd/es/form').Rule[]}
 */
export const descriptionRules = () => [
  maxLengthRule(500, "La description ne peut pas dépasser 500 caractères"),
];

/**
 * Règles standard pour un champ "email" (obligatoire + format).
 * @returns {import('antd/es/form').Rule[]}
 */
export const emailRules = () => [
  requiredRule("L'adresse email est obligatoire"),
  emailRule(),
];
