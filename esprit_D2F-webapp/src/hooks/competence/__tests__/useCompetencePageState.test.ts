import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import useCompetencePageState from "@/hooks/competence/useCompetencePageState";

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(MemoryRouter, { initialEntries: ["/competences?tab=domaines"] }, children);

describe("useCompetencePageState", () => {
  it("initializes activeTab from search params", () => {
    const { result } = renderHook(() => useCompetencePageState({ crud: {}, loadStructure: vi.fn() }), { wrapper });
    expect(result.current.activeTab).toBe("domaines");
  });

  it("normalizes sousCompetences tab to competences", () => {
    const w = ({ children }: { children: React.ReactNode }) =>
      React.createElement(MemoryRouter, { initialEntries: ["/competences?tab=sousCompetences"] }, children);
    const { result } = renderHook(() => useCompetencePageState({ crud: {}, loadStructure: vi.fn() }), { wrapper: w });
    expect(result.current.activeTab).toBe("competences");
  });

  it("handleTabChange updates activeTab and search params", () => {
    const { result } = renderHook(() => useCompetencePageState({ crud: {}, loadStructure: vi.fn() }), { wrapper });
    act(() => { result.current.handleTabChange("hierarchie"); });
    expect(result.current.activeTab).toBe("hierarchie");
  });

  it("handleStatNavigation to domaines resets consult state", () => {
    const { result } = renderHook(() => useCompetencePageState({ crud: {}, loadStructure: vi.fn() }), { wrapper });
    act(() => {
      result.current.setConsultNiveau(2);
      result.current.buildCardTrigger("domaines").onClick();
    });
    expect(result.current.consultNiveau).toBe(0);
  });

  it("buildCardTrigger returns a clickable trigger", () => {
    const { result } = renderHook(() => useCompetencePageState({ crud: {}, loadStructure: vi.fn() }), { wrapper });
    const trigger = result.current.buildCardTrigger("competences");
    expect(trigger.role).toBe("button");
    expect(typeof trigger.onClick).toBe("function");
    act(() => { trigger.onClick(); });
    expect(result.current.activeTab).toBe("hierarchie");
  });

  it("loads structure when activeTab is hierarchie", () => {
    const loadStructure = vi.fn();
    const { result } = renderHook(() => useCompetencePageState({ crud: {}, loadStructure }), { wrapper });
    act(() => { result.current.handleTabChange("hierarchie"); });
    expect(loadStructure).toHaveBeenCalled();
  });
});
