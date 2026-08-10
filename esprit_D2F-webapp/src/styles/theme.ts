/**
 * D2F Theme — miroir TypeScript de src/styles/tokens.css.
 *
 * À utiliser quand une valeur de token est nécessaire côté TS (charts,
 * canvas, calculs) — pour le style des composants, préférer les CSS
 * custom properties (`var(--color-primary)` etc.).
 *
 * Les échelles complètes (brand, neutral, semantic, statuts, rôles) ainsi
 * que la config Ant Design vivent dans `@/styles/themes/tokens`.
 */
import { brand, accent, neutral, semantic } from '@/styles/themes/tokens';

export const colors = {
  primary: brand[500],
  primaryLight: '#e54a3d',
  primaryDark: brand[700],
  accent: accent[500],
  accentHover: accent[600],
  success: semantic.success,
  warning: semantic.warning,
  danger: semantic.error,
  info: semantic.info,

  bg: '#f8fafc',
  surface: neutral[0],
  surfaceAlt: '#f1f5f9',
  border: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
} as const;

/** Palette catégorielle pour les charts (datasets multiples). */
export const chartPalette = [
  colors.primary,
  colors.accent,
  colors.success,
  colors.warning,
  colors.info,
  '#7c3aed',
  colors.primaryLight,
  colors.danger,
] as const;

/** Breakpoints (px) — Mobile < sm | Tablet sm–md | Desktop > md. */
export const breakpoints = { sm: 640, md: 1024, lg: 1280 } as const;

export { brand, accent, neutral, semantic, space, radius, shadow } from '@/styles/themes/tokens';
