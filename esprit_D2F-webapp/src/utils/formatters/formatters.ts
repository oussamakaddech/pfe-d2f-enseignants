/**
 * formatters.ts — Utilitaires de formatage — D2F Webapp
 * Conformité DSI §1.3 : Modularité et Réutilisabilité
 * ─────────────────────────────────────────────────────
 * Centralise toutes les fonctions de formatage pour éviter
 * la duplication de logique dans les composants.
 */

// ── Dates ─────────────────────────────────────────────────────────────────────

/**
 * Formate une date ISO en format lisible fr-FR (ex: "12 janv. 2025")
 */
export const formatDate = (value: string | Date | null | undefined, format?: string): string => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  
  if (format === "DD/MM/YYYY") {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  if (format === "YYYY-MM-DD") {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  }

  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * Formate une date ISO avec heure (ex: "12 janv. 2025, 14:30")
 */
export const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Formate une date ISO en format court (ex: "12/01/2025")
 */
export const formatDateShort = (value: string | Date | null | undefined): string => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR");
};

/**
 * Retourne le temps relatif depuis une date (ex: "il y a 3 jours")
 */
export const formatRelativeTime = (value: string | Date | null | undefined): string => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffH   = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffH / 24);

  if (diffSec < 60)  return "À l'instant";
  if (diffMin < 60)  return `Il y a ${diffMin} min`;
  if (diffH < 24)    return `Il y a ${diffH}h`;
  if (diffDay < 30)  return `Il y a ${diffDay} jour${diffDay > 1 ? "s" : ""}`;
  return formatDate(d);
};

// ── Texte ─────────────────────────────────────────────────────────────────────

/**
 * Tronque un texte à n caractères et ajoute "…"
 */
export const truncate = (text: string | null | undefined, n = 80): string => {
  if (!text) return "";
  const str = String(text);
  return str.length > n ? `${str.slice(0, n)}…` : str;
};

/**
 * Capitalise la première lettre, met le reste en minuscules
 */
export const capitalize = (str: string | null | undefined): string => {
  if (!str) return "";
  const s = String(str);
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

/**
 * Met en titre chaque mot (ex: "gestion des compétences" → "Gestion Des Compétences")
 */
export const toTitleCase = (str: string | null | undefined): string => {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Convertit une chaîne en kebab-case
 */
export const toKebabCase = (str: string | null | undefined): string => {
  if (!str) return "";
  return String(str)
    .replaceAll(/([a-z])([A-Z])/g, "$1-$2")
    .replaceAll(/[\s_]+/g, "-")
    .toLowerCase();
};

/**
 * Convertit une chaîne en camelCase
 */
export const toCamelCase = (str: string | null | undefined): string => {
  if (!str) return "";
  const s = String(str)
    .replaceAll(/[-_]+/g, " ")
    .replaceAll(/[^\w\s]/g, "");
  return s
    .split(" ")
    .map((word, index) => {
      if (index === 0) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
};

/**
 * Normalise une chaîne pour la recherche : minuscules + suppression des accents
 */
export const normalizeForSearch = (str: string | null | undefined): string => {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "");
};

// ── Nombres ───────────────────────────────────────────────────────────────────

/**
 * Formate un nombre avec séparateur de milliers (ex: 1 234 567)
 */
export const formatNumber = (value: number | string | null | undefined, digits?: number): string => {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (digits !== undefined) {
    return num.toLocaleString("fr-FR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }
  return num.toLocaleString("fr-FR");
};

/**
 * Formate un pourcentage (ex: 0.856 → "85,6 %")
 */
export const formatPercent = (value: number | string | null | undefined, digits = 1): string => {
  if (value === null || value === undefined) return "—";
  return `${(Number(value) * 100).toFixed(digits).replaceAll(".", ",")} %`;
};

/**
 * Formate un montant en devise (TND par défaut)
 */
export const formatCurrency = (value: number | string | null | undefined, currency = "TND"): string => {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  return num.toLocaleString("fr-FR", {
    style: "currency",
    currency: currency,
  });
};

// ── Téléphones & Fichiers ─────────────────────────────────────────────────────

/**
 * Formate un numéro de téléphone
 */
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return "—";
  const cleaned = String(phone).replaceAll(/\D/g, "");
  if (cleaned.startsWith("216") && cleaned.length === 11) {
    const code = cleaned.slice(0, 3);
    const part1 = cleaned.slice(3, 5);
    const part2 = cleaned.slice(5, 8);
    const part3 = cleaned.slice(8);
    return `+${code} ${part1} ${part2} ${part3}`;
  }
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

/**
 * Formate une taille en octets en format lisible (KB, MB, GB, etc.)
 */
export const formatFileSize = (bytes: number | null | undefined): string => {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const num = Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${num} ${sizes[i]}`;
};

/**
 * Formate un objet JSON de manière lisible
 */
export const formatJSON = (obj: unknown): string => {
  if (obj === null || obj === undefined) return "";
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return "";
  }
};

// ── Codes / Labels ────────────────────────────────────────────────────────────

/**
 * Formate un code en majuscules avec tirets (ex: "inf 01" → "INF-01")
 */
export const formatCode = (code: string | null | undefined): string => {
  if (!code) return "";
  return String(code).toUpperCase().replaceAll(/\s+/g, "-");
};

/**
 * Retourne le label d'un NiveauMaitrise (ex: "N3_INTERMEDIAIRE" → "N3 — Intermédiaire")
 */
export const formatNiveauMaitrise = (niveau: string | null | undefined): string => {
  if (!niveau) return "—";
  const labels: Record<string, string> = {
    N1_DEBUTANT:       "N1 — Débutant",
    N2_ELEMENTAIRE:    "N2 — Élémentaire",
    N3_INTERMEDIAIRE:  "N3 — Intermédiaire",
    N4_AVANCE:         "N4 — Avancé",
    N5_EXPERT:         "N5 — Expert",
  };
  return labels[niveau] ?? niveau ?? "—";
};

/**
 * Retourne le label d'un TypeSavoir (ex: "THEORIQUE" → "Théorique")
 */
export const formatTypeSavoir = (type: string | null | undefined): string => {
  if (!type) return "—";
  const labels: Record<string, string> = {
    THEORIQUE: "Théorique",
    PRATIQUE:  "Pratique",
  };
  return labels[type] ?? type ?? "—";
};
