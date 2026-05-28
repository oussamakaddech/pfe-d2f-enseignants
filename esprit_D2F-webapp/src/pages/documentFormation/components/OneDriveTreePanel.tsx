import { Spin, Tree } from "antd";
import { FolderOpenOutlined, FolderOutlined, PartitionOutlined } from "@ant-design/icons";
import type { Formation } from "./docUtils";
import { DocEmpty } from "./DocEmpty";

interface TreeNodeData {
  title: string;
  key: string;
  icon: React.ReactNode;
  isLeaf: boolean;
  children?: TreeNodeData[];
}

interface OneDriveTreePanelProps {
  readonly selectedFormation: Formation | null;
  readonly treeData: TreeNodeData[];
  readonly treeLoading: boolean;
  readonly expandedKeys: string[];
  readonly onExpand: (keys: string[]) => void;
  readonly onSelectTree: (
    selectedKeys: string[],
    info: { node: { isLeaf: boolean; raw: { name: string; fileSize?: number; downloadUrl?: string } } }
  ) => void;
}

export function OneDriveTreePanel({
  selectedFormation,
  treeData,
  treeLoading,
  expandedKeys,
  onExpand,
  onSelectTree,
}: OneDriveTreePanelProps) {
  if (!selectedFormation) {
    return (
      <DocEmpty
        variant="tree"
        icon={<PartitionOutlined />}
        title="Aucune formation sélectionnée"
        text="Sélectionnez une formation pour voir ses dossiers"
      />
    );
  }

  return (
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
            {selectedFormation.up1?.libelle || "UP inconnue"} ·{" "}
            {selectedFormation.departement1?.libelle || "Département inconnu"}
          </div>
        </div>
      </div>

      {treeLoading ? (
        <div style={{ minHeight: 240, display: "grid", placeItems: "center" }}>
          <Spin size="large" />
        </div>
      ) : treeData.length > 0 ? (
        <div className="doc-tree-wrapper">
          <Tree
            showIcon
            blockNode
            treeData={treeData}
            expandedKeys={expandedKeys}
            onExpand={(keys) => onExpand(keys as string[])}
            onSelect={(keys, info) => onSelectTree(keys as string[], info as unknown as { node: { isLeaf: boolean; raw: { name: string; fileSize?: number; downloadUrl?: string } } })}
          />
        </div>
      ) : (
        <DocEmpty
          variant="tree"
          icon={<FolderOutlined />}
          title="Aucun dossier"
          text="Aucun dossier n'est disponible pour cette formation"
        />
      )}
    </>
  );
}
