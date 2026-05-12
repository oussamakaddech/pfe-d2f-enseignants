import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CombinedFormationOneDriveTree from "../CombinedFormationOneDriveTree";
import FormationWorkflowService from "../../../services/FormationWorkflowService";
import OneDriveService from "../../../services/OneDriveService";

vi.mock("../../../services/FormationWorkflowService", () => ({
  default: {
    getAllFormationWithDocuments: vi.fn(),
  },
}));

vi.mock("../../../services/OneDriveService", () => ({
  default: {
    getFormationHierarchy: vi.fn(),
  },
}));

vi.mock("../DocumentViewer", () => ({
  default: ({ url, ext }) => (
    <div data-testid="document-viewer">
      viewer:{ext}:{url}
    </div>
  ),
}));

vi.mock("../DocumentUploadPanel", () => ({
  default: () => <div data-testid="upload-panel">upload-panel</div>,
}));

vi.mock("../DocumentListModal", () => ({
  default: ({ open }) => (open ? <div data-testid="documents-modal">documents-modal</div> : null),
}));

const formations = [
  {
    idFormation: 1,
    titreFormation: "React Avancé",
    dateDebut: "2026-04-10T00:00:00",
    up1: { libelle: "UP Informatique" },
    departement1: { libelle: "Département IT" },
    documents: [{ id: 1 }, { id: 2 }],
  },
  {
    idFormation: 2,
    titreFormation: "Gestion RH",
    dateDebut: "2026-05-20T00:00:00",
    up1: { libelle: "UP Admin" },
    departement1: { libelle: "Département RH" },
    documents: [],
  },
];

const tree = [
  {
    id: "folder-1",
    name: "Dossiers pédagogiques",
    folder: true,
    children: [
      {
        id: "file-1",
        name: "guide.pdf",
        folder: false,
        fileSize: 2048,
        downloadUrl: "https://example.test/guide.pdf",
      },
    ],
  },
];

describe("CombinedFormationOneDriveTree", { timeout: 15000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    FormationWorkflowService.getAllFormationWithDocuments.mockResolvedValue(formations);
    OneDriveService.getFormationHierarchy.mockResolvedValue(tree);
  });

  it("affiche les formations et charge l'aperçu d'un document sélectionné", async () => {
    render(<CombinedFormationOneDriveTree />);

    await waitFor(() => {
      expect(screen.getByText("Explorer les formations et leurs dossiers")).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("React Avancé")).toBeInTheDocument();
    expect(screen.getByText("Gestion RH")).toBeInTheDocument();

    const formationItem = screen.getByText("React Avancé");
    fireEvent.click(formationItem);

    await waitFor(() => {
      expect(OneDriveService.getFormationHierarchy).toHaveBeenCalledWith(1);
      expect(screen.getByText("Dossiers pédagogiques")).toBeInTheDocument();
    }, { timeout: 5000 });

    fireEvent.click(screen.getByText("guide.pdf"));

    await waitFor(() => {
      expect(screen.getByTestId("document-viewer")).toHaveTextContent("viewer:pdf:https://example.test/guide.pdf");
      expect(screen.getByText("2.0 Ko")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("filtre les formations par texte", async () => {
    render(<CombinedFormationOneDriveTree />);

    await waitFor(() => {
      expect(screen.getByText("React Avancé")).toBeInTheDocument();
    }, { timeout: 5000 });

    fireEvent.change(screen.getByPlaceholderText(/rechercher une formation/i), {
      target: { value: "RH" },
    });

    await waitFor(() => {
      expect(screen.queryByText("React Avancé")).not.toBeInTheDocument();
      expect(screen.getByText("Gestion RH")).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
