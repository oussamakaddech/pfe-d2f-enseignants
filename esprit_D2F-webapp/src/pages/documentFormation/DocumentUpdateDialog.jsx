// DocumentUpdateDialog.jsx

import PropTypes from "prop-types";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import UpdateDocumentForm from "./UpdateDocumentForm";

const DocumentUpdateDialog = ({ open, onClose, documentData, onUpdated }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Modifier le document : {documentData.nomDocument}</DialogTitle>
      <DialogContent>
        <UpdateDocumentForm documentData={documentData} onUpdated={onUpdated} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">Annuler</Button>
      </DialogActions>
    </Dialog>
  );
};

DocumentUpdateDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  documentData: PropTypes.shape({
    idDocument: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    nomDocument: PropTypes.string.isRequired,
    originalFileName: PropTypes.string,
    obligation: PropTypes.bool,
  }).isRequired,
  onUpdated: PropTypes.func.isRequired,
};

export default DocumentUpdateDialog;
