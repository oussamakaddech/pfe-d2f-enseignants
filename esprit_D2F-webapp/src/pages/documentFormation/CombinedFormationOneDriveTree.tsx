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
  Spin,
  Tag,
  Statistic,
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
  CloudServerOutlined,
  AppstoreOutlined,
  PartitionOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileImageOutlined,
  FileZipOutlined,
  CalendarOutlined,
  InboxOutlined,
  FolderOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { useFormationsWithDocuments } from "@/hooks/formation/useFormations";
import { useFormationHierarchy } from "@/hooks/api/useOneDrive";
import DocumentViewer from "./DocumentViewer";
import DocumentListModal from "./DocumentListModal";
import DocumentUploadPanel from "./DocumentUploadPanel";
import "@/styles/pages/combined-formation-one-drive-tree.css";

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

function DocEmpty({ variant = "default", icon, title, text }) {
  let variantClass = "";
  if (variant === "tree") variantClass = " doc-empty-icon--tree";
  else if (variant === "preview") variantClass = " doc-empty-icon--preview";
  return (
    <div className="doc-empty">
      <div className={`doc-empty-icon${variantClass}`}>{icon}</div>
      {title && <div className="doc-empty-title">{title}</div>}
      <div className="doc-empty-text">{text}</div>
    </div>
  );
}

const getFileIcon = (name) => {
  const ext = String(name || "").split(".").pop()?.toLowerCase();
  if (["pdf"].includes(ext)) return <FilePdfOutlined style={{ color: "#dc2626" }} />;
  if (["doc", "docx"].includes(ext)) return <FileWordOutlined style={{ color: "#1d4ed8" }} />;
  if (["xls", "xlsx", "csv"].includes(ext)) return <FileExcelOutlined style={{ color: "#047857" }} />;
  if (["ppt", "pptx"].includes(ext)) return <FilePptOutlined style={{ color: "#c2410c" }} />;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return <FileImageOutlined style={{ color: "#7c3aed" }} />;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return <FileZipOutlined style={{ color: "#b45309" }} />;
  return <FileTextOutlined style={{ color: "#475569" }} />;
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
  const { data: formationsData = [], isLoading: formationsLoading } = useFormationsWithDocuments();

  useEffect(() => {
    let list;
    if (Array.isArray(formationsData)) { list = formationsData; }
    else if (formationsData) { list = [formationsData]; }
    else { list = []; }
    setFormations(list);
    setFilteredFormations(list);
  }, [formationsData]);

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

  const { data: hierarchyData, isLoading: treeLoading, refetch: refetchHierarchy } = useFormationHierarchy(selectedFormation?.idFormation);

  useEffect(() => {
    if (!selectedFormation) {
      setTreeData([]);
      setExpandedKeys([]);
      setSelectedFile(null);
      return;
    }

    if (hierarchyData) {
      const nodes = Array.isArray(hierarchyData) ? hierarchyData : [];
      setTreeData(nodes.map(toTreeNode));
      setExpandedKeys(nodes.map((node) => node.id));
      setSelectedFile(null);
    } else if (!treeLoading) {
      setTreeData([]);
      setExpandedKeys([]);
    }
  }, [hierarchyData, treeLoading, selectedFormation]);

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
    <Layout className="doc-page">
      <Card
        variant="borderless"
        className="doc-hero"
        styles={{ body: { padding: 28 } }}
      >
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Tag className="doc-hero-tag">Dossiers & documents de formation</Tag>
          <Title level={2} className="doc-hero-title">
            <span className="doc-hero-icon">
              <CloudServerOutlined />
            </span>
            {" "}Explorer les formations et leurs dossiers
          </Title>
          <Paragraph className="doc-hero-subtitle">
            Sélectionnez une formation, parcourez son arborescence OneDrive et ouvrez un document en aperçu sans quitter la page.
          </Paragraph>
        </Space>

        <Row gutter={[16, 16]} className="doc-stat-strip">
          <Col xs={24} md={8}>
            <Card variant="borderless" className="doc-stat-card doc-stat-card--blue">
              <Statistic
                title="Formations disponibles"
                value={filteredFormations.length}
                prefix={<ApartmentOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card variant="borderless" className="doc-stat-card doc-stat-card--indigo">
              <Statistic
                title="Documents indexés"
                value={selectedFormationStats.documentCount}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card variant="borderless" className="doc-stat-card doc-stat-card--violet">
              <Statistic
                title="Dossiers affichés"
                value={selectedFormationStats.treeRoots}
                prefix={<FolderOpenOutlined />}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card variant="outlined" className="doc-toolbar">
        <Space wrap size={12} style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap size={12}>
            <Search
              placeholder="Rechercher une formation, un département, une UP ou un document"
              allowClear
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onSearch={setSearchText}
              prefix={<SearchOutlined />}
              style={{ width: 380, maxWidth: "100%" }}
            />
            <RangePicker
              onChange={setDateRange}
              suffixIcon={<CalendarOutlined />}
              getPopupContainer={(triggerNode) => triggerNode?.parentNode ?? document.body}
            />
          </Space>

          <Space wrap size={8}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!selectedFormation}
              onClick={() => setUploadModalVisible(true)}
              className="doc-btn-add"
            >
              Ajouter un document
            </Button>
            <Button
              icon={<EditOutlined />}
              disabled={!selectedFormation}
              onClick={() => setEditModalVisible(true)}
              className="doc-btn-manage"
            >
              Gérer les documents
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={refetchHierarchy}
              disabled={!selectedFormation}
              className="doc-btn-refresh"
            >
              Rafraîchir
            </Button>
          </Space>
        </Space>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={7}>
          <Card
            variant="outlined"
            className="doc-panel"
            title={
              <span className="doc-panel-title">
                <span className="doc-panel-title-icon"><AppstoreOutlined /></span>
                {" "}Formations
              </span>
            }
            extra={<span className="doc-count-chip">{filteredFormations.length} résultat(s)</span>}
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
                        className={`doc-formation-item${isSelected ? " doc-formation-item--selected" : ""}`}
                      >
                        <Space direction="vertical" size={8} style={{ width: "100%" }}>
                          <Space align="start" style={{ width: "100%", justifyContent: "space-between" }}>
                            <div>
                              <Text strong className="doc-formation-title">
                                {formation.titreFormation || "Formation sans titre"}
                              </Text>
                              <br />
                              <Text className="doc-formation-date">
                                <CalendarOutlined style={{ marginInlineEnd: 6 }} />
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
                            <Tag color="blue" bordered={false}>{formation.up1?.libelle || "UP inconnue"}</Tag>
                            <Tag color="green" bordered={false}>{formation.departement1?.libelle || "Département inconnu"}</Tag>
                            <Tag color={docCount > 0 ? "geekblue" : "default"} bordered={false}>
                              <FileTextOutlined style={{ marginInlineEnd: 4 }} />
                              {docCount} document(s)
                            </Tag>
                          </Space>
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <DocEmpty
                  icon={<InboxOutlined />}
                  title="Aucune formation"
                  text="Aucune formation ne correspond à votre recherche"
                />
              )}
            </Spin>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            variant="outlined"
            className="doc-panel"
            title={
              <span className="doc-panel-title doc-panel-title--tree">
                <span className="doc-panel-title-icon"><PartitionOutlined /></span>
                {" "}Arborescence OneDrive
              </span>
            }
            extra={selectedFormation ? <span className="doc-status-chip doc-status-chip--active">Formation sélectionnée</span> : null}
          >
            {selectedFormation ? (
              <>
                <div className="doc-selected-summary">
                  <span className="doc-selected-summary-avatar">
                    <FolderOpenOutlined />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 14 }}>
                      {selectedFormation.titreFormation}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                      {selectedFormation.up1?.libelle || "UP inconnue"} · {selectedFormation.departement1?.libelle || "Département inconnu"}
                    </div>
                  </div>
                </div>

                {(() => {
                  if (treeLoading) return (
                    <div style={{ minHeight: 240, display: "grid", placeItems: "center" }}>
                      <Spin size="large" />
                    </div>
                  );
                  if (treeData.length > 0) return (
                    <div className="doc-tree-wrapper">
                      <Tree
                        showIcon
                        blockNode
                        treeData={treeData}
                        expandedKeys={expandedKeys}
                        onExpand={setExpandedKeys}
                        onSelect={onSelectTree}
                      />
                    </div>
                  );
                  return (
                    <DocEmpty
                      variant="tree"
                      icon={<FolderOutlined />}
                      title="Aucun dossier"
                      text="Aucun dossier n'est disponible pour cette formation"
                    />
                  );
                })()}
              </>
            ) : (
              <DocEmpty
                variant="tree"
                icon={<PartitionOutlined />}
                title="Aucune formation sélectionnée"
                text="Sélectionnez une formation pour voir ses dossiers"
              />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={9}>
          <Card
            variant="outlined"
            className="doc-panel"
            title={
              <span className="doc-panel-title doc-panel-title--preview">
                <span className="doc-panel-title-icon"><EyeOutlined /></span>
                {" "}Prévisualisation
              </span>
            }
            extra={selectedFile ? <span className="doc-status-chip doc-status-chip--ready">Document prêt</span> : null}
          >
            {selectedFile ? (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Card
                  variant="borderless"
                  className="doc-file-card"
                  styles={{ body: { padding: 16 } }}
                >
                  <Space align="start" size={14} style={{ width: "100%" }}>
                    <span className="doc-file-icon">{getFileIcon(selectedFile.name)}</span>
                    <Space direction="vertical" size={6} style={{ flex: 1, minWidth: 0 }}>
                      <Text strong className="doc-file-name">
                        {selectedFile.name}
                      </Text>
                      <Text type="secondary">{formatFileSize(selectedFile.fileSize)}</Text>
                      <Button
                        type="primary"
                        href={selectedFile.downloadUrl}
                        target="_blank"
                        icon={<EyeOutlined />}
                        rel="noopener noreferrer"
                        className="doc-btn-open"
                      >
                        Ouvrir / télécharger
                      </Button>
                    </Space>
                  </Space>
                </Card>

                <DocumentViewer
                  url={selectedFile.rawUrl}
                  ext={selectedFile.name.split(".").pop()}
                />
              </Space>
            ) : (
              <DocEmpty
                variant="preview"
                icon={<PictureOutlined />}
                title="Aucun aperçu"
                text="Sélectionnez un fichier dans l'arborescence pour l'aperçu"
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




