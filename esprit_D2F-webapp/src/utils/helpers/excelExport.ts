/**
 * excelExport.ts — Utilitaire centralisé pour les exports Excel stylisés.
 *
 * Utilise `xlsx-js-style` (fork de SheetJS qui SUPPORTE l'écriture des styles —
 * la version communautaire `xlsx` ignore `cell.s`, d'où des fichiers « plats »).
 *
 * Design : couleurs Esprit, titre fusionné, en-têtes rouge marque (figés en
 * filtre auto), lignes alternées (zébrage), bordures fines, largeurs auto
 * plafonnées, hauteurs de lignes confortables.
 */
import * as XLSX from "xlsx-js-style";

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  brand:       "B51200",   // rouge Esprit
  brandDark:   "8A0E00",   // rouge foncé (titre)
  brandLight:  "FDECEA",   // fond clair marque (sous-titre)
  white:       "FFFFFF",
  rowOdd:      "FFFFFF",
  rowEven:     "FBF4F3",   // très légèrement rosé (zébrage)
  border:      "E5E7EB",
  headerBorder:"8A0E00",
  textDark:    "1F2937",
  textMuted:   "6B7280",
};

const border = (rgb = C.border) => ({ style: "thin", color: { rgb } });
const allBorders = { top: border(), bottom: border(), left: border(), right: border() };

const MIN_COL_WCH = 12;
const MAX_COL_WCH = 48;

// ── Calcul automatique de largeur de colonne (plafonnée) ────────────────────
function autoColWidths(keys: string[], rows: Record<string, unknown>[]): XLSX.ColInfo[] {
  return keys.map(key => {
    const dataMax = rows.reduce((max, r) => Math.max(max, String(r[key] ?? "").length), 0);
    const wch = Math.max(String(key).length + 2, dataMax) + 3;
    return { wch: Math.min(MAX_COL_WCH, Math.max(MIN_COL_WCH, wch)) };
  });
}

export interface SheetOptions {
  title?: string;
  subtitle?: string;
}

// ── Feuille stylisée ───────────────────────────────────────────────────────
/**
 * @param rows  Données à exporter (tableau d'objets plats)
 * @param opts.title     Titre du rapport (ligne fusionnée, fond rouge)
 * @param opts.subtitle  Sous-titre (date d'export, filtres actifs…)
 */
export function styledSheet(rows: Record<string, unknown>[], { title, subtitle }: SheetOptions = {}): XLSX.WorkSheet {
  if (!rows || rows.length === 0) {
    return XLSX.utils.aoa_to_sheet([["Aucune donnée à exporter"]]);
  }

  const keys = Object.keys(rows[0]);
  const ncols = keys.length;
  const hasTitle = Boolean(title);
  const hasSub   = Boolean(subtitle);

  // Construire le tableau de tableaux (AOA)
  const aoa: (unknown[])[] = [];
  if (hasTitle) aoa.push([title,    ...new Array(ncols - 1).fill(null)]);
  if (hasSub)   aoa.push([subtitle, ...new Array(ncols - 1).fill(null)]);
  aoa.push(keys);                                         // en-tête colonnes
  rows.forEach(r => aoa.push(keys.map(k => r[k] ?? ""))); // données

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Fusions pour titre / sous-titre
  ws["!merges"] = [];
  let metaRows = 0;
  if (hasTitle) { ws["!merges"].push({ s: { r: metaRows, c: 0 }, e: { r: metaRows, c: ncols - 1 } }); metaRows++; }
  if (hasSub)   { ws["!merges"].push({ s: { r: metaRows, c: 0 }, e: { r: metaRows, c: ncols - 1 } }); metaRows++; }

  const headerRow = metaRows;            // index de la ligne d'en-tête colonnes
  const lastRow   = aoa.length - 1;      // dernière ligne de données

  // Appliquer les styles cellule par cellule
  aoa.forEach((rowArr, R) => {
    rowArr.forEach((_, col) => {
      const addr = XLSX.utils.encode_cell({ r: R, c: col });
      if (!ws[addr]) return;

      const cell = ws[addr] as XLSX.CellObject & { s?: Record<string, unknown> };

      if (hasTitle && R === 0) {
        cell.s = {
          fill: { fgColor: { rgb: C.brandDark } },
          font: { bold: true, sz: 16, color: { rgb: C.white }, name: "Calibri" },
          alignment: { horizontal: "center", vertical: "center" },
        };
      } else if (hasSub && R === (hasTitle ? 1 : 0)) {
        cell.s = {
          fill: { fgColor: { rgb: C.brandLight } },
          font: { sz: 9, italic: true, color: { rgb: C.textMuted }, name: "Calibri" },
          alignment: { horizontal: "center", vertical: "center" },
        };
      } else if (R === headerRow) {
        cell.s = {
          fill: { fgColor: { rgb: C.brand } },
          font: { bold: true, sz: 11, color: { rgb: C.white }, name: "Calibri" },
          border: { top: border(C.headerBorder), bottom: border(C.headerBorder), left: border(C.headerBorder), right: border(C.headerBorder) },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
        };
      } else {
        const dataIdx = R - headerRow;
        cell.s = {
          fill: { fgColor: { rgb: dataIdx % 2 === 1 ? C.rowEven : C.rowOdd } },
          font: { sz: 10, color: { rgb: C.textDark }, name: "Calibri" },
          border: allBorders,
          alignment: { vertical: "center", horizontal: "left", wrapText: false },
        };
      }
    });
  });

  // Hauteurs de lignes
  ws["!rows"] = aoa.map((_, R) => {
    if (hasTitle && R === 0) return { hpt: 34 };
    if (hasSub && R === (hasTitle ? 1 : 0)) return { hpt: 18 };
    if (R === headerRow) return { hpt: 26 };
    return { hpt: 18 };
  });

  // Largeurs de colonnes
  ws["!cols"] = autoColWidths(keys, rows);

  // Filtre automatique sur l'en-tête (tri/filtre natif Excel)
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: lastRow, c: ncols - 1 } }),
  };

  return ws;
}

export interface SheetConfig {
  name: string;
  rows: Record<string, unknown>[];
  title?: string;
  subtitle?: string;
}

// ── Écriture du fichier ────────────────────────────────────────────────────
/**
 * @param sheets    Une ou plusieurs feuilles { name, rows, title?, subtitle? }
 * @param filename  Nom du fichier .xlsx
 */
export function writeExcel(sheets: SheetConfig[], filename: string): void {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows, title, subtitle }) => {
    const ws = styledSheet(rows, { title, subtitle });
    // Excel limite les noms d'onglet à 31 caractères et interdit certains caractères.
    const safeName = (name || "Feuille").replace(/[\\/?*[\]:]/g, " ").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });
  XLSX.writeFile(wb, filename, { cellStyles: true });
}

// ── Helper date ────────────────────────────────────────────────────────────
export function exportDateLabel(): string {
  return `Généré le ${new Date().toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  })} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

export function isoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
