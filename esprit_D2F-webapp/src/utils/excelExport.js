/**
 * excelExport.js — Utilitaire centralisé pour les exports Excel stylisés
 * Design : couleurs Esprit, en-têtes rouge marque, lignes alternées, bordures fines.
 */
import * as XLSX from "xlsx";

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  brand:       "B51200",   // rouge Esprit
  brandLight:  "FDECEA",   // fond clair marque
  white:       "FFFFFF",
  rowOdd:      "FFFFFF",
  rowEven:     "FFF8F7",   // très légèrement rosé
  border:      "E0E0E0",
  textDark:    "1F2937",
  textMuted:   "6B7280",
};

const border = (rgb = C.border) => ({ style: "thin", color: { rgb } });
const allBorders = { top: border(), bottom: border(), left: border(), right: border() };

// ── Calcul automatique de largeur de colonne ───────────────────────────────
function autoColWidths(keys, rows) {
  return keys.map(key => ({
    wch: Math.max(
      String(key).length + 2,
      ...rows.map(r => String(r[key] ?? "").length)
    ) + 3,
  }));
}

// ── Feuille stylisée ───────────────────────────────────────────────────────
/**
 * @param {object[]} rows     Données à exporter (tableau d'objets plats)
 * @param {object}   opts
 *   title    {string}  Titre du rapport (ligne fusionnée, fond rouge)
 *   subtitle {string}  Sous-titre (date d'export, filtres actifs…)
 */
export function styledSheet(rows, { title, subtitle } = {}) {
  if (!rows || rows.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([["Aucune donnée"]]);
    return ws;
  }

  const keys = Object.keys(rows[0]);
  const ncols = keys.length;
  const hasTitle = Boolean(title);
  const hasSub   = Boolean(subtitle);

  // Construire le tableau de tableaux (AOA)
  const aoa = [];
  if (hasTitle) aoa.push([title,    ...Array(ncols - 1).fill(null)]);
  if (hasSub)   aoa.push([subtitle, ...Array(ncols - 1).fill(null)]);
  aoa.push(keys);                                         // en-tête colonnes
  rows.forEach(r => aoa.push(keys.map(k => r[k] ?? ""))); // données

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Fusions pour titre / sous-titre
  ws["!merges"] = [];
  let metaRows = 0;
  if (hasTitle) { ws["!merges"].push({ s: { r: metaRows, c: 0 }, e: { r: metaRows, c: ncols - 1 } }); metaRows++; }
  if (hasSub)   { ws["!merges"].push({ s: { r: metaRows, c: 0 }, e: { r: metaRows, c: ncols - 1 } }); metaRows++; }

  const headerRow = metaRows; // index de la ligne d'en-tête colonnes

  // Appliquer les styles cellule par cellule
  aoa.forEach((rowArr, R) => {
    rowArr.forEach((_, C_) => {
      const addr = XLSX.utils.encode_cell({ r: R, c: C_ });
      if (!ws[addr]) return;

      if (hasTitle && R === 0) {
        ws[addr].s = {
          fill: { fgColor: { rgb: C.brand } },
          font: { bold: true, sz: 14, color: { rgb: C.white }, name: "Calibri" },
          alignment: { horizontal: "center", vertical: "center" },
        };
      } else if (hasSub && R === (hasTitle ? 1 : 0)) {
        ws[addr].s = {
          fill: { fgColor: { rgb: C.brandLight } },
          font: { sz: 9, italic: true, color: { rgb: C.textMuted }, name: "Calibri" },
          alignment: { horizontal: "center", vertical: "center" },
        };
      } else if (R === headerRow) {
        ws[addr].s = {
          fill: { fgColor: { rgb: C.brand } },
          font: { bold: true, sz: 11, color: { rgb: C.white }, name: "Calibri" },
          border: allBorders,
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
        };
      } else {
        const dataIdx = R - headerRow;
        ws[addr].s = {
          fill: { fgColor: { rgb: dataIdx % 2 === 1 ? C.rowEven : C.rowOdd } },
          font: { sz: 10, color: { rgb: C.textDark }, name: "Calibri" },
          border: allBorders,
          alignment: { vertical: "center" },
        };
      }
    });
  });

  // Hauteurs de lignes
  ws["!rows"] = aoa.map((_, R) => {
    if (hasTitle && R === 0) return { hpt: 30 };
    if (hasSub && R === (hasTitle ? 1 : 0)) return { hpt: 16 };
    if (R === headerRow) return { hpt: 22 };
    return { hpt: 18 };
  });

  // Largeurs de colonnes
  ws["!cols"] = autoColWidths(keys, rows);

  return ws;
}

// ── Écriture du fichier ────────────────────────────────────────────────────
/**
 * @param {Array<{name: string, rows: object[], title?: string, subtitle?: string}>} sheets
 * @param {string} filename
 */
export function writeExcel(sheets, filename) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows, title, subtitle }) => {
    const ws = styledSheet(rows, { title, subtitle });
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, filename, { cellStyles: true });
}

// ── Helper date ────────────────────────────────────────────────────────────
export function exportDateLabel() {
  return `Généré le ${new Date().toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  })} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

export function isoDate() {
  return new Date().toISOString().slice(0, 10);
}
