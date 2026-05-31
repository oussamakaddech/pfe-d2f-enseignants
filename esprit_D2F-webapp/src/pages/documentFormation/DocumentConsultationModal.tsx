import { Modal, Button, List, Empty, Tag, Tooltip } from "antd";
import { DownloadOutlined, FileTextOutlined } from "@ant-design/icons";
import { useDownloadDocument } from "@/hooks/document/useDocument";
import type { FormationDocument } from "@/models/document";
import useAppNotification from "@/hooks/ui/useAppNotification";

interface DocumentConsultationModalProps {
  open: boolean;
  onClose: () => void;
  titreFormation?: string;
  documents: FormationDocument[];
}

/** Nom de fichier lisible déduit du chemin serveur, sinon le nom du document. */
function fileLabel(doc: FormationDocument): string {
  if (doc.originalFileName) return doc.originalFileName;
  if (doc.filePath) {
    const parts = doc.filePath.split(/[/\\]/);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return doc.nomDocument || "Document";
}

/**
 * Modale de consultation (lecture seule) des documents d'une formation :
 * liste, type et téléchargement. Aucune action d'édition/suppression.
 */
export default function DocumentConsultationModal({ open, onClose, titreFormation, documents }: Readonly<DocumentConsultationModalProps>) {
  const { message: msgApi } = useAppNotification();
  const download = useDownloadDocument();

  const handleDownload = async (doc: FormationDocument) => {
    try {
      await download.mutateAsync(doc.idDocument);
    } catch {
      msgApi.error("Échec du téléchargement du document");
    }
  };

  return (
    <Modal
      title={`📄 Documents — ${titreFormation || "Formation"}`}
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Fermer</Button>}
      width={640}
    >
      {documents.length > 0 ? (
        <List
          dataSource={documents}
          renderItem={(doc) => (
            <List.Item
              key={String(doc.idDocument)}
              actions={[
                <Tooltip key="dl" title="Télécharger">
                  <Button
                    type="text"
                    shape="circle"
                    icon={<DownloadOutlined />}
                    loading={download.isPending}
                    onClick={() => void handleDownload(doc)}
                  />
                </Tooltip>,
              ]}
            >
              <List.Item.Meta
                avatar={<FileTextOutlined style={{ fontSize: 20, color: "#2563eb" }} />}
                title={
                  <span>
                    {doc.nomDocument || fileLabel(doc)}
                    {doc.obligation && <Tag color="red" style={{ marginLeft: 8 }}>Obligatoire</Tag>}
                  </span>
                }
                description={
                  <span>
                    {doc.pathType ? <Tag>{doc.pathType}</Tag> : null}
                    {fileLabel(doc)}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="Aucun document associé à cette formation." />
      )}
    </Modal>
  );
}
