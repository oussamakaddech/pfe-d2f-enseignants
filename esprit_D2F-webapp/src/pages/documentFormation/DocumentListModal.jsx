// DocumentListModal.jsx
import  { useState } from "react";
import PropTypes from "prop-types";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, Typography } from "@mui/material";
import UpdateDocumentForm from "./UpdateDocumentForm";
import DocumentCreateForm from "./DocumentCreateForm";

const DocumentListModal = ({ open, onClose, formation, onDocumentsUpdated }) => {
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleUpdateComplete = (updatedDoc) => {
    onDocumentsUpdated(updatedDoc);
    setSelectedDocId(null);
  };

  const handleDocumentCreated = (newDoc) => {
    onDocumentsUpdated(newDoc);
    setShowCreateForm(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>📝 Documents pour : {formation.titreFormation}</DialogTitle>
      <DialogContent dividers>
        {formation.documents && formation.documents.length > 0 ? (
          <List>
            {formation.documents.map((doc) => (
              <ListItem key={doc.idDocument} style={{ display: "block", borderBottom: "1px solid #ddd", marginBottom: "1rem", paddingBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <ListItemText primary={doc.nomDocument} secondary={doc.originalFileName || "Fichier non défini"} />
                  <Button
                    variant="contained"
                    onClick={() => setSelectedDocId(selectedDocId === doc.idDocument ? null : doc.idDocument)}
                    style={{ backgroundColor: "red", color: "white" }}
                  >
                    {selectedDocId === doc.idDocument ? "Annuler" : "Modifier"}
                  </Button>
                </div>
                {selectedDocId === doc.idDocument && (
                  <div style={{ marginTop: "1rem" }}>
                    <UpdateDocumentForm documentData={doc} onUpdated={handleUpdateComplete} />
                  </div>
                )}
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body1">😕 Aucun document associé à cette formation.</Typography>
        )}
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          {showCreateForm ? (
            <DocumentCreateForm
              formationId={formation.idFormation}
              onDocumentCreated={handleDocumentCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          ) : (
            <Button variant="outlined" onClick={() => setShowCreateForm(true)} style={{ color: "red", borderColor: "red" }}>
              ➕ Ajouter un document
            </Button>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" style={{ color: "red", borderColor: "red" }}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

DocumentListModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  formation: PropTypes.shape({
    idFormation: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    titreFormation: PropTypes.string.isRequired,
    documents: PropTypes.arrayOf(
      PropTypes.shape({
        idDocument: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
        nomDocument: PropTypes.string.isRequired,
        originalFileName: PropTypes.string,
        obligation: PropTypes.bool,
      })
    ),
  }).isRequired,
  onDocumentsUpdated: PropTypes.func.isRequired,
};

export default DocumentListModal;
