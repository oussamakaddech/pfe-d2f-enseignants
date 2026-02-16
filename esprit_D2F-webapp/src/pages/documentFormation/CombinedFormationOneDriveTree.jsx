// src/components/CombinedFormationOneDriveTree.jsx
import  { useEffect, useState, useCallback } from "react";
import {
  Layout,
  Row,
  Col,
  Button,
  Input,
  DatePicker,
  Tree,
  Modal,
  List,
  notification,
  Typography,
  Space,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  FolderOpenOutlined,
  FileOutlined,
} from "@ant-design/icons";
import FormationWorkflowService from "../../services/FormationWorkflowService";
import OneDriveService from "../../services/OneDriveService";
import DocumentViewer from "./DocumentViewer";
import DocumentListModal from "./DocumentListModal";
import DocumentUploadPanel from "./DocumentUploadPanel";

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

export default function CombinedFormationOneDriveTree() {
  // États
  const [formations, setFormations] = useState([]);
  const [filteredFormations, setFilteredFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState(null);

  const [treeData, setTreeData] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState([]);

  // 1️⃣ Chargement des formations
  useEffect(() => {
    FormationWorkflowService.getAllFormationWithDocuments()
      .then((data) => {
        setFormations(data);
        setFilteredFormations(data);
      })
      .catch((err) => {
        console.error(err);
        notification.error({ message: "Erreur de chargement des formations" });
      });
  }, []);

  // 2️⃣ Filtrer par texte et date
  useEffect(() => {
    let result = formations;
    if (searchText) {
      const txt = searchText.toLowerCase();
      result = result.filter(
        (f) =>
          f.titreFormation.toLowerCase().includes(txt) ||
          String(f.dateDebut).includes(txt) ||
          f.up1?.libelle.toLowerCase().includes(txt) ||
          f.departement1?.libelle.toLowerCase().includes(txt)
      );
    }
    if (dateRange.length === 2) {
      const [from, to] = dateRange;
      result = result.filter((f) => {
        const d = f.dateDebut.split("T")[0];
        return (
          d >= from.format("YYYY-MM-DD") && d <= to.format("YYYY-MM-DD")
        );
      });
    }
    setFilteredFormations(result);
  }, [searchText, dateRange, formations]);

  // 3️⃣ Charger l’arbo OneDrive
  const loadTree = useCallback(() => {
    if (!selectedFormation) {
      setTreeData([]);
      return;
    }
    OneDriveService.getFormationHierarchy(
      selectedFormation.idFormation
    )
      .then((nodes) => {
        const toTree = (n) => ({
          title: n.name,
          key: n.id,
          icon: n.folder ? <FolderOpenOutlined /> : <FileOutlined />,
          isLeaf: !n.folder,
          children: n.children?.map(toTree),
          raw: n,
        });
        setTreeData(nodes.map(toTree));
      })
      .catch((err) => {
        console.error(err);
        notification.error({ message: "Erreur OneDrive" });
      });
  }, [selectedFormation]);

  useEffect(() => {
    loadTree();
  }, [selectedFormation, loadTree]);

  // 4️⃣ Sélection d’un fichier
  const onSelectTree = (keys, { node }) => {
    if (!node.isLeaf) return;
    const { raw } = node;
          // On ouvre directement via l'URL de téléchargement
          setSelectedFile({
          name:        raw.name,
          fileSize:    raw.fileSize,
          downloadUrl: raw.downloadUrl,
          rawUrl:      raw.downloadUrl,   // on passe la même URL au viewer
        });
  };

  // Handlers modals et notifications
  const handleAddSuccess = (doc) => {
    notification.success({ message: "Document ajouté 🎉" });
    loadTree();
  };
  const handleEditSuccess = () => {
    notification.success({ message: "Documents mis à jour 🎉" });
    loadTree();
  };

  return (
    <Layout style={{ padding: 16 }}>
      <Title level={4}>Gestion des Formations & Documents</Title>

      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!selectedFormation}
          onClick={() => setUploadModalVisible(true)}
        >
          Ajouter
        </Button>
        <Search
          placeholder="Recherche..."
          allowClear
          onSearch={setSearchText}
          style={{ width: 200 }}
        />
           <RangePicker
     onChange={setDateRange}
     getPopupContainer={triggerNode => triggerNode?.parentNode ?? document.body}
  />
      </Space>

      <Row gutter={16}>
        {/* Liste des formations */}
        <Col span={6} style={{ border: "1px solid #eee", padding: 8 }}>
          <Title level={5}>Formations</Title>
          <List
            size="small"
            bordered
            dataSource={filteredFormations}
            renderItem={(f) => (
              <List.Item
                key={f.idFormation}
                style={{
                  background:
                    selectedFormation?.idFormation === f.idFormation
                      ? "#e6f7ff"
                      : undefined,
                  cursor: "pointer",
                }}
                onClick={() => {
                  setSelectedFormation(f);
                  setSelectedFile(null);
                }}
                actions={[
                  <Button
                    key="edit"
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => setEditModalVisible(true)}
                  />,
                ]}
              >
                {f.titreFormation}
              </List.Item>
            )}
          />
        </Col>

        {/* Arbo OneDrive */}
        <Col span={8} style={{ border: "1px solid #eee", padding: 8 }}>
          <Title level={5}>
            Fichiers {selectedFormation?.titreFormation || ""}
          </Title>
          {treeData.length > 0 ? (
            <Tree
              showIcon
              treeData={treeData}
              expandedKeys={expandedKeys}
              onExpand={setExpandedKeys}
              onSelect={onSelectTree}
            />
          ) : (
            <Text type="secondary">Sélectionnez une formation</Text>
          )}
        </Col>

        {/* Visionneuse */}
        <Col span={10} style={{ border: "1px solid #eee", padding: 8 }}>
          <Title level={5}>Prévisualisation</Title>
          {selectedFile ? (
            <>
              <Text strong>{selectedFile.name}</Text>
              <br />
              <Text>Taille: {selectedFile.fileSize ?? "N/A"} o</Text>
              <br />
              <Button
                type="link"
                href={selectedFile.downloadUrl}
                target="_blank"
              >
                Télécharger
              </Button>
              <DocumentViewer
                url={selectedFile.rawUrl}
                ext={selectedFile.name.split(".").pop()}
              />
            </>
          ) : (
            <Text type="secondary">Aucun fichier sélectionné</Text>
          )}
        </Col>
      </Row>

      {/* Modal Ajout */}
      <Modal
        title={`Ajouter à "${selectedFormation?.titreFormation}"`}
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedFormation && (
          <DocumentUploadPanel
            formationId={selectedFormation.idFormation}
            onDocumentAdded={(doc) => {
              handleAddSuccess(doc);
              setUploadModalVisible(false);
            }}
            onClose={() => setUploadModalVisible(false)}
          />
        )}
      </Modal>

      {/* Modal Édition */}
      {selectedFormation && (
        <DocumentListModal
          open={editModalVisible}
          formation={selectedFormation}
          onClose={() => setEditModalVisible(false)}
          onDocumentsUpdated={handleEditSuccess}
        />
      )}
    </Layout>
  );
}
