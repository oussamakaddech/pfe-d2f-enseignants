import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AuthProvider from "../../../context/AuthProvider";
import BesoinList from "../BesoinList";
import BesoinFormationService from "../../../services/BesoinFormationService";
import DeptService from "../../../services/DeptService";
import UpService from "../../../services/upService";

vi.mock("../../../services/BesoinFormationService");
vi.mock("../../../services/DeptService");
vi.mock("../../../services/upService");

const mockBesoins = [
  {
    idBesoinFormation: 1,
    titre: "Formation React Avancé",
    objectifFormation: "Maîtriser React et ses hooks",
    username: "john.doe",
    typeBesoin: "INDIVIDUEL",
    up: "1",
    departement: "1",
    propositionAnimateur: "Jane Smith",
    horaireSouhaite: "Lundi 9h-12h",
    approuveAdmin: true,
    dateCreation: "2024-01-15T10:00:00",
  },
  {
    idBesoinFormation: 2,
    titre: "Formation Spring Boot",
    objectifFormation: "Développer des APIs REST",
    username: "alice.bob",
    typeBesoin: "COLLECTIF",
    up: "2",
    departement: "2",
    propositionAnimateur: null,
    horaireSouhaite: "Mercredi 14h-17h",
    approuveAdmin: false,
    dateCreation: "2024-01-20T10:00:00",
  },
];

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
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  );
}

describe("BesoinList", { timeout: 15000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    BesoinFormationService.getAllBesoinFormations = vi.fn().mockResolvedValue(mockBesoins);
    BesoinFormationService.approveBesoin = vi.fn().mockResolvedValue({ id: 2, approuveAdmin: true });
    BesoinFormationService.removeBesoinFormation = vi.fn().mockResolvedValue({ deleted: true });
    BesoinFormationService.modifyBesoinFormation = vi.fn().mockResolvedValue({ id: 1 });
    DeptService.getAllDepts = vi.fn().mockResolvedValue(mockDepts);
    UpService.getAllUps = vi.fn().mockResolvedValue(mockUps);
  });

  it("affiche les besoins et les actions principales", async () => {
    renderWithProviders(<BesoinList />);

    await waitFor(() => {
      expect(screen.getByText("Gestion des Besoins de Formation")).toBeInTheDocument();
    });

    expect(screen.getByText("2 résultats sur 2")).toBeInTheDocument();
    expect(screen.getByText("Exporter Excel")).toBeInTheDocument();
    expect(screen.getByText("Ajouter un besoin")).toBeInTheDocument();
    expect(screen.getByText("Formation React Avancé")).toBeInTheDocument();
    expect(screen.getByText("Formation Spring Boot")).toBeInTheDocument();
  });

  it("filtre la liste par texte de recherche", async () => {
    renderWithProviders(<BesoinList />);

    await waitFor(() => {
      expect(screen.getByText("Formation React Avancé")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Rechercher..."), {
      target: { value: "Spring" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Formation React Avancé")).not.toBeInTheDocument();
      expect(screen.getByText("Formation Spring Boot")).toBeInTheDocument();
    });
  });

  it("appelle le service d'approbation puis affiche la confirmation", async () => {
    renderWithProviders(<BesoinList />);

    await waitFor(() => {
      expect(screen.getByText("Formation Spring Boot")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /Approuver/i })[0]);

    const confirmButton = await screen.findByRole("button", { name: "Oui, approuver" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(BesoinFormationService.approveBesoin).toHaveBeenCalledWith(2);
    });
  });

  it("appelle le service de suppression", async () => {
    renderWithProviders(<BesoinList />);

    await waitFor(() => {
      expect(screen.getByText("Formation React Avancé")).toBeInTheDocument();
    });

    const deleteButton = document.querySelectorAll(".anticon-delete")[0]?.closest("button");
    expect(deleteButton).toBeTruthy();
    fireEvent.click(deleteButton);

    const confirmButton = await screen.findByRole("button", { name: "Oui" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(BesoinFormationService.removeBesoinFormation).toHaveBeenCalledWith(1);
    });
  });
});