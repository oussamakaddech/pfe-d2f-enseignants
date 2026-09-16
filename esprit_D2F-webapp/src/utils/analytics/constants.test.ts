import { describe, it, expect } from "vitest";
import {
  ANALYTICS_ROUTES,
  RISK_LEVEL_ORDER,
  RISK_LEVEL_COLORS,
  URGENCE_COLORS,
  SEVERITE_COLORS,
  STATUT_ALERTE_LABELS,
  STATUT_ALERTE_COLORS,
  ALERT_STATUTS_OUVERTS,
  RISK_LEVEL_LABELS,
  PAGE_SIZE,
  RISK_THRESHOLDS,
} from "./constants";

describe("ANALYTICS_ROUTES", () => {
  it("construit l'URL d'un enseignant", () => {
    expect(ANALYTICS_ROUTES.teacher("T1")).toBe("/home/analytics/teacher/T1");
  });
  it("expose les routes fixes", () => {
    expect(ANALYTICS_ROUTES.dashboard).toBe("/home/analytics/dashboard");
    expect(ANALYTICS_ROUTES.monitoring).toBe("/home/analytics/monitoring");
    expect(ANALYTICS_ROUTES.heatmap).toBe("/home/analytics/heatmap");
  });
});

describe("RISK_LEVEL_ORDER", () => {
  it("est ordonné FAIBLE → CRITIQUE", () => {
    expect(RISK_LEVEL_ORDER).toEqual(["FAIBLE", "MODERE", "ELEVE", "CRITIQUE"]);
  });
});

describe("RISK_LEVEL_COLORS", () => {
  it("mappe chaque niveau à une couleur", () => {
    expect(RISK_LEVEL_COLORS.FAIBLE).toBe("#52c41a");
    expect(RISK_LEVEL_COLORS.CRITIQUE).toBe("#f5222d");
  });
});

describe("URGENCE_COLORS", () => {
  it("mappe les niveaux d'urgence", () => {
    expect(URGENCE_COLORS.FAIBLE).toBe("default");
    expect(URGENCE_COLORS.CRITIQUE).toBe("red");
  });
});

describe("SEVERITE_COLORS", () => {
  it("mappe les sévérités", () => {
    expect(SEVERITE_COLORS.INFO).toBe("blue");
    expect(SEVERITE_COLORS.CRITICAL).toBe("red");
  });
});

describe("STATUT_ALERTE_LABELS", () => {
  it("mappe les statuts d'alerte", () => {
    expect(STATUT_ALERTE_LABELS.NOUVELLE).toBe("Nouvelle");
    expect(STATUT_ALERTE_LABELS.ESCALADEE).toBe("Escaladée");
  });
});

describe("STATUT_ALERTE_COLORS", () => {
  it("mappe les couleurs de statut", () => {
    expect(STATUT_ALERTE_COLORS.TRAITEE).toBe("green");
    expect(STATUT_ALERTE_COLORS.IGNOREE).toBe("default");
  });
});

describe("ALERT_STATUTS_OUVERTS", () => {
  it("contient NOUVELLE et LUE", () => {
    expect(ALERT_STATUTS_OUVERTS).toEqual(["NOUVELLE", "LUE"]);
  });
});

describe("RISK_LEVEL_LABELS", () => {
  it("mappe les niveaux de risque", () => {
    expect(RISK_LEVEL_LABELS.MODERE).toBe("Modéré");
    expect(RISK_LEVEL_LABELS.ELEVE).toBe("Élevé");
  });
});

describe("PAGE_SIZE", () => {
  it("vaut 20", () => {
    expect(PAGE_SIZE).toBe(20);
  });
});

describe("RISK_THRESHOLDS", () => {
  it("expose les seuils", () => {
    expect(RISK_THRESHOLDS).toEqual({ modere: 0.25, eleve: 0.5, critique: 0.75 });
  });
});
