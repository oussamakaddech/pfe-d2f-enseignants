// FormationTreeInterface.jsx
import  { useEffect, useState } from "react";
import { useFormationsWithDocuments } from "@/hooks/formation/useFormations";
import { useFormationHierarchy, useDeleteOneDriveFile } from "@/hooks/api/useOneDrive";

const FormationTreeInterface = () => {
    const [selectedFormation, setSelectedFormation] = useState<any>(null);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [expandedNodes, setExpandedNodes] = useState<any>({});
  
    const { data: formations = [] } = useFormationsWithDocuments();
    const { data: oneDriveTree = [] } = useFormationHierarchy(selectedFormation?.idFormation);
    const { mutateAsync: deleteOneDriveFile } = useDeleteOneDriveFile();
  
    const toggleNode = (nodeId: any) => {
      setExpandedNodes((prev: any) => ({ ...prev, [nodeId]: !prev[nodeId] }));
    };
  
    // Rendu récursif de l'arborescence OneDrive
    const renderOneDriveTree = (nodes: any) => {
      if (!nodes || nodes.length === 0) return <p>Aucun fichier trouvé.</p>;
      return (
        <ul style={{ listStyle: "none", marginLeft: "10px" }}>
          {nodes.map((node: any) => {
            const isFolder = node.folder;
            const isExpanded = expandedNodes[node.id] || false;
            return (
              <li key={node.id} style={{ marginBottom: "5px" }}>
                {isFolder ? (
                  <div
                    role="button"
                    tabIndex={0}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                    onClick={() => toggleNode(node.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleNode(node.id); } }}
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
                {isFolder && isExpanded && node.children && (
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
  
    // Rendu de la liste des formations
    const renderFormationList = () => {
      if (!formations.length) return <p>Aucune formation disponible.</p>;
      return (
        <ul className="list-group">
          {formations.map((formation: any) => (
            <li
              key={formation.idFormation}
              role="button"
              tabIndex={0}
              className="list-group-item list-group-item-action"
              onClick={() => {
                setSelectedFormation(formation);
                setSelectedFile(null);
              }}
              onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedFormation(formation); setSelectedFile(null); } }}
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
          {/* Zone de gauche : liste des formations */}
          <div className="col-md-3" style={{ border: "1px solid #ccc", minHeight: "500px", overflowY: "auto" }}>
            <h5>Formations</h5>
            {renderFormationList()}
          </div>
  
          {/* Zone centrale : Arborescence OneDrive */}
          <div className="col-md-4" style={{ border: "1px solid #ccc", minHeight: "500px", overflowY: "auto" }}>
            <h5>
              Fichiers OneDrive {selectedFormation ? `(${selectedFormation.titreFormation})` : ""}
            </h5>
            {selectedFormation ? renderOneDriveTree(oneDriveTree) : <p>Sélectionnez une formation.</p>}
          </div>
  
          {/* Zone de droite : Visionneuse & actions CRUD */}
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
                    {selectedFile.name.toLowerCase().endsWith(".pdf") && (
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
                {/* Bouton de suppression (exemple) */}
                <button
                  className="btn btn-danger mt-2"
                  onClick={async () => {
                    try {
                      await deleteOneDriveFile({
                        nomFormation: selectedFormation?.titreFormation,
                        nomDocument: selectedFile.folder ? selectedFile.name : "dossier_parent",
                        originalFileName: selectedFile.name
                      });
                      setSelectedFile(null);
                    } catch {
                      // silently handle
                    }
                  }}
                >
                  Supprimer
                </button>
                {/* Vous pouvez ajouter un formulaire d'upload pour remplacer le fichier */}
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








