/**
 * D2F Design Tokens — source unique de vérité pour les composants TypeScript.
 * Reflète les CSS custom properties de index.css.
 * Utiliser ces constantes dans les composants .tsx plutôt que des valeurs hardcodées.
 */

// ── Brand ───────────────────────────────────────────────────────────────────
export const brand = {
  50:  "#fff0ee",
  100: "#ffddd9",
  200: "#ffb3ab",
  500: "#B51200",  // couleur principale
  600: "#9a0f00",  // hover
  700: "#7a0000",  // pressed
  900: "#3d0000",
} as const;

// ── Neutrals ─────────────────────────────────────────────────────────────────
export const neutral = {
  0:   "#ffffff",
  50:  "#f7fafc",
  100: "#f0f4f8",
  200: "#e2e8f0",
  300: "#cbd5e0",
  400: "#a0aec0",
  500: "#718096",
  600: "#5a6373",
  700: "#4a5568",
  800: "#2d3748",
  900: "#1a202c",
} as const;

// ── Semantic ─────────────────────────────────────────────────────────────────
export const semantic = {
  success:       "#10b981",
  successBg:     "#ecfdf5",
  successBorder: "#a7f3d0",
  warning:       "#f59e0b",
  warningBg:     "#fffbeb",
  warningBorder: "#fde68a",
  error:         "#ef4444",
  errorBg:       "#fef2f2",
  errorBorder:   "#fecaca",
  info:          "#3b82f6",
  infoBg:        "#eff6ff",
  infoBorder:    "#bfdbfe",
} as const;

// ── Statuts de formation ──────────────────────────────────────────────────────
export type FormationStatus = "ENREGISTRE" | "PLANIFIE" | "EN_COURS" | "ACHEVE" | "ANNULE";

export const statusColors: Record<FormationStatus, { color: string; bg: string; label: string }> = {
  ENREGISTRE: { color: "#6b7280", bg: "#f9fafb",        label: "Enregistré"  },
  PLANIFIE:   { color: semantic.info,    bg: semantic.infoBg,    label: "Planifié"    },
  EN_COURS:   { color: semantic.warning, bg: semantic.warningBg, label: "En cours"    },
  ACHEVE:     { color: semantic.success, bg: semantic.successBg, label: "Achevé"      },
  ANNULE:     { color: semantic.error,   bg: semantic.errorBg,   label: "Annulé"      },
};

// ── Rôles utilisateur ─────────────────────────────────────────────────────────
export type UserRole =
  | "admin" | "ADMIN"
  | "cup"   | "CUP"
  | "enseignant" | "ENSEIGNANT"
  | "animateur"  | "ANIMATEUR"
  | "formateur"  | "FORMATEUR"
  | "chefdepartement" | "CHEF_DEPARTEMENT";

export const roleColors: Record<string, { color: string; bg: string; label: string }> = {
  admin:              { color: "#7c3aed", bg: "#f5f3ff", label: "Administrateur"   },
  ADMIN:              { color: "#7c3aed", bg: "#f5f3ff", label: "Administrateur"   },
  cup:                { color: brand[500], bg: brand[50], label: "CUP"             },
  CUP:                { color: brand[500], bg: brand[50], label: "CUP"             },
  enseignant:         { color: "#2563eb", bg: "#eff6ff", label: "Enseignant"       },
  ENSEIGNANT:         { color: "#2563eb", bg: "#eff6ff", label: "Enseignant"       },
  animateur:          { color: "#059669", bg: "#ecfdf5", label: "Animateur"        },
  ANIMATEUR:          { color: "#059669", bg: "#ecfdf5", label: "Animateur"        },
  formateur:          { color: "#d97706", bg: "#fffbeb", label: "Formateur"        },
  FORMATEUR:          { color: "#d97706", bg: "#fffbeb", label: "Formateur"        },
  chefdepartement:    { color: "#0891b2", bg: "#ecfeff", label: "Chef de Dépt."    },
  CHEF_DEPARTEMENT:   { color: "#0891b2", bg: "#ecfeff", label: "Chef de Dépt."    },
  responsabledossier: { color: "#6366f1", bg: "#eef2ff", label: "Resp. Dossier"    },
};

// ── Spacing ───────────────────────────────────────────────────────────────────
export const space = {
  1:  4,  2:  8,  3:  12, 4:  16,
  5:  20, 6:  24, 8:  32, 10: 40,
  12: 48, 16: 64,
} as const;

// ── Border radius ─────────────────────────────────────────────────────────────
export const radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 9999,
} as const;

// ── Shadows ───────────────────────────────────────────────────────────────────
export const shadow = {
  xs: "0 1px 2px rgba(0,0,0,0.05)",
  sm: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)",
  md: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)",
  lg: "0 10px 30px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)",
} as const;

// ── Ant Design ConfigProvider theme ──────────────────────────────────────────
export const antdThemeToken = {
  colorPrimary:      brand[500],
  colorPrimaryHover: brand[600],
  colorError:        semantic.error,
  colorWarning:      semantic.warning,
  colorSuccess:      semantic.success,
  colorInfo:         semantic.info,
  colorTextBase:     neutral[800],
  colorTextSecondary: neutral[600],
  colorBgContainer:  neutral[0],
  colorBgLayout:     neutral[50],
  colorBorder:       "rgba(0,0,0,0.10)",

  borderRadius:   radius.sm,
  borderRadiusLG: radius.md,
  borderRadiusSM: radius.xs,

  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize:   14,

  boxShadow:          shadow.sm,
  boxShadowSecondary: shadow.md,

  motion: true,
  motionDurationMid:  "0.18s",
  motionDurationSlow: "0.28s",
} as const;

export const antdComponentTokens = {
  Card: {
    borderRadiusLG:    radius.lg,
    boxShadowTertiary: shadow.sm,
    paddingLG:         24,
  },
  Button: {
    borderRadius:      radius.sm,
    fontWeight:        500,
    paddingInline:     16,
    controlHeight:     36,
    controlHeightLG:   42,
  },
  Table: {
    borderRadius:      radius.md,
    headerBg:          neutral[100],
    headerColor:       neutral[700],
    rowHoverBg:        brand[50],
    cellPaddingBlock:  10,
    cellPaddingInline: 14,
  },
  Menu: {
    borderRadius:       radius.sm,
    itemHeight:         44,
    subMenuItemBg:      neutral[50],
    itemActiveBg:       brand[50],
    itemSelectedBg:     brand[500],
    itemSelectedColor:  neutral[0],
  },
  Input: {
    borderRadius:       radius.sm,
    colorBgContainer:   neutral[0],
    paddingBlock:       7,
  },
  Select: {
    borderRadius:       radius.sm,
  },
  Modal: {
    borderRadiusLG:     radius.lg,
    titleFontSize:      16,
    titleLineHeight:    1.4,
  },
  Drawer: {
    borderRadiusLG:     radius.lg,
  },
  Tag: {
    borderRadius:       radius.full,
    fontSizeSM:         12,
  },
  Alert: {
    borderRadius:       radius.md,
  },
  Steps: {
    iconSize:           32,
    titleLineHeight:    1.4,
  },
  Badge: {
    borderRadius:       radius.full,
  },
  Tabs: {
    borderRadius:       radius.sm,
    inkBarColor:        brand[500],
    itemActiveColor:    brand[500],
    itemSelectedColor:  brand[500],
  },
  Pagination: {
    borderRadius:       radius.sm,
  },
  Tooltip: {
    borderRadius:       radius.sm,
    colorBgDefault:     neutral[900],
  },
} as const;
