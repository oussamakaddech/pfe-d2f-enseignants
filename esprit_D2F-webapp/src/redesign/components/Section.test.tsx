import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Section, Card } from "@/redesign/components/Section";

describe("Section", () => {
  it("affiche le titre et le sous-titre", () => {
    render(<Section title="Titre" subtitle="Sous-titre">contenu</Section>);
    expect(screen.getByText("Titre")).toBeInTheDocument();
    expect(screen.getByText("Sous-titre")).toBeInTheDocument();
    expect(screen.getByText("contenu")).toBeInTheDocument();
  });
  it("affiche l'extra", () => {
    render(<Section title="T" extra={<button>Action</button>}>x</Section>);
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });
  it("rend un id lorsque fourni", () => {
    const { container } = render(<Section title="T" id="sec-1">x</Section>);
    expect(container.querySelector("#sec-1")).toBeInTheDocument();
  });
});

describe("Card", () => {
  it("affiche le titre et le contenu", () => {
    render(<Card title="Ma carte">corps</Card>);
    expect(screen.getByText("Ma carte")).toBeInTheDocument();
    expect(screen.getByText("corps")).toBeInTheDocument();
  });
  it("affiche le skeleton quand loading", () => {
    const { container } = render(<Card title="T" loading>corps</Card>);
    expect(container.querySelector(".cd-skel")).toBeInTheDocument();
    expect(screen.queryByText("corps")).not.toBeInTheDocument();
  });
  it("card interactive déclenche onClick", () => {
    const onClick = vi.fn();
    render(<Card title="T" interactive onClick={onClick}>x</Card>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  it("card non interactive ne déclenche pas onClick (pas de button)", () => {
    const { container } = render(<Card title="T">x</Card>);
    expect(container.querySelector("button")).toBeNull();
  });
});
