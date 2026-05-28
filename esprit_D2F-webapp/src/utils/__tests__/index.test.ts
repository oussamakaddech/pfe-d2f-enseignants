import { describe, expect, it } from 'vitest';
import {
  formatDate, formatDateTime, formatDateShort, formatRelativeTime,
  truncate, capitalize, toTitleCase, normalizeForSearch,
  formatNumber, formatPercent, formatCode, formatNiveauMaitrise, formatTypeSavoir,
  isNotEmpty, isValidEmail, minLength, maxLength,
  isPositiveNumber, isNonNegativeInteger, isValidCode,
  requiredRule, emailRule, minLengthRule, maxLengthRule,
  positiveNumberRule, codeFormatRule, rangeRule,
  noLeadingTrailingSpacesRule, confirmPasswordRule,
  nomRules, codeRules, descriptionRules, emailRules,
  getActiveRole, setActiveRole, removeActiveRole,
  getPreferredLang, setPreferredLang, clearSession, storage,
  extractErrorMessage, extractStatusCode,
  isUnauthorized, isForbidden, isNotFound,
  paginationParams, extractPageData, buildQueryString,
} from '../index';

describe('utils barrel index', () => {
  it('re-exports all formatters', () => {
    expect(formatDate).toBeDefined();
    expect(formatDateTime).toBeDefined();
    expect(formatDateShort).toBeDefined();
    expect(formatRelativeTime).toBeDefined();
    expect(truncate).toBeDefined();
    expect(capitalize).toBeDefined();
    expect(toTitleCase).toBeDefined();
    expect(normalizeForSearch).toBeDefined();
    expect(formatNumber).toBeDefined();
    expect(formatPercent).toBeDefined();
    expect(formatCode).toBeDefined();
    expect(formatNiveauMaitrise).toBeDefined();
    expect(formatTypeSavoir).toBeDefined();
  });

  it('re-exports all validators', () => {
    expect(isNotEmpty).toBeDefined();
    expect(isValidEmail).toBeDefined();
    expect(minLength).toBeDefined();
    expect(maxLength).toBeDefined();
    expect(isPositiveNumber).toBeDefined();
    expect(isNonNegativeInteger).toBeDefined();
    expect(isValidCode).toBeDefined();
    expect(requiredRule).toBeDefined();
    expect(emailRule).toBeDefined();
    expect(minLengthRule).toBeDefined();
    expect(maxLengthRule).toBeDefined();
    expect(positiveNumberRule).toBeDefined();
    expect(codeFormatRule).toBeDefined();
    expect(rangeRule).toBeDefined();
    expect(noLeadingTrailingSpacesRule).toBeDefined();
    expect(confirmPasswordRule).toBeDefined();
    expect(nomRules).toBeDefined();
    expect(codeRules).toBeDefined();
    expect(descriptionRules).toBeDefined();
    expect(emailRules).toBeDefined();
  });

  it('re-exports all storage functions', () => {
    expect(getActiveRole).toBeDefined();
    expect(setActiveRole).toBeDefined();
    expect(removeActiveRole).toBeDefined();
    expect(getPreferredLang).toBeDefined();
    expect(setPreferredLang).toBeDefined();
    expect(clearSession).toBeDefined();
    expect(storage).toBeDefined();
  });

  it('re-exports all http functions', () => {
    expect(extractErrorMessage).toBeDefined();
    expect(extractStatusCode).toBeDefined();
    expect(isUnauthorized).toBeDefined();
    expect(isForbidden).toBeDefined();
    expect(isNotFound).toBeDefined();
    expect(paginationParams).toBeDefined();
    expect(extractPageData).toBeDefined();
    expect(buildQueryString).toBeDefined();
  });
});




