export const NIVEAUX_MATRIX = [
  { key: "N1_DEBUTANT", label: "N 1" },
  { key: "N2_ELEMENTAIRE", label: "N 2" },
  { key: "N3_INTERMEDIAIRE", label: "N 3" },
  { key: "N4_AVANCE", label: "N 4" },
  { key: "N5_EXPERT", label: "N 5" },
];

export function buildD3TreeData(domaines = [], competences = [], sousComps = [], savoirs = []) {
  const toSavoirNode = (s) => ({
    name: s.nom,
    attributes: { code: s.code, type: s.type },
  });

  const getDirectSavoirs = (competenceId) =>
    savoirs
      .filter(
        (s) =>
          String(s.competenceId) === String(competenceId)
          && (s.sousCompetenceId == null || s.sousCompetenceId === ""),
      )
      .map(toSavoirNode);

  const buildScChildren = (competenceId, parentScId = null) => {
    const nodes = sousComps.filter(
      (sc) =>
        String(sc.competenceId) === String(competenceId) &&
        (parentScId === null
          ? sc.parentId == null
          : String(sc.parentId) === String(parentScId)),
    );

    return nodes.map((sc) => {
      const childSc = buildScChildren(competenceId, sc.id);
      const leafSavoirs =
        childSc.length === 0
          ? savoirs
              .filter((s) => String(s.sousCompetenceId) === String(sc.id))
              .map(toSavoirNode)
          : [];

      return {
        name: sc.nom,
        attributes: { code: sc.code },
        children: [...childSc, ...leafSavoirs],
      };
    });
  };

  return {
    name: "Referentiel",
    children: (domaines || []).map((d) => ({
      name: d.nom,
      attributes: { code: d.code },
      children: (competences || [])
        .filter((c) => String(c.domaineId) === String(d.id))
        .map((c) => {
          const scChildren = buildScChildren(c.id, null);
          const directSavoirs = getDirectSavoirs(c.id);
          return {
            name: c.nom,
            attributes: { code: c.code },
            children: [...scChildren, ...directSavoirs],
          };
        }),
    })),
  };
}

export function buildMatrixRows(matrixData = {}) {
  const maxRows = Math.max(
    ...NIVEAUX_MATRIX.map((n) => (matrixData?.[n.key] || []).length),
    1,
  );

  return Array.from({ length: maxRows }, (_, idx) => {
    const row = {};
    NIVEAUX_MATRIX.forEach((n) => {
      row[n.label] = matrixData?.[n.key]?.[idx]?.savoirCode || "";
    });
    return row;
  });
}

export function buildExportFileName(competenceCode, date = new Date()) {
  const safeCode = (competenceCode || "competence")
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .slice(0, 40);
  const isoDate = date.toISOString().slice(0, 10);
  return `affectation_niveaux_${safeCode}_${isoDate}.xlsx`;
}
