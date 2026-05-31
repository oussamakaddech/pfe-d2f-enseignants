import { useState, type ReactNode } from "react";
import { useFormationsWithDocuments } from "@/hooks/formation/useFormations";
import { useFormationHierarchy, useDeleteOneDriveFile } from "@/hooks/api/useOneDrive";

interface Formation {
  idFormation?: string | number;
  titreFormation?: string;
}

interface OneDriveNode {
  id?: string;
  name?: string;
  folder?: unknown;
  children?: OneDriveNode[];
  fileSize?: number;
  downloadUrl?: string;
}

const FormationTreeInterface = () => {
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [selectedFile, setSelectedFile] = useState<OneDriveNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const { data: formations = [] } = useFormationsWithDocuments();
  const { data: oneDriveTree = [] } = useFormationHierarchy(selectedFormation?.idFormation);
  const { mutateAsync: deleteOneDriveFile } = useDeleteOneDriveFile();

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const renderOneDriveTree = (nodes: OneDriveNode[]): ReactNode => {
    if (!nodes || nodes.length === 0) return <p>Aucun fichier trouvé.</p>;
    return (
      <ul style={{ listStyle: "none", marginLeft: "10px" }}>
        {nodes.map((node) => {
          const isFolder = node.folder;
          const isExpanded = expandedNodes[node.id ?? ""] || false;
          return (
            <li key={node.id} style={{ marginBottom: "5px" }}>
              {isFolder ? (
                <div
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                  onClick={() => toggleNode(node.id ?? "")}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleNode(node.id ?? ""); } }}
                >
                  <span style={{ marginRight: "5px" }}>
                    {isExpanded ? "▼" : "▶"}
                  </span>
                  <strong>📁 {node.name}</strong>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedFile(node)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedFile(node); } }}
                >
                  📄 {node.name}
                </div>
              )}
              {!!isFolder && isExpanded && node.children && (
                <div style={{ marginLeft: "20px", borderLeft: "1px dashed #ccc", paddingLeft: "10px" }}>
                  {renderOneDriveTree(node.children)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderFormationList = () => {
    if (!formations.length) return <p>Aucune formation disponible.</p>;
    return (
      <ul className="list-group">
        {(formations as Formation[]).map((formation) => (
          <li
            key={String(formation.idFormation)}
            tabIndex={0}
            className="list-group-item list-group-item-action"
            onClick={() => { setSelectedFormation(formation); setSelectedFile(null); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedFormation(formation); setSelectedFile(null); } }}
            style={{ cursor: "pointer" }}
          >
            {formation.titreFormation}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="container-fluid mt-3">
      <div className="row">
        <div className="col-md-3" style={{ border: "1px solid #ccc", minHeight: "500px", overflowY: "auto" }}>
          <h5>Formations</h5>
          {renderFormationList()}
        </div>

        <div className="col-md-4" style={{ border: "1px solid #ccc", minHeight: "500px", overflowY: "auto" }}>
          <h5>
            Fichiers OneDrive {selectedFormation ? `(${selectedFormation.titreFormation})` : ""}
          </h5>
          {selectedFormation ? renderOneDriveTree(oneDriveTree as OneDriveNode[]) : <p>Sélectionnez une formation.</p>}
        </div>

        <div className="col-md-5" style={{ border: "1px solid #ccc", minHeight: "500px", padding: "15px" }}>
          <h5>Visionneuse de document</h5>
          {selectedFile ? (
            <div>
              <h6>{selectedFile.name}</h6>
              <p>
                <strong> Taille :</strong>{" "}
                {selectedFile.fileSize ? selectedFile.fileSize + " octets" : "N/A"}
              </p>
              {selectedFile.downloadUrl ? (
                <>
                  <p>
                    <strong>Ouvrir :</strong>{" "}
                    <a href={selectedFile.downloadUrl} target="_blank" rel="noopener noreferrer">
                      Télécharger / Ouvrir
                    </a>
                  </p>
                  {selectedFile.name?.toLowerCase().endsWith(".pdf") && (
                    <iframe
                      src={selectedFile.downloadUrl}
                      title={selectedFile.name}
                      style={{ width: "100%", height: "400px", border: "none" }}
                    ></iframe>
                  )}
                </>
              ) : (
                <p>Aucun lien disponible.</p>
              )}
              <button
                className="btn btn-danger mt-2"
                onClick={async () => {
                  try {
                    await deleteOneDriveFile({
                      nomFormation: selectedFormation?.titreFormation ?? "",
                      nomDocument: selectedFile.folder ? (selectedFile.name ?? "") : "dossier_parent",
                      originalFileName: selectedFile.name ?? ""
                    });
                    setSelectedFile(null);
                  } catch {
                    // silently handle
                  }
                }}
              >
                Supprimer
              </button>
            </div>
          ) : (
            <p>Sélectionnez un fichier dans l'arborescence pour voir ses détails.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormationTreeInterface;
