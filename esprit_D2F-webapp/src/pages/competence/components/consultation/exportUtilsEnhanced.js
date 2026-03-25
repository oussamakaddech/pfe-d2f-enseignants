import * as XLSX from "xlsx";
import { getFilteredCrud } from "./utils";

export function getExportDateSuffix() {
  return new Date().toISOString().slice(0, 10);
}

export function buildCSVString(rows, columns) {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const body = rows.map((row) => columns.map((c) => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(","));
  return [header, ...body].join("\n");
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper pour créer une feuille stylisée avec en-tête en gras et bordures
const createStyledSheet = (data, sheetName, headerColors) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const range = XLSX.utils.decode_range(ws["!ref"]);

  // Style pour les en-têtes
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_cell({r: 0, c: C});
    if (!ws[address]) continue;
    ws[address].s = {
      fill: {
        fgColor: { rgb: headerColors.fg },
        bgColor: { rgb: headerColors.bg }
      },
      font: {
        bold: true,
        sz: 12,
        color: { rgb: headerColors.fg }
      },
      border: {
        top: { style: "thin", color: { auto: 1 } },
        right: { style: "thin", color: { auto: 1 } },
        bottom: { style: "thin", color: { auto: 1 } },
        left: { style: "thin", color: { auto: 1 } }
      }
    };
  }

  // Style pour les données
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({r: R, c: C});
      if (!ws[address]) continue;
      ws[address].s = {
        fill: {
          fgColor: { rgb: "000000" },
          bgColor: { rgb: R % 2 === 0 ? "FFFFFF" : "F5F7FA" }
        },
        font: {
          sz: 11,
          color: { rgb: "1A1A1A" }
        },
        border: {
          top: { style: "thin", color: { rgb: "D0D7DE" } },
          right: { style: "thin", color: { rgb: "D0D7DE" } },
          bottom: { style: "thin", color: { rgb: "D0D7DE" } },
          left: { style: "thin", color: { rgb: "D0D7DE" } }
        }
      };
    }
  }

  // Ajuster la largeur des colonnes
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(
      key.length,
      ...data.map(row => String(row[key] || "").length)
    ) + 5
  }));
  ws["!cols"] = colWidths;

  return ws;
};

export function doExportStructureExcel(crud, domaineId) {
  const f = getFilteredCrud(crud, domaineId);
  const wb = XLSX.utils.book_new();
  const sfx = domaineId ? "_domaine" : "_complet";

  // Feuille Domaines
  XLSX.utils.book_append_sheet(
    wb,
    createStyledSheet(
      f.domaines.map((d) => ({
        "CODE": d.code,
        "NOM": d.nom,
        "NB COMPÉTENCES": f.competences.filter((c) => String(c.domaineId) === String(d.id)).length,
      })),
      "01-DOMAINES",
      { fg: "FFFFFF", bg: "1E40AF" }
    ),
    "01-DOMAINES"
  );

  // Feuille Compétences
  XLSX.utils.book_append_sheet(
    wb,
    createStyledSheet(
      f.competences.map((c) => ({
        "CODE": c.code,
        "NOM": c.nom,
        "DOMAINE": f.domaines.find((d) => String(d.id) === String(c.domaineId))?.nom || "",
        "NB SOUS-COMPÉTENCES": f.sousComps.filter((sc) => String(sc.competenceId) === String(c.id)).length,
      })),
      "02-COMPÉTENCES",
      { fg: "FFFFFF", bg: "059669" }
    ),
    "02-COMPÉTENCES"
  );

  // Feuille Sous-compétences
  XLSX.utils.book_append_sheet(
    wb,
    createStyledSheet(
      f.sousComps.map((sc) => ({
        "CODE": sc.code,
        "NOM": sc.nom,
        "COMPÉTENCE": f.competences.find((c) => String(c.id) === String(sc.competenceId))?.nom || "",
        "PARENT": sc.parentId ? f.sousComps.find((p) => String(p.id) === String(sc.parentId))?.nom || "" : "RACINE",
      })),
      "03-SOUS-COMPÉTENCES",
      { fg: "FFFFFF", bg: "7C3AED" }
    ),
    "03-SOUS-COMPÉTENCES"
  );

  // Feuille Savoirs
  XLSX.utils.book_append_sheet(
    wb,
    createStyledSheet(
      f.savoirs.map((s) => {
        const fsc = f.sousComps.find((sc) => String(sc.id) === String(s.sousCompetenceId));
        const comp = fsc
          ? f.competences.find((c) => String(c.id) === String(fsc.competenceId))
          : s.competenceId != null
            ? f.competences.find((c) => String(c.id) === String(s.competenceId))
            : null;
        return {
          "CODE": s.code,
          "NOM": s.nom,
          "TYPE": s.type,
          "NIVEAU": s.niveau,
          "SOUS-COMPÉTENCE": fsc?.nom || "DIRECT",
          "COMPÉTENCE": comp?.nom || "",
        };
      }),
      "04-SAVOIRS",
      { fg: "FFFFFF", bg: "DC2626" }
    ),
    "04-SAVOIRS"
  );

  XLSX.writeFile(wb, `structure${sfx}_${getExportDateSuffix()}.xlsx`);
}

export function doExportSavoirsExcel(crud, domaineId) {
  const f = getFilteredCrud(crud, domaineId);
  const sfx = domaineId ? "_domaine" : "";
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    createStyledSheet(
      f.savoirs.map((s) => {
        const fsc = f.sousComps.find((sc) => String(sc.id) === String(s.sousCompetenceId));
        const comp = fsc
          ? f.competences.find((c) => String(c.id) === String(fsc.competenceId))
          : s.competenceId != null
            ? f.competences.find((c) => String(c.id) === String(s.competenceId))
            : null;
        const dom = comp ? f.domaines.find((d) => String(d.id) === String(comp.domaineId)) : null;
        return {
          "CODE": s.code,
          "NOM": s.nom,
          "TYPE": s.type,
          "NIVEAU": s.niveau,
          "SOUS-COMPÉTENCE": fsc?.nom || "DIRECT",
          "COMPÉTENCE": comp?.nom || "",
          "DOMAINE": dom?.nom || "",
        };
      }),
      "SAVOIRS",
      { fg: "FFFFFF", bg: "DC2626" }
    ),
    "SAVOIRS"
  );

  XLSX.writeFile(wb, `savoirs${sfx}_${getExportDateSuffix()}.xlsx`);
}

export function doExportSynthesisExcel(crud, stats) {
  const wb = XLSX.utils.book_new();

  // Feuille Statistiques
  const statsRows = [
    { "INDICATEUR": "Domaines", "VALEUR": stats?.totalDomaines ?? (crud.domaines || []).length },
    { "INDICATEUR": "Compétences", "VALEUR": stats?.totalCompetences ?? (crud.competences || []).length },
    { "INDICATEUR": "Sous-compétences", "VALEUR": stats?.totalSousCompetences ?? (crud.sousComps || []).length },
    { "INDICATEUR": "Savoirs", "VALEUR": stats?.totalSavoirs ?? (crud.savoirs || []).length },
    { "INDICATEUR": "Savoirs théoriques", "VALEUR": stats?.totalSavoirsTheoriques ?? (crud.savoirs || []).filter((s) => s.type === "THEORIQUE").length },
    { "INDICATEUR": "Savoirs pratiques", "VALEUR": stats?.totalSavoirsPratiques ?? (crud.savoirs || []).filter((s) => s.type === "PRATIQUE").length },
  ];

  XLSX.utils.book_append_sheet(
    wb,
    createStyledSheet(statsRows, "STATISTIQUES", { fg: "FFFFFF", bg: "1E40AF" }),
    "STATISTIQUES"
  );

  // Feuille Par domaine
  XLSX.utils.book_append_sheet(
    wb,
    createStyledSheet(
      (crud.domaines || []).map((d) => {
        const comps = (crud.competences || []).filter((c) => String(c.domaineId) === String(d.id));
        const compIds = new Set(comps.map((c) => String(c.id)));
        const scs = (crud.sousComps || []).filter((sc) => compIds.has(String(sc.competenceId)));
        const scIds = new Set(scs.map((sc) => String(sc.id)));
        const savs = (crud.savoirs || []).filter(
          (s) => scIds.has(String(s.sousCompetenceId)) || compIds.has(String(s.competenceId)),
        );

        return {
          "CODE": d.code,
          "DOMAINE": d.nom,
          "COMPÉTENCES": comps.length,
          "SOUS-COMPÉTENCES": scs.length,
          "SAVOIRS": savs.length,
          "THÉORIQUES": savs.filter((s) => s.type === "THEORIQUE").length,
          "PRATIQUES": savs.filter((s) => s.type === "PRATIQUE").length,
        };
      }),
      "PAR DOMAINE",
      { fg: "FFFFFF", bg: "059669" }
    ),
    "PAR DOMAINE"
  );

  XLSX.writeFile(wb, `synthese_referentiel_${getExportDateSuffix()}.xlsx`);
}

export function doExportSavoirsCSV(crud, domaineId) {
  const f = getFilteredCrud(crud, domaineId);
  const sfx = domaineId ? "_domaine" : "";
  const columns = [
    { key: "code", label: "Code" },
    { key: "nom", label: "Nom" },
    { key: "type", label: "Type" },
    { key: "niveau", label: "Niveau" },
    { key: "sousc", label: "Sous-competence" },
    { key: "comp", label: "Competence" },
    { key: "domaine", label: "Domaine" },
  ];

  const rows = f.savoirs.map((s) => {
    const fsc = f.sousComps.find((sc) => String(sc.id) === String(s.sousCompetenceId));
    const comp = fsc
      ? f.competences.find((c) => String(c.id) === String(fsc.competenceId))
      : s.competenceId != null
        ? f.competences.find((c) => String(c.id) === String(s.competenceId))
        : null;
    const dom = comp ? f.domaines.find((d) => String(d.id) === String(comp.domaineId)) : null;

    return {
      code: s.code,
      nom: s.nom,
      type: s.type,
      niveau: s.niveau,
      sousc: fsc?.nom || "",
      comp: comp?.nom || "",
      domaine: dom?.nom || "",
    };
  });

  downloadFile("\uFEFF" + buildCSVString(rows, columns), `savoirs${sfx}_${getExportDateSuffix()}.csv`, "text/csv;charset=utf-8;");
}

export function doExportCompetencesCSV(crud, domaineId) {
  const f = getFilteredCrud(crud, domaineId);
  const sfx = domaineId ? "_domaine" : "";
  const columns = [
    { key: "code", label: "Code" },
    { key: "nom", label: "Nom" },
    { key: "domaine", label: "Domaine" },
    { key: "nbSousComps", label: "Nb Sous-comp." },
    { key: "nbSavoirs", label: "Nb Savoirs" },
  ];

  const rows = f.competences.map((c) => {
    const scs = f.sousComps.filter((sc) => String(sc.competenceId) === String(c.id));
    const scIds = new Set(scs.map((sc) => String(sc.id)));
    const direct = f.savoirs.filter((s) => String(s.competenceId) === String(c.id)).length;

    return {
      code: c.code,
      nom: c.nom,
      domaine: f.domaines.find((d) => String(d.id) === String(c.domaineId))?.nom || "",
      nbSousComps: scs.length,
      nbSavoirs: f.savoirs.filter((s) => scIds.has(String(s.sousCompetenceId))).length + direct,
    };
  });

  downloadFile("\uFEFF" + buildCSVString(rows, columns), `competences${sfx}_${getExportDateSuffix()}.csv`, "text/csv;charset=utf-8;");
}

export function doExportStructureJSON(crud) {
  const json = {
    exportedAt: new Date().toISOString(),
    stats: {
      domaines: (crud.domaines || []).length,
      competences: (crud.competences || []).length,
      sousCompetences: (crud.sousComps || []).length,
      savoirs: (crud.savoirs || []).length,
    },
    domaines: (crud.domaines || []).map((d) => ({
      id: d.id,
      code: d.code,
      nom: d.nom,
      competences: (crud.competences || [])
        .filter((c) => String(c.domaineId) === String(d.id))
        .map((c) => {
          const scs = (crud.sousComps || []).filter((sc) => String(sc.competenceId) === String(c.id));
          return {
            id: c.id,
            code: c.code,
            nom: c.nom,
            savoirsDirects: (crud.savoirs || [])
              .filter((s) => String(s.competenceId) === String(c.id) && !s.sousCompetenceId)
              .map((s) => ({ id: s.id, code: s.code, nom: s.nom, type: s.type, niveau: s.niveau })),
            sousCompetences: scs.map((sc) => ({
              id: sc.id,
              code: sc.code,
              nom: sc.nom,
              parentId: sc.parentId || null,
              savoirs: (crud.savoirs || [])
                .filter((s) => String(s.sousCompetenceId) === String(sc.id))
                .map((s) => ({ id: s.id, code: s.code, nom: s.nom, type: s.type, niveau: s.niveau })),
            })),
          };
        }),
    })),
  };

  downloadFile(JSON.stringify(json, null, 2), `structure_${getExportDateSuffix()}.json`, "application/json");
}
