import { describe, it, expect, vi } from "vitest";
import {
  formatPercent,
  formatScore,
  riskColor,
  riskLabel,
  scoreToRiskLevel,
  teacherStatus,
  gapSeverityColor,
  formatDepartment,
  formatUP,
  toCsv,
  downloadCsv,
  STATUT_META,
} from "@/utils/analytics/format";

describe("formatPercent", () => {
  it("convertit une fraction en pourcentage", () => {
    expect(formatPercent(0.82)).toBe("82%");
  });
  it("respecte le nombre de décimales", () => {
    expect(formatPercent(0.1234, 1)).toBe("12.3%");
  });
});

describe("formatScore", () => {
  it("formate avec 2 décimales par défaut", () => {
    expect(formatScore(0.82)).toBe("0.82");
  });
  it("respecte le nombre de décimales fourni", () => {
    expect(formatScore(1.2, 0)).toBe("1");
  });
});

describe("riskColor", () => {
  it("retourne la couleur mappée", () => {
    expect(riskColor("CRITIQUE")).toBe("#f5222d");
  });
  it("retourne une couleur par défaut pour un niveau inconnu", () => {
    expect(riskColor("INCONNU" as any)).toBe("#8c8c8c");
  });
});

describe("riskLabel", () => {
  it("retourne le libellé mappé", () => {
    expect(riskLabel("ELEVE")).toBe("Élevé");
  });
  it("retourne le niveau tel quel pour une valeur inconnue", () => {
    expect(riskLabel("X" as any)).toBe("X");
  });
});

describe("scoreToRiskLevel", () => {
  it("FAIBLE en dessous de 0,25", () => {
    expect(scoreToRiskLevel(0.1)).toBe("FAIBLE");
  });
  it("MODERE entre 0,25 et 0,5", () => {
    expect(scoreToRiskLevel(0.3)).toBe("MODERE");
  });
  it("ELEVE entre 0,5 et 0,75", () => {
    expect(scoreToRiskLevel(0.6)).toBe("ELEVE");
  });
  it("CRITIQUE au-dessus de 0,75", () => {
    expect(scoreToRiskLevel(0.8)).toBe("CRITIQUE");
  });
  it("gère les seuils exacts", () => {
    expect(scoreToRiskLevel(0.25)).toBe("MODERE");
    expect(scoreToRiskLevel(0.5)).toBe("ELEVE");
    expect(scoreToRiskLevel(0.75)).toBe("CRITIQUE");
  });
});

describe("teacherStatus", () => {
  it("Critique si niveau CRITIQUE", () => {
    expect(teacherStatus("STABLE", "CRITIQUE")).toBe("Critique");
  });
  it("Regression si tendance DEGRADATION", () => {
    expect(teacherStatus("DEGRADATION", "MODERE")).toBe("Regression");
  });
  it("Stagnation si tendance STABLE et niveau MODERE/ELEVE", () => {
    expect(teacherStatus("STABLE", "ELEVE")).toBe("Stagnation");
    expect(teacherStatus("STABLE", "MODERE")).toBe("Stagnation");
  });
  it("Stable par défaut", () => {
    expect(teacherStatus("AMELIORATION", "FAIBLE")).toBe("Stable");
  });
  it("gère les valeurs nulles", () => {
    expect(teacherStatus(null, null)).toBe("Stable");
  });
});

describe("gapSeverityColor", () => {
  it("rouge au-dessus de 0,75", () => {
    expect(gapSeverityColor(0.8)).toBe("#f5222d");
  });
  it("orange au-dessus de 0,5", () => {
    expect(gapSeverityColor(0.6)).toBe("#fa8c16");
  });
  it("jaune au-dessus de 0,25", () => {
    expect(gapSeverityColor(0.3)).toBe("#faad14");
  });
  it("vert sinon", () => {
    expect(gapSeverityColor(0.1)).toBe("#52c41a");
  });
});

describe("formatDepartment", () => {
  it("retourne — pour une valeur vide", () => {
    expect(formatDepartment(null)).toBe("—");
    expect(formatDepartment(undefined)).toBe("—");
    expect(formatDepartment("")).toBe("—");
  });
  it("mappe les codes département connus", () => {
    expect(formatDepartment("DEPT_INFO")).toBe("Informatique");
    expect(formatDepartment("DEPT_IA")).toBe("Intelligence Artificielle");
  });
  it("nettoie le préfixe DEPT_ en repli", () => {
    expect(formatDepartment("DEPT_XYZ")).toBe("XYZ");
  });
});

describe("formatUP", () => {
  it("retourne — pour une valeur vide", () => {
    expect(formatUP(null)).toBe("—");
  });
  it("espace après UP_", () => {
    expect(formatUP("UP_12")).toBe("UP 12");
  });
});

describe("toCsv", () => {
  it("génère un en-tête et des lignes", () => {
    const csv = toCsv(
      [
        { a: 1, b: "x" },
        { a: 2, b: "y" },
      ],
      ["a", "b"],
    );
    expect(csv).toBe("a,b\n1,x\n2,y");
  });
  it("échappe les valeurs contenant délimiteurs", () => {
    const csv = toCsv([{ a: 'x,y', b: 'l"b' }], ["a", "b"]);
    expect(csv).toBe('a,b\n"x,y","l""b"');
  });
  it("gère les valeurs nulles", () => {
    const csv = toCsv([{ a: null, b: undefined }], ["a", "b"]);
    expect(csv).toBe("a,b\n,");
  });
});

describe("downloadCsv", () => {
  it("crée un blob et clique sur un lien", () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const createSpy = vi.fn(() => "blob:url");
    const revokeSpy = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { writable: true, value: createSpy });
    Object.defineProperty(URL, "revokeObjectURL", { writable: true, value: revokeSpy });
    downloadCsv("f.csv", "a,b\n1,2");
    expect(createSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith("blob:url");
    clickSpy.mockRestore();
    createSpy.mockRestore();
    revokeSpy.mockRestore();
  });
});

describe("STATUT_META", () => {
  it("contient les 4 statuts", () => {
    expect(Object.keys(STATUT_META).sort()).toEqual(["Critique", "Regression", "Stable", "Stagnation"]);
  });
});
