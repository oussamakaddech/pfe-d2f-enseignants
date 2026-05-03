import { useEffect, useState, useCallback, useMemo } from "react";
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
  Card,
  Empty,
  Spin,
  Tag,
  Statistic,
  Divider,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  FolderOpenOutlined,
  FileOutlined,
  ReloadOutlined,
  SearchOutlined,
  ApartmentOutlined,
  FileTextOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import FormationWorkflowService from "../../services/FormationWorkflowService";
import OneDriveService from "../../services/OneDriveService";
import DocumentViewer from "./DocumentViewer";
import DocumentListModal from "./DocumentListModal";
import DocumentUploadPanel from "./DocumentUploadPanel";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

const normalizeText = (value) => String(value ?? "").toLowerCase();

const formatFileSize = (value) => {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return "Taille inconnue";
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
};

const formatDate = (value) => {
  if (!value) return "Date inconnue";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return String(value).split("T")[0];
  }
};

const toTreeNode = (node) => ({
  title: node.name,
  key: node.id,
  icon: node.folder ? <FolderOpenOutlined /> : <FileOutlined />,
  isLeaf: !node.folder,
  children: node.children?.map(toTreeNode),
  raw: node,
});

export default function CombinedFormationOneDriveTree() {
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
  const [formationsLoading, setFormationsLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadFormations = async () => {
      setFormationsLoading(true);
      try {
        const data = await FormationWorkflowService.getAllFormationWithDocuments();
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : data ? [data] : [];
        setFormations(list);
        setFilteredFormations(list);
      } catch (error) {
        console.error(error);
        notification.error({ message: "Erreur de chargement des formations" });
      } finally {
        if (isMounted) {
          setFormationsLoading(false);
        }
      }
    };

    loadFormations();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let result = formations;
    const txt = normalizeText(searchText).trim();

    if (txt) {
      result = result.filter((formation) => {
        const title = normalizeText(formation.titreFormation);
        const start = normalizeText(formatDate(formation.dateDebut));
        const up = normalizeText(formation.up1?.libelle);
        const dept = normalizeText(formation.departement1?.libelle);
        const documents = normalizeText(
          String(formation.documents?.length ?? 0)
        );

        return (
          title.includes(txt) ||
          start.includes(txt) ||
          up.includes(txt) ||
          dept.includes(txt) ||
          documents.includes(txt)
        );
      });
    }

    if (dateRange.length === 2) {
      const [from, to] = dateRange;
      result = result.filter((formation) => {
        const debut = formation.dateDebut ? String(formation.dateDebut).split("T")[0] : "";
        return debut >= from.format("YYYY-MM-DD") && debut <= to.format("YYYY-MM-DD");
      });
    }

    setFilteredFormations(result);
  }, [searchText, dateRange, formations]);

  const selectedFormationStats = useMemo(() => {
    const documents = selectedFormation?.documents ?? [];
    const folders = treeData.filter((node) => !node.isLeaf).length;

    return {
      documentCount: documents.length,
      treeRoots: treeData.length,
      folders,
    };
  }, [selectedFormation, treeData]);

  const loadTree = useCallback(async () => {
    if (!selectedFormation) {
      setTreeData([]);
      setExpandedKeys([]);
      setSelectedFile(null);
      return;
    }

    setTreeLoading(true);
    try {
      const nodes = await OneDriveService.getFormationHierarchy(selectedFormation.idFormation);
      const list = Array.isArray(nodes) ? nodes : [];
      setTreeData(list.map(toTreeNode));
      setExpandedKeys(list.map((node) => node.id));
      setSelectedFile(null);
    } catch (error) {
      console.error(error);
      notification.error({ message: "Erreur OneDrive" });
      setTreeData([]);
    } finally {
      setTreeLoading(false);
    }
  }, [selectedFormation]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const onSelectTree = (_, { node }) => {
    if (!node.isLeaf) return;
    const { raw } = node;
    setSelectedFile({
      name: raw.name,
      fileSize: raw.fileSize,
      downloadUrl: raw.downloadUrl,
      rawUrl: raw.downloadUrl,
    });
  };

  const handleAddSuccess = () => {
    notification.success({ message: "Document ajouté" });
    loadTree();
  };

  const handleEditSuccess = () => {
    notification.success({ message: "Documents mis à jour" });
    loadTree();
  };

  const openFormation = (formation) => {
    setSelectedFormation(formation);
    setSelectedFile(null);
  };

  return (
    <Layout
      style={{
        minHeight: "100%",
        padding: 24,
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
      }}
    >
      <Card
        variant="outlined"
        style={{
          marginBottom: 20,
          borderRadius: 20,
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
          color: "white",
        }}
        styles={{ body: { padding: 24 } }}
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Tag color="geekblue" style={{ width: "fit-content", border: 0 }}>
            Dossiers & documents de formation
          </Tag>
          <Title level={2} style={{ color: "white", margin: 0 }}>
            Explorer les formations et leurs dossiers
          </Title>
          <Paragraph style={{ color: "rgba(255,255,255,0.82)", marginBottom: 0, maxWidth: 860 }}>
            Sélectionnez une formation, parcourez son arborescence OneDrive et ouvrez un document en aperçu sans quitter la page.
          </Paragraph>
        </Space>

        <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
          <Col xs={24} md={8}>
            <Card variant="outlined" style={{ borderRadius: 16, minHeight: 104 }}>
              <Statistic
                title="Formations disponibles"
                value={filteredFormations.length}
                prefix={<ApartmentOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card variant="outlined" style={{ borderRadius: 16, minHeight: 104 }}>
              <Statistic
                title="Documents indexés"
                value={selectedFormationStats.documentCount}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card variant="outlined" style={{ borderRadius: 16, minHeight: 104 }}>
              <Statistic
                title="Dossiers affichés"
                value={selectedFormationStats.treeRoots}
                prefix={<FolderOpenOutlined />}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card
        variant="outlined"
        style={{ marginBottom: 20, borderRadius: 18, boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)" }}
      >
        <Space wrap size={12} style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap size={12}>
            <Search
              placeholder="Rechercher une formation, un département, une UP ou un document"
              allowClear
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onSearch={setSearchText}
              prefix={<SearchOutlined />}
              style={{ width: 360, maxWidth: "100%" }}
            />
            <RangePicker
              onChange={setDateRange}
              getPopupContainer={(triggerNode) => triggerNode?.parentNode ?? document.body}
            />
          </Space>

          <Space wrap>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!selectedFormation}
              onClick={() => setUploadModalVisible(true)}
            >
              Ajouter un document
            </Button>
            <Button
              icon={<EditOutlined />}
              disabled={!selectedFormation}
              onClick={() => setEditModalVisible(true)}
            >
              Gérer les documents
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadTree} disabled={!selectedFormation}>
              Rafraîchir
            </Button>
          </Space>
        </Space>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={7}>
          <Card
            variant="outlined"
            title="Formations"
            style={{ borderRadius: 18, boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)" }}
            extra={<Text type="secondary">{filteredFormations.length} résultat(s)</Text>}
          >
            <Spin spinning={formationsLoading}>
              {filteredFormations.length > 0 ? (
                <List
                  size="small"
                  dataSource={filteredFormations}
                  renderItem={(formation) => {
                    const isSelected = selectedFormation?.idFormation === formation.idFormation;
                    const docCount = formation.documents?.length ?? 0;

                    return (
                      <List.Item
                        key={formation.idFormation}
                        onClick={() => openFormation(formation)}
                        style={{
                          cursor: "pointer",
                          borderRadius: 14,
                          marginBottom: 12,
                          padding: 16,
                          border: isSelected ? "1px solid #1677ff" : "1px solid #e5e7eb",
                          background: isSelected ? "#eff6ff" : "white",
                          boxShadow: isSelected ? "0 8px 18px rgba(22, 119, 255, 0.12)" : "none",
                        }}
                      >
                        <Space direction="vertical" size={8} style={{ width: "100%" }}>
                          <Space align="start" style={{ width: "100%", justifyContent: "space-between" }}>
                            <div>
                              <Text strong style={{ fontSize: 15 }}>
                                {formation.titreFormation || "Formation sans titre"}
                              </Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {formatDate(formation.dateDebut)}
                              </Text>
                            </div>
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              onClick={(event) => {
                                event.stopPropagation();
                                openFormation(formation);
                                setEditModalVisible(true);
                              }}
                            />
                          </Space>

                          <Space wrap size={8}>
                            <Tag color="blue">{formation.up1?.libelle || "UP inconnue"}</Tag>
                            <Tag color="green">{formation.departement1?.libelle || "Département inconnu"}</Tag>
                            <Tag color={docCount > 0 ? "geekblue" : "default"}>
                              {docCount} document(s)
                            </Tag>
                          </Space>
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <Empty
                  description="Aucune formation ne correspond à votre recherche"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Spin>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            variant="outlined"
            title={selectedFormation ? `Arborescence OneDrive - ${selectedFormation.titreFormation}` : "Arborescence OneDrive"}
            style={{ borderRadius: 18, boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)" }}
            extra={selectedFormation ? <Tag color="processing">Formation sélectionnée</Tag> : null}
          >
            {selectedFormation ? (
              <>
                <Space direction="vertical" size={4} style={{ marginBottom: 16 }}>
                  <Text strong>{selectedFormation.titreFormation}</Text>
                  <Text type="secondary">
                    {selectedFormation.up1?.libelle || "UP inconnue"} · {selectedFormation.departement1?.libelle || "Département inconnu"}
                  </Text>
                </Space>

                <Divider style={{ margin: "12px 0" }} />

                {treeLoading ? (
                  <div style={{ minHeight: 240, display: "grid", placeItems: "center" }}>
                    <Spin size="large" />
                  </div>
                ) : treeData.length > 0 ? (
                  <Tree
                    showIcon
                    treeData={treeData}
                    expandedKeys={expandedKeys}
                    onExpand={setExpandedKeys}
                    onSelect={onSelectTree}
                  />
                ) : (
                  <Empty
                    description="Aucun dossier n'est disponible pour cette formation"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </>
            ) : (
              <Empty
                description="Sélectionnez une formation pour voir ses dossiers"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={9}>
          <Card
            variant="outlined"
            title="Prévisualisation"
            style={{ borderRadius: 18, boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)" }}
            extra={selectedFile ? <Tag color="success">Document prêt</Tag> : null}
          >
            {selectedFile ? (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Card
                  variant="outlined"
                  style={{ borderRadius: 14, background: "#f8fafc" }}
                  styles={{ body: { padding: 16 } }}
                >
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    <Text strong style={{ fontSize: 16 }}>
                      {selectedFile.name}
                    </Text>
                    <Text type="secondary">{formatFileSize(selectedFile.fileSize)}</Text>
                    <Button
                      type="primary"
                      href={selectedFile.downloadUrl}
                      target="_blank"
                      icon={<EyeOutlined />}
                      rel="noopener noreferrer"
                    >
                      Ouvrir / télécharger
                    </Button>
                  </Space>
                </Card>

                <DocumentViewer
                  url={selectedFile.rawUrl}
                  ext={selectedFile.name.split(".").pop()}
                />
              </Space>
            ) : (
              <Empty
                description="Sélectionnez un fichier dans l'arborescence pour l'aperçu"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={selectedFormation ? `Ajouter à ${selectedFormation.titreFormation}` : "Ajouter un document"}
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={720}
        destroyOnHidden
      >
        {selectedFormation && (
          <DocumentUploadPanel
            formationId={selectedFormation.idFormation}
            onDocumentAdded={() => {
              handleAddSuccess();
              setUploadModalVisible(false);
            }}
            onClose={() => setUploadModalVisible(false)}
          />
        )}
      </Modal>

      {selectedFormation && (
        <DocumentListModal
          open={editModalVisible}
          formation={selectedFormation}
          onClose={() => setEditModalVisible(false)}
          onDocumentsUpdated={() => {
            handleEditSuccess();
            setEditModalVisible(false);
          }}
        />
      )}
    </Layout>
  );
}
