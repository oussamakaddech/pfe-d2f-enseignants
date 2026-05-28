import { Modal } from "antd";
import UpdateDocumentForm from "./UpdateDocumentForm";
import type { FormationDocument } from "@/models/document";

interface DocumentUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  documentData: FormationDocument;
  onUpdated: (doc: FormationDocument | null) => void;
}

const DocumentUpdateDialog = ({ open, onClose, documentData, onUpdated }: DocumentUpdateDialogProps) => {
  return (
    <Modal
      title={`Modifier le document : ${documentData.nomDocument}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <UpdateDocumentForm documentData={documentData} onUpdated={onUpdated} />
    </Modal>
  );
};

export default DocumentUpdateDialog;




