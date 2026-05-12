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

const mockUser = { username: "test.user", userName: "test.user", role: "Enseignant" };

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

function openSelect(labelText) {
  const field = screen.getByText(labelText).closest(".ant-form-item");
  return field.querySelector(".ant-select-selector");
}

async function chooseSelect(labelText, optionText) {
  fireEvent.mouseDown(openSelect(labelText));
  await waitFor(() => {
    const optionContent = Array.from(document.querySelectorAll(".ant-select-item-option-content")).find(
      (element) => element.textContent && element.textContent.trim() === optionText
    );
    const option = optionContent?.closest(".ant-select-item-option");
    expect(option).toBeTruthy();
    fireEvent.click(option);
  });
}

async function chooseOptionByRole(labelText, optionName) {
  fireEvent.mouseDown(openSelect(labelText));
  await waitFor(() => {
    const option = screen.getByRole("option", { name: optionName });
    fireEvent.click(option);
  });
}

describe("BesoinForm", { timeout: 30000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DeptService.getAllDepts = vi.fn().mockResolvedValue(mockDepts);
    UpService.getAllUps = vi.fn().mockResolvedValue(mockUps);
    BesoinFormationService.addBesoinFormation = vi.fn().mockResolvedValue({ id: 1 });
  });

  it("affiche les étapes et bloque la progression sans sélection", async () => {
    renderWithProviders(<BesoinForm />);

    await waitFor(() => {
      expect(screen.getByText("Ajouter un besoin en formation")).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText("Contexte")).toBeInTheDocument();
    expect(screen.getByText("Formation")).toBeInTheDocument();
    expect(screen.getByText("Détails")).toBeInTheDocument();
    expect(screen.getByText("Paramètres")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Suivant/i }));

    await waitFor(() => {
      expect(screen.getByText("Veuillez sélectionner l'UP")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("permet de parcourir le formulaire et de soumettre un besoin", async () => {
    renderWithProviders(<BesoinForm />);

    await waitFor(() => {
      expect(screen.getByText("Ajouter un besoin en formation")).toBeInTheDocument();
    }, { timeout: 5000 });

    await chooseSelect("Unité Pédagogique (UP)", "UP Info");
    await chooseSelect("Département", "Informatique");
    await chooseSelect("Type de besoin", "Individuel");

    fireEvent.click(screen.getByRole("button", { name: /Suivant/i }));

    await waitFor(() => {
      expect(screen.getByText("Nom de la formation")).toBeInTheDocument();
    }, { timeout: 5000 });

    fireEvent.change(screen.getByPlaceholderText("Ex : Formation Angular avancé"), {
      target: { value: "Formation Test" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ex : Informatique, Management..."), {
      target: { value: "Informatique" },
    });
    fireEvent.change(screen.getByPlaceholderText("Décrire l'objectif général..."), {
      target: { value: "Objectif général" },
    });
    fireEvent.change(screen.getByPlaceholderText("Détails des compétences à acquérir..."), {
      target: { value: "Compétences ciblées" },
    });
    await chooseSelect("Priorité (Urgence)", "Haute");

    fireEvent.click(screen.getByRole("button", { name: /Suivant/i }));

    await waitFor(() => {
      expect(screen.getByText("Proposition de formateur")).toBeInTheDocument();
    }, { timeout: 5000 });

    fireEvent.change(screen.getByPlaceholderText("Nom du formateur proposé (optionnel)"), {
      target: { value: "Formateur Test" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ex : 40"), {
      target: { value: "40" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ex : 20"), {
      target: { value: "20" },
    });
    await chooseSelect("Période de formation", "Période 1");

    fireEvent.click(screen.getByRole("button", { name: /Suivant/i }));

    await waitFor(() => {
      expect(screen.getByText(/Autres informations/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    fireEvent.click(screen.getByRole("button", { name: /Voir le récapitulatif/i }));

    await waitFor(() => {
      expect(screen.getByText("Récapitulatif de votre demande")).toBeInTheDocument();
    }, { timeout: 5000 });
    
    screen.debug(screen.getByText("Récapitulatif de votre demande").parentElement);

    expect(screen.getByText(/Formation Test/i)).toBeInTheDocument();
    expect(screen.getByText(/Période 1/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Enregistrer le besoin/i }));

    await waitFor(() => {
      expect(screen.getByText("Besoin enregistré avec succès !")).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(BesoinFormationService.addBesoinFormation).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "test.user",
        typeBesoin: "INDIVIDUEL",
        up: "1",
        departement: "1",
        titre: "Formation Test",
        objectifFormation: "Objectif général",
        priorite: "HAUTE",
        periodCode: "P1",
      })
    );
  });
});