import { useEffect, useState, useCallback, useMemo } from "react";
import type { Dayjs } from "dayjs";
import {
  Layout, Row, Col, Button, Input, DatePicker, Modal,
  notification, Typography, Space, Card, Statistic,
} from "antd";
import {
  PlusOutlined, EditOutlined, ReloadOutlined, SearchOutlined,
  ApartmentOutlined, FileTextOutlined, FolderOpenOutlined,
  CloudServerOutlined, AppstoreOutlined, PartitionOutlined, EyeOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useFormationsWithDocuments } from "@/hooks/formation/useFormations";
import { useFormationHierarchy } from "@/hooks/api/useOneDrive";
import DocumentListModal from "./DocumentListModal";
import DocumentUploadPanel from "./DocumentUploadPanel";
import { FormationListPanel } from "./components/FormationListPanel";
import { OneDriveTreePanel } from "./components/OneDriveTreePanel";
import { FilePreviewPanel } from "./components/FilePreviewPanel";
import { normalizeText, formatDate } from "./components/docUtils";
import type { Formation, SelectedFile, OneDriveNode } from "./components/docUtils";
import "@/styles/pages/combined-formation-one-drive-tree.css";

const { Title, Paragraph } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

interface TreeNodeData {
  title: string;
  key: string;
  icon: React.ReactNode;
  isLeaf: boolean;
  children?: TreeNodeData[];
  raw: OneDriveNode;
}

const toTreeNode = (node: OneDriveNode): TreeNodeData => ({
  title: node.name,
  key: node.id,
  icon: null,
  isLeaf: !node.folder,
  children: node.children?.map(toTreeNode),
  raw: node,
});

export default function CombinedFormationOneDriveTree() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [filteredFormations, setFilteredFormations] = useState<Formation[]>([]);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState<Dayjs[]>([]);

  const { data: formationsData = [], isLoading: formationsLoading } = useFormationsWithDocuments();
  const { data: hierarchyData, isLoading: treeLoading, refetch: refetchHierarchy } =
    useFormationHierarchy(selectedFormation?.idFormation);

  useEffect(() => {
    const list = Array.isArray(formationsData) ? formationsData : formationsData ? [formationsData] : [];
    setFormations(list as Formation[]);
    setFilteredFormations(list as Formation[]);
  }, [formationsData]);

  useEffect(() => {
    let result = formations;
    const txt = normalizeText(searchText).trim();
    if (txt) {
      result = result.filter((f) =>
        normalizeText(f.titreFormation).includes(txt) ||
        normalizeText(formatDate(f.dateDebut)).includes(txt) ||
        normalizeText(f.up1?.libelle).includes(txt) ||
        normalizeText(f.departement1?.libelle).includes(txt) ||
        normalizeText(String(f.documents?.length ?? 0)).includes(txt)
      );
    }
    if (dateRange.length === 2) {
      const [from, to] = dateRange;
      result = result.filter((f) => {
        const debut = f.dateDebut ? String(f.dateDebut).split("T")[0] : "";
        return debut >= from.format("YYYY-MM-DD") && debut <= to.format("YYYY-MM-DD");
      });
    }
    setFilteredFormations(result);
  }, [searchText, dateRange, formations]);

  useEffect(() => {
    if (!selectedFormation) { setTreeData([]); setExpandedKeys([]); setSelectedFile(null); return; }
    if (hierarchyData) {
      const nodes = Array.isArray(hierarchyData) ? hierarchyData : [];
      setTreeData((nodes as OneDriveNode[]).map(toTreeNode));
      setExpandedKeys((nodes as OneDriveNode[]).map((n) => n.id));
      setSelectedFile(null);
    } else if (!treeLoading) { setTreeData([]); setExpandedKeys([]); }
  }, [hierarchyData, treeLoading, selectedFormation]);

  const selectedFormationStats = useMemo(() => ({
    documentCount: selectedFormation?.documents?.length ?? 0,
    treeRoots: treeData.length,
  }), [selectedFormation, treeData]);

  const onSelectTree = useCallback((_: unknown, { node }: { node: { isLeaf: boolean; raw: OneDriveNode } }) => {
    if (!node.isLeaf) return;
    setSelectedFile({ name: node.raw.name, fileSize: node.raw.fileSize, downloadUrl: node.raw.downloadUrl ?? "", rawUrl: node.raw.downloadUrl ?? "" });
  }, []);

  const openFormation = (f: Formation) => { setSelectedFormation(f); setSelectedFile(null); };
  const handleAddSuccess = () => { notification.success({ message: "Document ajouté" }); void refetchHierarchy(); };
  const handleEditSuccess = () => { notification.success({ message: "Documents mis à jour" }); void refetchHierarchy(); };

  return (
    <Layout className="doc-page">
      <Card variant="borderless" className="doc-hero" styles={{ body: { padding: 28 } }}>
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Title level={2} className="doc-hero-title">
            <span className="doc-hero-icon"><CloudServerOutlined /></span>{" "}Explorer les formations et leurs dossiers
          </Title>
          <Paragraph className="doc-hero-subtitle">
            Sélectionnez une formation, parcourez son arborescence OneDrive et ouvrez un document en aperçu sans quitter la page.
          </Paragraph>
        </Space>
        <Row gutter={[16, 16]} className="doc-stat-strip">
          <Col xs={24} md={8}><Card variant="borderless" className="doc-stat-card doc-stat-card--blue"><Statistic title="Formations disponibles" value={filteredFormations.length} prefix={<ApartmentOutlined />} /></Card></Col>
          <Col xs={24} md={8}><Card variant="borderless" className="doc-stat-card doc-stat-card--indigo"><Statistic title="Documents indexés" value={selectedFormationStats.documentCount} prefix={<FileTextOutlined />} /></Card></Col>
          <Col xs={24} md={8}><Card variant="borderless" className="doc-stat-card doc-stat-card--violet"><Statistic title="Dossiers affichés" value={selectedFormationStats.treeRoots} prefix={<FolderOpenOutlined />} /></Card></Col>
        </Row>
      </Card>

      <Card variant="outlined" className="doc-toolbar">
        <Space wrap size={12} style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap size={12}>
            <Search placeholder="Rechercher une formation, un département, une UP ou un document" allowClear value={searchText}
              onChange={(e) => setSearchText(e.target.value)} onSearch={setSearchText} prefix={<SearchOutlined />} style={{ width: 380, maxWidth: "100%" }} />
            <RangePicker onChange={(v) => setDateRange(v ?? [])} suffixIcon={<CalendarOutlined />} getPopupContainer={(t) => t?.parentNode as HTMLElement ?? document.body} />
          </Space>
          <Space wrap size={8}>
            <Button type="primary" icon={<PlusOutlined />} disabled={!selectedFormation} onClick={() => setUploadModalVisible(true)} className="doc-btn-add">Ajouter un document</Button>
            <Button icon={<EditOutlined />} disabled={!selectedFormation} onClick={() => setEditModalVisible(true)} className="doc-btn-manage">Gérer les documents</Button>
            <Button icon={<ReloadOutlined />} onClick={() => void refetchHierarchy()} disabled={!selectedFormation} className="doc-btn-refresh">Rafraîchir</Button>
          </Space>
        </Space>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={7}>
          <Card variant="outlined" className="doc-panel"
            title={<span className="doc-panel-title"><span className="doc-panel-title-icon"><AppstoreOutlined /></span>{" "}Formations</span>}
            extra={<span className="doc-count-chip">{filteredFormations.length} résultat(s)</span>}
          >
            <FormationListPanel formations={filteredFormations} loading={formationsLoading}
              selectedFormation={selectedFormation} onSelect={openFormation}
              onEditClick={(f) => { openFormation(f); setEditModalVisible(true); }} />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card variant="outlined" className="doc-panel"
            title={<span className="doc-panel-title doc-panel-title--tree"><span className="doc-panel-title-icon"><PartitionOutlined /></span>{" "}Arborescence OneDrive</span>}
            extra={selectedFormation ? <span className="doc-status-chip doc-status-chip--active">Formation sélectionnée</span> : null}
          >
            <OneDriveTreePanel selectedFormation={selectedFormation} treeData={treeData} treeLoading={treeLoading}
              expandedKeys={expandedKeys} onExpand={setExpandedKeys} onSelectTree={onSelectTree as Parameters<typeof OneDriveTreePanel>[0]["onSelectTree"]} />
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card variant="outlined" className="doc-panel"
            title={<span className="doc-panel-title doc-panel-title--preview"><span className="doc-panel-title-icon"><EyeOutlined /></span>{" "}Prévisualisation</span>}
            extra={selectedFile ? <span className="doc-status-chip doc-status-chip--ready">Document prêt</span> : null}
          >
            <FilePreviewPanel selectedFile={selectedFile} />
          </Card>
        </Col>
      </Row>

      <Modal title={selectedFormation ? `Ajouter à ${selectedFormation.titreFormation}` : "Ajouter un document"}
        open={uploadModalVisible} onCancel={() => setUploadModalVisible(false)} footer={null} width={720} destroyOnHidden>
        {selectedFormation && (
          <DocumentUploadPanel formationId={selectedFormation.idFormation}
            onDocumentAdded={() => { handleAddSuccess(); setUploadModalVisible(false); }}
            onClose={() => setUploadModalVisible(false)} />
        )}
      </Modal>

      {selectedFormation && (
        <DocumentListModal open={editModalVisible} formation={selectedFormation}
          onClose={() => setEditModalVisible(false)}
          onDocumentsUpdated={() => { handleEditSuccess(); setEditModalVisible(false); }} />
      )}
    </Layout>
  );
}
