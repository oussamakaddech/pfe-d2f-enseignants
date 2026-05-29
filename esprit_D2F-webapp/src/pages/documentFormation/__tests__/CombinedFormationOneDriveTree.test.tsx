import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CombinedFormationOneDriveTree from "../CombinedFormationOneDriveTree";
import { useFormationsWithDocuments } from "@/hooks/formation/useFormations";
import { useFormationHierarchy } from "@/hooks/api/useOneDrive";

vi.mock("antd", () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Row: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Col: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <button {...props}>{children}</button>,
  Input: {
    Search: ({ placeholder, value, onChange, onSearch }: { placeholder?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; onSearch?: (v: string) => void }) => (
      <input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter") {
            onSearch?.((event.target as HTMLInputElement).value);
          }
        }}
      />
    ),
  },
  DatePicker: {
    RangePicker: () => <div data-testid="range-picker" />,
  },
  Modal: ({ open, children }: { open?: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  notification: { success: vi.fn() },
  Typography: {
    Title: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    Paragraph: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  },
  Space: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Statistic: ({ title, value }: { title?: string; value?: number }) => (
    <div>
      <span>{title}</span>
      <span>{value}</span>
    </div>
  ),
}));

vi.mock("@/hooks/formation/useFormations", () => ({
  useFormationsWithDocuments: vi.fn(),
}));

vi.mock("@/hooks/api/useOneDrive", () => ({
  useFormationHierarchy: vi.fn(),
}));

vi.mock("../components/FormationListPanel", () => ({
  FormationListPanel: ({ formations, onSelect }: { formations: Array<{ idFormation: number; titreFormation: string }>; onSelect: (f: { idFormation: number; titreFormation: string }) => void }) => (
    <div data-testid="formation-list">
      {formations.map((formation) => (
        <button key={formation.idFormation} type="button" onClick={() => onSelect(formation)}>
          {formation.titreFormation}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../components/OneDriveTreePanel", () => ({
  OneDriveTreePanel: ({ selectedFormation, treeData, onSelectTree }: { selectedFormation?: { titreFormation: string }; treeData: Array<{ key: string; title: string; raw: unknown; children?: Array<{ key: string; title: string; raw: unknown }> }>; onSelectTree: (p: unknown, n: { node: { isLeaf: boolean; raw: unknown } }) => void }) => (
    <div data-testid="tree-panel">
      <div>{selectedFormation ? selectedFormation.titreFormation : "no-formation"}</div>
      {treeData.flatMap((node) =>
        (node.children ?? []).map((child) => (
          <button
            key={child.key}
            type="button"
            onClick={() => onSelectTree([], { node: { isLeaf: true, raw: child.raw } })}
          >
            {child.title}
          </button>
        ))
      )}
    </div>
  ),
}));

vi.mock("../components/FilePreviewPanel", () => ({
  FilePreviewPanel: ({ selectedFile }: { selectedFile?: { name: string; downloadUrl: string } }) => (
    <div data-testid="preview-panel">
      {selectedFile ? `${selectedFile.name}:${selectedFile.downloadUrl}` : "empty-preview"}
    </div>
  ),
}));

vi.mock("../DocumentListModal", () => ({
  default: ({ open }: { open?: boolean }) => (open ? <div data-testid="documents-modal">documents-modal</div> : null),
}));

vi.mock("../DocumentUploadPanel", () => ({
  default: () => <div data-testid="upload-panel">upload-panel</div>,
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

describe.skip("CombinedFormationOneDriveTree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useFormationsWithDocuments as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: formations,
      isLoading: false,
    });
    (useFormationHierarchy as unknown as ReturnType<typeof vi.fn>).mockImplementation((idFormation) => ({
      data: idFormation ? tree : undefined,
      isLoading: false,
      refetch: vi.fn(),
    }));
  });

  it("affiche les formations et charge l'aperçu d'un document sélectionné", async () => {
    render(<CombinedFormationOneDriveTree />);

    expect(screen.getByText("Explorer les formations et leurs dossiers")).toBeInTheDocument();

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "React Avancé" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gestion RH" })).toBeInTheDocument();

    const formationItem = screen.getByRole("button", { name: "React Avancé" });
    fireEvent.click(formationItem);

    expect(screen.getByTestId("tree-panel")).toHaveTextContent("React Avancé");
    expect(screen.getByRole("button", { name: "guide.pdf" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "guide.pdf" }));

    expect(screen.getByTestId("preview-panel")).toHaveTextContent("guide.pdf:https://example.test/guide.pdf");
  });

  it("filtre les formations par texte", () => {
    render(<CombinedFormationOneDriveTree />);

    expect(screen.getByText("React Avancé")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/rechercher une formation/i), {
      target: { value: "RH" },
    });

    expect(screen.queryByText("React Avancé")).not.toBeInTheDocument();
    expect(screen.getByText("Gestion RH")).toBeInTheDocument();
  });
});




