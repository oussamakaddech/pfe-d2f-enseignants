// FormationTreeInterface.jsx
import  { useEffect, useState } from "react";
import FormationWorkflowService from "../services/FormationWorkflowService";
import OneDriveService from "../services/OneDriveService";

const FormationTreeInterface = () => {
    const [formations, setFormations] = useState([]);
    const [selectedFormation, setSelectedFormation] = useState(null);
    const [oneDriveTree, setOneDriveTree] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [expandedNodes, setExpandedNodes] = useState({});
  
    // Chargement des formations avec documents (métadonnées en BDD)
    useEffect(() => {
      async function fetchFormations() {
        try {
          const data = await FormationWorkflowService.getAllFormationsWithDocuments();
          setFormations(data);
        } catch (error) {
          console.error("Erreur lors de la récupération des formations :", error);
        }
      }
      fetchFormations();
    }, []);
  
    // Lorsqu'une formation est sélectionnée, chargez l'arborescence réelle depuis OneDrive pour ce dossier
    useEffect(() => {
      async function fetchOneDriveTree() {
        if (selectedFormation) {
          try {
            const tree = await OneDriveService.getDriveHierarchyForFormation(selectedFormation.titreFormation);
            setOneDriveTree(tree);
          } catch (error) {
            console.error("Erreur lors du chargement de la hiérarchie OneDrive :", error);
          }
        }
      }
      fetchOneDriveTree();
    }, [selectedFormation]);
  
    const toggleNode = (nodeId) => {
      setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
    };
  
    // Rendu récursif de l'arborescence OneDrive
    const renderOneDriveTree = (nodes) => {
      if (!nodes || nodes.length === 0) return <p>Aucun fichier trouvé.</p>;
      return (
        <ul style={{ listStyle: "none", marginLeft: "10px" }}>
          {nodes.map((node) => {
            const isFolder = node.folder;
            const isExpanded = expandedNodes[node.id] || false;
            return (
              <li key={node.id} style={{ marginBottom: "5px" }}>
                {isFolder ? (
                  <div
                    style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                    onClick={() => toggleNode(node.id)}
                  >
                    <span style={{ marginRight: "5px" }}>
                      {isExpanded ? "▼" : "▶"}
                    </span>
                    <strong>📁 {node.name}</strong>
                  </div>
                ) : (
                  <div
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedFile(node)}
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
          {formations.map((formation) => (
            <li
              key={formation.idFormation}
              className="list-group-item list-group-item-action"
              onClick={() => {
                setSelectedFormation(formation);
                setSelectedFile(null);
                setOneDriveTree([]); // Réinitialisez l'arbre lors d'une nouvelle sélection
              }}
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
                      // Par exemple, dans OneDriveService, vous pouvez définir les paramètres nécessaires
                      await OneDriveService.deleteFile(
                        selectedFormation.titreFormation,
                        selectedFile.folder ? selectedFile.name : "dossier_parent", // selon l'organisation
                        selectedFile.name  // ici, on utilise le nom du fichier
                      );
                      // Rechargez l'arborescence après suppression
                      const tree = await OneDriveService.getDriveHierarchyForFormation(selectedFormation.titreFormation);
                      setOneDriveTree(tree);
                      setSelectedFile(null);
                    } catch (error) {
                      console.error("Erreur lors de la suppression du fichier :", error);
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
