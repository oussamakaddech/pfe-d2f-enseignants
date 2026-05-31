import type { Rule } from 'antd/es/form';

/**
 * validators.ts — Utilitaires de validation — D2F Webapp
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
 */
export const isNotEmpty = (value: unknown): boolean =>
  value !== null && value !== undefined && String(value).trim().length > 0;

/**
 * Vérifie que la valeur est fournie et non vide.
 */
export const isRequired = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

/**
 * Vérifie le format d'une adresse email.
 */
export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? "");

/**
 * Vérifie la force d'un mot de passe (min 8 caractères, majuscule, minuscule, chiffre, caractère spécial).
 */
export const isStrongPassword = (pass: string): boolean => {
  if (!pass || pass.length < 8) return false;
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasDigit = /[0-9]/.test(pass);
  const hasSpecial = /[^A-Za-z0-9]/.test(pass);
  return hasUpper && hasLower && hasDigit && hasSpecial;
};

/**
 * Vérifie la validité d'un numéro de téléphone.
 */
export const isValidPhone = (phone: string): boolean => {
  if (!phone) return false;
  return /^\+?[0-9]{8,15}$/.test(phone);
};

/**
 * Vérifie la longueur minimale d'une chaîne.
 */
export const minLength = (value: unknown, min: number): boolean =>
  String(value ?? "").trim().length >= min;

/**
 * Vérifie la longueur maximale d'une chaîne.
 */
export const maxLength = (value: unknown, max: number): boolean =>
  String(value ?? "").trim().length <= max;

/**
 * Vérifie qu'une valeur est un nombre positif.
 */
export const isPositiveNumber = (value: unknown): boolean => {
  const num = Number(value);
  return !Number.isNaN(num) && num > 0;
};

/**
 * Vérifie qu'une valeur est un entier positif ou nul.
 */
export const isNonNegativeInteger = (value: unknown): boolean => {
  const num = Number(value);
  return Number.isInteger(num) && num >= 0;
};

/**
 * Vérifie la validité d'un objet Date.
 */
export const isValidDate = (date: unknown): boolean => {
  if (!(date instanceof Date)) return false;
  return !Number.isNaN(date.getTime());
};

/**
 * Vérifie la validité d'une URL.
 */
export const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Vérifie qu'un code respecte le format attendu (lettres, chiffres, tirets).
 * Ex : "INF-01", "GC-SC-02"
 */
export const isValidCode = (code: string): boolean =>
  /^[A-Za-z0-9_-]{1,50}$/.test(code ?? "");

// =============================================================================
// RÈGLES ANT DESIGN — utilisables directement dans Form.Item rules={[...]}
// =============================================================================

/**
 * Règle : champ obligatoire.
 */
export const requiredRule = (message = "Ce champ est obligatoire"): Rule => ({
  required: true,
  message,
});

/**
 * Règle : email valide.
 */
export const emailRule = (message = "Adresse email invalide"): Rule => ({
  type: "email",
  message,
});

/**
 * Règle : longueur minimale.
 */
export const minLengthRule = (min: number, message?: string): Rule => ({
  min,
  message: message ?? `Minimum ${min} caractère(s) requis`,
});

/**
 * Règle : longueur maximale.
 */
export const maxLengthRule = (max: number, message?: string): Rule => ({
  max,
  message: message ?? `Maximum ${max} caractère(s) autorisés`,
});

/**
 * Règle : nombre positif.
 */
export const positiveNumberRule = (message = "La valeur doit être un nombre positif"): Rule => ({
  validator(_, value) {
    if (!value || isPositiveNumber(value)) return Promise.resolve();
    return Promise.reject(new Error(message));
  },
});

/**
 * Règle : format de code valide (lettres, chiffres, tirets, underscores).
 */
export const codeFormatRule = (message = "Format invalide (lettres, chiffres, tirets uniquement)"): Rule => ({
  validator(_, value) {
    if (!value || isValidCode(value)) return Promise.resolve();
    return Promise.reject(new Error(message));
  },
});

/**
 * Règle : valeur comprise entre min et max (inclus).
 */
export const rangeRule = (min: number, max: number, message?: string): Rule => ({
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
 */
export const noLeadingTrailingSpacesRule = (
  message = "Pas d'espaces en début ou en fin de chaîne"
): Rule => ({
  validator(_, value) {
    if (!value || String(value) === String(value).trim()) return Promise.resolve();
    return Promise.reject(new Error(message));
  },
});

/**
 * Règle : confirmation de mot de passe (valeur identique à un autre champ).
 */
export const confirmPasswordRule = (
  getFieldValue: (fieldName: string) => unknown,
  fieldName = "password",
  message = "Les mots de passe ne correspondent pas"
): Rule => ({
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
 */
export const nomRules = (label = "Ce champ"): Rule[] => [
  requiredRule(`${label} est obligatoire`),
  minLengthRule(2, `${label} doit contenir au moins 2 caractères`),
  maxLengthRule(100, `${label} ne peut pas dépasser 100 caractères`),
  noLeadingTrailingSpacesRule(),
];

/**
 * Règles standard pour un champ "code" (obligatoire + format alphanumérique).
 */
export const codeRules = (): Rule[] => [
  requiredRule("Le code est obligatoire"),
  maxLengthRule(50, "Le code ne peut pas dépasser 50 caractères"),
  codeFormatRule(),
];

/**
 * Règles standard pour un champ "description" (optionnel, max 500 chars).
 */
export const descriptionRules = (): Rule[] => [
  maxLengthRule(500, "La description ne peut pas dépasser 500 caractères"),
];

/**
 * Règles standard pour un champ "email" (obligatoire + format).
 */
export const emailRules = (): Rule[] => [
  requiredRule("L'adresse email est obligatoire"),
  emailRule(),
];
