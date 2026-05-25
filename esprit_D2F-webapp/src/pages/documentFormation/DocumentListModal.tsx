// DocumentListModal.jsx
import { useState } from "react";
import { Modal, Button, List, Empty } from "antd";
import { EditOutlined, PlusOutlined, CloseOutlined } from "@ant-design/icons";
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
    <Modal
      title={`📝 Documents pour : ${formation.titreFormation}`}
      open={open}
      onCancel={onClose}
      footer={
        <Button onClick={onClose} danger>
          Fermer
        </Button>
      }
      width={720}
    >
      {(formation.documents?.length ?? 0) > 0 ? (
        <List
          dataSource={formation.documents}
          renderItem={(doc) => (
            <List.Item
              key={doc.idDocument}
              actions={[
                <Button
                  key="edit"
                  type={selectedDocId === doc.idDocument ? "default" : "primary"}
                  danger={selectedDocId !== doc.idDocument}
                  icon={selectedDocId === doc.idDocument ? <CloseOutlined /> : <EditOutlined />}
                  onClick={() => setSelectedDocId(selectedDocId === doc.idDocument ? null : doc.idDocument)}
                >
                  {selectedDocId === doc.idDocument ? "Annuler" : "Modifier"}
                </Button>
              ]}
            >
              <List.Item.Meta
                title={doc.nomDocument}
                description={doc.originalFileName || "Fichier non défini"}
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="😕 Aucun document associé à cette formation." />
      )}
      <div style={{ marginTop: "1rem", textAlign: "center" }}>
        {showCreateForm ? (
          <DocumentCreateForm
            formationId={formation.idFormation}
            onDocumentCreated={handleDocumentCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        ) : (
          <Button type="dashed" danger icon={<PlusOutlined />} onClick={() => setShowCreateForm(true)}>
            Ajouter un document
          </Button>
        )}
      </div>
      {formation.documents?.map((doc) => (
        selectedDocId === doc.idDocument && (
          <div key={`edit-${doc.idDocument}`} style={{ marginTop: "1rem" }}>
            <UpdateDocumentForm documentData={doc} onUpdated={handleUpdateComplete} />
          </div>
        )
      ))}
    </Modal>
  );
};

export default DocumentListModal;




