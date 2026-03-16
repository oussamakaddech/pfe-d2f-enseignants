/**
 * src/pages/competence/rice/__tests__/UploadStep.test.jsx
 *
 * Unit tests for the UploadStep component.
 *
 * Prerequisites (install once):
 *   npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
 *
 * Add to vite.config.js:
 *   test: { globals: true, environment: 'jsdom', setupFiles: './src/setupTests.js' }
 *
 * Run:
 *   npx vitest run src/pages/competence/rice/__tests__/UploadStep.test.jsx
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UploadStep from "../UploadStep.jsx";

// Strip Framer Motion animation props so React doesn't warn about unknown DOM attributes
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      whileHover, whileTap, whileFocus, whileDrag, whileInView,
      animate, initial, exit, transition, variants,
      drag, dragConstraints, dragElastic, dragMomentum,
      layout, layoutId,
      onAnimationStart, onAnimationComplete,
      ...props
    }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe("UploadStep", () => {
  const defaultProps = {
    files: [],
    analyzing: false,
    handleAnalyze: vi.fn(),
    handleUploadChange: vi.fn(),
    setCurrentStep: vi.fn(),
    departement: "auto",
    setDepartement: vi.fn(),
  };

  it("renders the department selector", () => {
    render(<UploadStep {...defaultProps} />);
    // The "Département" label should be present
    expect(screen.getByText("Département")).toBeTruthy();
  });

  it("disables the launch button when no files are selected", () => {
    render(<UploadStep {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /lancer l'analyse/i });
    expect(btn).toBeDisabled();
  });

  it("enables the launch button when files are present", () => {
    const file = new File(["content"], "fiche.pdf", { type: "application/pdf" });
    render(<UploadStep {...defaultProps} files={[file]} />);
    const btn = screen.getByRole("button", { name: /lancer l'analyse/i });
    expect(btn).not.toBeDisabled();
  });

  it("calls handleAnalyze when the launch button is clicked", () => {
    const handleAnalyze = vi.fn();
    const file = new File(["content"], "fiche.pdf", { type: "application/pdf" });
    render(
      <UploadStep {...defaultProps} files={[file]} handleAnalyze={handleAnalyze} />,
    );
    const btn = screen.getByRole("button", { name: /lancer l'analyse/i });
    fireEvent.click(btn);
    expect(handleAnalyze).toHaveBeenCalledTimes(1);
  });

  it("displays the selected department name in the CTA subtitle", () => {
    render(<UploadStep {...defaultProps} departement="gc" files={[new File(["x"], "f.pdf")]} />);
    // Should show 'GC' as the department badge
    expect(screen.getByText("GC")).toBeTruthy();
  });

  it("displays file count badge when files are uploaded", () => {
    const files = [
      new File(["a"], "fiche1.pdf", { type: "application/pdf" }),
      new File(["b"], "fiche2.docx"),
    ];
    render(<UploadStep {...defaultProps} files={files} />);
    expect(screen.getByText(/2 fichiers sélectionnés/i)).toBeTruthy();
  });
});
