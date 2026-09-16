import { describe, it, expect } from "vitest";
import { fmtInt, fmtPct, fmtRatio, fmtDecimal, nonCalculable, buildTrend, initialsFromName, splitName } from "@/redesign/format";
import { NA_CALC } from "@/utils/states";

describe("fmtInt", () => {
  it("formate un entier en FR", () => {
    expect(fmtInt(1234567)).toBe("1 234 567");
  });
  it("arrondit un décimal", () => {
    expect(fmtInt(12.8)).toBe("13");
  });
  it("retourne NA_CALC pour null/undefined", () => {
    expect(fmtInt(null)).toBe(NA_CALC);
    expect(fmtInt(undefined)).toBe(NA_CALC);
  });
  it("retourne NA_CALC pour NaN", () => {
    expect(fmtInt(Number.NaN)).toBe(NA_CALC);
  });
  it("utilise le fallback", () => {
    expect(fmtInt(null, { fallback: "—" })).toBe("—");
  });
});

describe("fmtPct", () => {
  it("formate un pourcentage", () => {
    expect(fmtPct(42)).toBe("42 %");
  });
  it("respecte le nombre de digits", () => {
    expect(fmtPct(42.5, { digits: 1 })).toBe("42.5 %");
  });
  it("ajoute le signe quand positif et withSign", () => {
    expect(fmtPct(5, { withSign: true })).toBe("+5 %");
  });
  it("n'ajoute pas de signe pour 0", () => {
    expect(fmtPct(0, { withSign: true })).toBe("0 %");
  });
  it("retourne NA_CALC pour null/undefined/NaN", () => {
    expect(fmtPct(null)).toBe(NA_CALC);
    expect(fmtPct(undefined)).toBe(NA_CALC);
    expect(fmtPct(Number.NaN)).toBe(NA_CALC);
  });
});

describe("fmtRatio", () => {
  it("convertit un ratio en pourcentage", () => {
    expect(fmtRatio(0.72)).toBe("72 %");
  });
  it("retourne NA_CALC pour null", () => {
    expect(fmtRatio(null)).toBe(NA_CALC);
  });
});

describe("fmtDecimal", () => {
  it("formate avec le nombre de digits par défaut", () => {
    expect(fmtDecimal(1.84)).toBe("1.8");
  });
  it("utilise le digits fourni", () => {
    expect(fmtDecimal(1.847, 2)).toBe("1.85");
  });
  it("retourne NA_CALC pour null", () => {
    expect(fmtDecimal(null)).toBe(NA_CALC);
  });
});

describe("nonCalculable", () => {
  it("retourne le label et la raison", () => {
    const r = nonCalculable("pas de données");
    expect(r.label).toBe(NA_CALC);
    expect(r.reason).toBe("pas de données");
  });
  it("fonctionne sans raison", () => {
    expect(nonCalculable().label).toBe(NA_CALC);
  });
});

describe("buildTrend", () => {
  it("retourne null si current ou previous null/NaN", () => {
    expect(buildTrend({ current: null, previous: 10, higherIsBetter: true })).toBeNull();
    expect(buildTrend({ current: 10, previous: undefined, higherIsBetter: true })).toBeNull();
    expect(buildTrend({ current: Number.NaN, previous: 10, higherIsBetter: true })).toBeNull();
  });
  it("retourne stable pour une différence négligeable", () => {
    const t = buildTrend({ current: 50, previous: 50.2, higherIsBetter: true, unit: "pts" });
    expect(t).toEqual({ value: 0, direction: "stable", good: true, label: undefined });
  });
  it("retourne up et good quand higherIsBetter", () => {
    const t = buildTrend({ current: 60, previous: 40, higherIsBetter: true });
    expect(t!.direction).toBe("up");
    expect(t!.good).toBe(true);
    expect(t!.value).toBe(20);
  });
  it("retourne up mais bad quand lowerIsBetter", () => {
    const t = buildTrend({ current: 60, previous: 40, higherIsBetter: false });
    expect(t!.direction).toBe("up");
    expect(t!.good).toBe(false);
  });
  it("retourne down quand current < previous", () => {
    const t = buildTrend({ current: 30, previous: 50, higherIsBetter: false });
    expect(t!.direction).toBe("down");
    expect(t!.good).toBe(true);
  });
});

describe("initialsFromName", () => {
  it("retourne les initiales d'un nom complet", () => {
    expect(initialsFromName("Amel Benali")).toBe("AB");
  });
  it("retourne les 2 premiers caractères d'un seul mot", () => {
    expect(initialsFromName("Madame")).toBe("MA");
  });
  it("retourne le fallback pour vide/null/undefined", () => {
    expect(initialsFromName("")).toBe("?");
    expect(initialsFromName(null)).toBe("?");
    expect(initialsFromName(undefined)).toBe("?");
  });
  it("trim et ignore les espaces multiples", () => {
    expect(initialsFromName("  Karim   Haddad ")).toBe("KH");
  });
});

describe("splitName", () => {
  it("découpe prénom et nom", () => {
    expect(splitName("Amel Benali")).toEqual({ firstName: "Amel", lastName: "Benali" });
  });
  it("retourne seulement le prénom pour un seul mot", () => {
    expect(splitName("Madame")).toEqual({ firstName: "Madame" });
  });
  it("retourne un objet vide pour vide", () => {
    expect(splitName("")).toEqual({});
  });
});
