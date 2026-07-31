import { describe, expect, it } from "vitest";
import {
  formatHours,
  formatPercent,
  formatScore,
  riskLevelLabel,
  severityLabel,
  sortBySeverity,
} from "../lib/format";
import type { GapDiagnostic, GapSeverity } from "../api/types";

function gap(severity: GapSeverity, gap_level: number): GapDiagnostic {
  return {
    teacher_id: "ENS001",
    domain_id: "DOM-TEST",
    competency_id: "COMP-TEST",
    sub_competency_id: "SUB-TEST",
    knowledge_id: `K-${severity}`,
    knowledge_code: "KN-TEST",
    knowledge_name: "Savoir test",
    knowledge_type: "THEORETICAL",
    current_level: 1,
    required_level: 3,
    gap_level,
    gap_type: "LEVEL_DEFICIT",
    severity,
    evidence: [],
    explainability: null,
    data_quality_status: "COMPLETE",
    detected_at: null,
  };
}

describe("format helpers", () => {
  it("formats scores with fixed digits and dash for null", () => {
    expect(formatScore(0.6813)).toBe("0.68");
    expect(formatScore(null)).toBe("—");
  });

  it("formats percentages", () => {
    expect(formatPercent(0.72)).toBe("72.0 %");
    expect(formatPercent(undefined)).toBe("—");
  });

  it("formats hours and omits zeros", () => {
    expect(formatHours(24)).toBe("24h");
    expect(formatHours(0)).toBe("—");
  });

  it("labels severities and risk levels in French", () => {
    expect(severityLabel("CRITICAL")).toBe("Critique");
    expect(riskLevelLabel("HIGH")).toBe("Risque élevé");
  });

  it("sorts gaps by severity descending", () => {
    const items = [gap("LOW", 1), gap("CRITICAL", 3), gap("MEDIUM", 2)];
    const sorted = sortBySeverity(items);
    expect(sorted.map((g) => g.severity)).toEqual(["CRITICAL", "MEDIUM", "LOW"]);
  });
});
