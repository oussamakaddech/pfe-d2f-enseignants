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

  it("affiche le titre et les statistiques", async () => {
    renderWithProviders(<BesoinList />);

    await waitFor(() => {
      expect(screen.getByText("Gestion des Besoins de Formation")).toBeInTheDocument();
    });

    expect(screen.getByText("2")).toBeInTheDocument(); // Total
    expect(screen.getByText("Besoins approuvés")).toBeInTheDocument();
    expect(screen.getAllByText("En attente").length).toBeGreaterThanOrEqual(1);
  });

  it("affiche la liste des besoins dans le tableau", async () => {
    renderWithProviders(<BesoinList />);

    await waitFor(() => {
      expect(screen.getByText("Formation React Avancé")).toBeInTheDocument();
      expect(screen.getByText("Formation Spring Boot")).toBeInTheDocument();
    });

    expect(screen.getByText("john.doe")).toBeInTheDocument();
    expect(screen.getByText("alice.bob")).toBeInTheDocument();
  });

  it("filtre par texte de recherche", async () => {
    renderWithProviders(<BesoinList />);

    await waitFor(() => {
      expect(screen.getByText("Formation React Avancé")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Rechercher...");
    fireEvent.change(searchInput, { target: { value: "Spring" } });

    await waitFor(() => {
      expect(screen.queryByText("Formation React Avancé")).not.toBeInTheDocument();
      expect(screen.getByText("Formation Spring Boot")).toBeInTheDocument();
    });
  });

  it("affiche les badges de statut correctement", async () => {
    renderWithProviders(<BesoinList />);

    await waitFor(() => {
      expect(screen.getByText("Approuvé")).toBeInTheDocument();
      expect(screen.getAllByText("En attente").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("appelle le service d'approbation lors du clic sur Approuver", async () => {
    renderWithProviders(<BesoinList />);

    await waitFor(() => {
      expect(screen.getByText("Formation Spring Boot")).toBeInTheDocument();
    });

    // Find approve buttons using document (CheckCircleOutlined inside button)
    const approveIcons = document.querySelectorAll('.ant-btn .anticon-check-circle');
    expect(approveIcons.length).toBeGreaterThan(0);
    // Click the parent button
    const btn = approveIcons[0].closest('button');
    expect(btn).toBeTruthy();
    fireEvent.click(btn);

    await waitFor(() => {
      expect(BesoinFormationService.approveBesoin).toHaveBeenCalledWith(2);
    });
  });

  it("appelle le service de suppression lors du clic sur Supprimer", async () => {
    renderWithProviders(<BesoinList />);

    await waitFor(() => {
      expect(screen.getByText("Formation React Avancé")).toBeInTheDocument();
    });

    // Find delete button using document
    const deleteButtons = document.querySelectorAll('.anticon-delete');
    expect(deleteButtons.length).toBeGreaterThan(0);
    const btn = deleteButtons[0].closest('button');
    fireEvent.click(btn);

    // Popconfirm is rendered in a portal - use document.body to find it
    await waitFor(() => {
      const confirmBtn = document.querySelector('.ant-popconfirm .ant-popconfirm-buttons .ant-btn-primary');
      expect(confirmBtn).toBeTruthy();
    });

    const confirmBtn = document.querySelector('.ant-popconfirm .ant-popconfirm-buttons .ant-btn-primary');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(BesoinFormationService.removeBesoinFormation).toHaveBeenCalledWith(1);
    });
  });

  it("affiche le bouton pour ajouter un besoin", async () => {
    renderWithProviders(<BesoinList />);

    await waitFor(() => {
      expect(screen.getByText("Ajouter un besoin")).toBeInTheDocument();
    });
  });
});
