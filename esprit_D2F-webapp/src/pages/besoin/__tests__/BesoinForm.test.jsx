import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import BesoinForm from "../BesoinForm";
import BesoinFormationService from "../../../services/BesoinFormationService";
import DeptService from "../../../services/DeptService";
import UpService from "../../../services/upService";

vi.mock("../../../services/BesoinFormationService");
vi.mock("../../../services/DeptService");
vi.mock("../../../services/upService");

const mockUser = { username: "test.user", userName: "test.user" };

const mockDepts = [
  { id: 1, name: "Informatique" },
  { id: 2, name: "Mathématiques" },
];

const mockUps = [
  { id: 1, name: "UP Info" },
  { id: 2, name: "UP Math" },
];

function renderWithProviders(ui) {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={{ user: mockUser }}>
        {ui}
      </AuthContext.Provider>
    </BrowserRouter>
  );
}

describe("BesoinForm", { timeout: 15000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DeptService.getAllDepts = vi.fn().mockResolvedValue(mockDepts);
    UpService.getAllUps = vi.fn().mockResolvedValue(mockUps);
    BesoinFormationService.addBesoinFormation = vi.fn().mockResolvedValue({ id: 1 });
  });

  it("affiche le formulaire multi-étapes", async () => {
    renderWithProviders(<BesoinForm />);

    await waitFor(() => {
      expect(screen.getByText("Ajouter un besoin en formation")).toBeInTheDocument();
    });

    expect(screen.getByText("Contexte")).toBeInTheDocument();
    expect(screen.getByText("Formation")).toBeInTheDocument();
    expect(screen.getByText("Détails")).toBeInTheDocument();
  });

  it("valide les champs requis", async () => {
    renderWithProviders(<BesoinForm />);

    await waitFor(() => {
      expect(screen.getByText("Ajouter un besoin en formation")).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: /Suivant/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText("Veuillez sélectionner l'UP")).toBeInTheDocument();
    });
  });

  it("affiche les champs de l'étape Formation après navigation", async () => {
    renderWithProviders(<BesoinForm />);

    await waitFor(() => {
      expect(screen.getByText("Unité Pédagogique (UP)")).toBeInTheDocument();
    });

    // Use label text to find and interact with selects (antd Select renders differently)
    const upSelect = screen.getByText("Unité Pédagogique (UP)").closest(".ant-form-item").querySelector(".ant-select-selector");
    fireEvent.mouseDown(upSelect);
    const upOption = await screen.findByText("UP Info");
    fireEvent.click(upOption);

    const deptSelect = screen.getByText("Département").closest(".ant-form-item").querySelector(".ant-select-selector");
    fireEvent.mouseDown(deptSelect);
    const deptOption = await screen.findByText("Informatique");
    fireEvent.click(deptOption);

    const typeSelect = screen.getByText("Type de besoin").closest(".ant-form-item").querySelector(".ant-select-selector");
    fireEvent.mouseDown(typeSelect);
    const typeOption = await screen.findByText("Individuel");
    fireEvent.click(typeOption);

    // Passer à l'étape suivante
    const nextButton = screen.getByRole("button", { name: /Suivant/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText("Nom de la formation")).toBeInTheDocument();
    });
  });

  it("affiche le récapitulatif après avoir rempli toutes les étapes", async () => {
    renderWithProviders(<BesoinForm />);

    await waitFor(() => {
      expect(screen.getByText("Unité Pédagogique (UP)")).toBeInTheDocument();
    });

    // Remplir étape 1
    const upSelect = screen.getByText("Unité Pédagogique (UP)").closest(".ant-form-item").querySelector(".ant-select-selector");
    fireEvent.mouseDown(upSelect);
    fireEvent.click(await screen.findByText("UP Info"));

    const deptSelect = screen.getByText("Département").closest(".ant-form-item").querySelector(".ant-select-selector");
    fireEvent.mouseDown(deptSelect);
    fireEvent.click(await screen.findByText("Informatique"));

    const typeSelect = screen.getByText("Type de besoin").closest(".ant-form-item").querySelector(".ant-select-selector");
    fireEvent.mouseDown(typeSelect);
    fireEvent.click(await screen.findByText("Individuel"));

    fireEvent.click(screen.getByRole("button", { name: /Suivant/i }));

    // Étape 2: Formation
    await waitFor(() => {
      expect(screen.getByText("Nom de la formation")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Ex : Formation Angular avancé"), {
      target: { value: "Formation Test" },
    });

    fireEvent.change(screen.getByPlaceholderText("Décrire l'objectif de la formation en détail..."), {
      target: { value: "Objectif test" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Suivant/i }));

    // Étape 3: Détails
    await waitFor(() => {
      expect(screen.getByText("Proposition de formateur")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Ex : Lundi 9h-12h"), {
      target: { value: "Vendredi 10h-12h" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Voir le récapitulatif/i }));

    // Étape 4: Récapitulatif
    await waitFor(() => {
      expect(screen.getByText("Récapitulatif de votre demande")).toBeInTheDocument();
    });
  });

  it("soumet le formulaire avec succès et affiche la page de succès", async () => {
    renderWithProviders(<BesoinForm />);

    await waitFor(() => {
      expect(screen.getByText("Unité Pédagogique (UP)")).toBeInTheDocument();
    });

    // Étape 1
    const upSelect = screen.getByText("Unité Pédagogique (UP)").closest(".ant-form-item").querySelector(".ant-select-selector");
    fireEvent.mouseDown(upSelect);
    fireEvent.click(await screen.findByText("UP Info"));

    const deptSelect = screen.getByText("Département").closest(".ant-form-item").querySelector(".ant-select-selector");
    fireEvent.mouseDown(deptSelect);
    fireEvent.click(await screen.findByText("Informatique"));

    const typeSelect = screen.getByText("Type de besoin").closest(".ant-form-item").querySelector(".ant-select-selector");
    fireEvent.mouseDown(typeSelect);
    fireEvent.click(await screen.findByText("Individuel"));

    fireEvent.click(screen.getByRole("button", { name: /Suivant/i }));

    // Étape 2
    await waitFor(() => expect(screen.getByPlaceholderText("Ex : Formation Angular avancé")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Ex : Formation Angular avancé"), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText("Décrire l'objectif de la formation en détail..."), { target: { value: "Obj" } });
    fireEvent.click(screen.getByRole("button", { name: /Suivant/i }));

    // Étape 3
    await waitFor(() => expect(screen.getByRole("button", { name: /Voir le récapitulatif/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Voir le récapitulatif/i }));

    // Étape 4 - Récapitulatif
    await waitFor(() => expect(screen.getByRole("button", { name: /Enregistrer le besoin/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer le besoin/i }));

    await waitFor(() => {
      expect(screen.getByText("Besoin enregistré avec succès !")).toBeInTheDocument();
    });

    expect(BesoinFormationService.addBesoinFormation).toHaveBeenCalled();
  });
});
