// DocumentUpdateDialog.jsx

import { Modal } from "antd";
import UpdateDocumentForm from "./UpdateDocumentForm";

const DocumentUpdateDialog = ({ open, onClose, documentData, onUpdated }) => {
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
