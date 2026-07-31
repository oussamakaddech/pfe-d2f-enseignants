import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfigProvider } from "antd";
import { ApiErrorBanner } from "./ApiErrorBanner";
import { ApiClientError } from "../api/client";
import { QualityTag } from "./QualityTag";
import type { ReactNode } from "react";

function wrap(node: ReactNode) {
  return render(<ConfigProvider>{node}</ConfigProvider>);
}

describe("ApiErrorBanner", () => {
  it("renders friendly message for insufficient historical data", () => {
    const error = new ApiClientError(409, "pas assez de données", [
      { code: "INSUFFICIENT_HISTORICAL_DATA", message: "pas assez de données", details: [] },
    ]);
    wrap(<ApiErrorBanner error={error} />);
    expect(screen.getByText("Historique insuffisant")).toBeInTheDocument();
  });

  it("renders friendly message for legacy ids", () => {
    const error = new ApiClientError(422, "id legacy", [
      { code: "LEGACY_ID_NOT_ALLOWED", message: "id legacy", details: [] },
    ]);
    wrap(<ApiErrorBanner error={error} />);
    expect(screen.getByText("Identifiant legacy rejeté")).toBeInTheDocument();
  });

  it("falls back to generic banner for unknown errors", () => {
    wrap(<ApiErrorBanner error={new Error("boom")} />);
    expect(screen.getByText("Erreur inattendue")).toBeInTheDocument();
  });
});

describe("QualityTag", () => {
  it("renders a tag for COMPLETE status", () => {
    wrap(<QualityTag status="COMPLETE" />);
    expect(screen.getByText("COMPLETE")).toBeInTheDocument();
  });
});
