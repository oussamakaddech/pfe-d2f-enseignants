// NodePropsPanel — right-side properties panel for selected tree node in ReviewStep.
// Extracted from ReviewStep.tsx for DSI 200-line compliance.

import {
  Badge, Button, Form, Input, Popconfirm, Select, Segmented, Tag, Typography,
} from "antd";
import { DeleteOutlined, UserOutlined, ApartmentOutlined } from "@ant-design/icons";
import type { FormInstance } from "antd";
import type { EnseignantRef, SelectedNode } from "./TreeBrowser";

const { Text } = Typography;

interface NodePropsPanelProps {
  selectedNode: SelectedNode;
  setSelectedNode: (node: SelectedNode) => void;
  propsForm: FormInstance;
  mergedEnseignants: EnseignantRef[];
  scOptions: { label: string; value: string }[];
  handleUpdateField: (field: string, value: unknown) => void;
  handleRemoveEnseignant: (id: unknown) => void;
  handleMoveSavoir: (targetPath: number[]) => void;
  deleteNode: (node: SelectedNode) => void;
  setCreateEnsTarget?: (v: { path: number[] } | null) => void;
  setCreateEnsData?: (v: { nom: string; prenom: string; mail: string } | null) => void;
  setCreateEnsModal?: (v: boolean) => void;
}

export default function NodePropsPanel({
  selectedNode,
  setSelectedNode,
  propsForm,
  mergedEnseignants,
  scOptions,
  handleUpdateField,
  handleRemoveEnseignant,
  handleMoveSavoir,
  deleteNode,
  setCreateEnsTarget,
  setCreateEnsData,
  setCreateEnsModal,
}: Readonly<NodePropsPanelProps>) {
  if (!selectedNode) {
    return (
      <div className="props-panel-empty">
        <ApartmentOutlined style={{ fontSize: 64, color: "var(--color-text-tertiary)" }} />
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <Text style={{ opacity: 0.85 }}>Sélectionnez un élément dans l&apos;arbre pour modifier ses propriétés</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="props-panel-inner">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
          <Badge count={0} style={{ background: "transparent" }} />
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {`${selectedNode.data?.code ?? ""} · ${selectedNode.data?.nom ?? ""}`}
            </Text>
            <Text type="secondary">{selectedNode.type}</Text>
          </div>
        </div>
      </div>

      <Form form={propsForm} layout="vertical">
        <Form.Item label="Code" rules={[{ required: true, min: 2, pattern: /^[A-Za-z0-9-]+$/, message: "Code : min 2 caractères, lettres/chiffres/tirets" }]}>
          <Input value={selectedNode.data?.code as string ?? ""} onChange={(e) => handleUpdateField("code", e.target.value)} />
        </Form.Item>
        <Form.Item label="Nom" rules={[{ required: true, message: "Nom requis" }]}>
          <Input value={selectedNode.data?.nom as string ?? ""} onChange={(e) => handleUpdateField("nom", e.target.value)} />
        </Form.Item>
        <Form.Item label="Description">
          <Input.TextArea rows={3} value={selectedNode.data?.description as string ?? ""} onChange={(e) => handleUpdateField("description", e.target.value)} />
        </Form.Item>

        {selectedNode.type === "savoir" && (
          <>
            <Button block type="primary" icon={<UserOutlined />} style={{ marginBottom: 12 }}
              onClick={() => {
                setCreateEnsTarget?.({ path: selectedNode.path });
                setCreateEnsData?.({ nom: "", prenom: "", mail: "" });
                setCreateEnsModal?.(true);
              }}
            >
              Créer et lier à ce savoir
            </Button>
            <Form.Item label="Type">
              <Segmented
                options={[{ label: "THEORIQUE", value: "THEORIQUE" }, { label: "PRATIQUE", value: "PRATIQUE" }]}
                value={selectedNode.data?.type as string ?? "THEORIQUE"}
                onChange={(v) => handleUpdateField("type", v)}
              />
            </Form.Item>
            <Form.Item label="Niveau">
              <Select value={selectedNode.data?.niveau as string} onChange={(v) => handleUpdateField("niveau", v)}
                options={[
                  { value: "N1_DEBUTANT", label: "Niveau 1" }, { value: "N2_ELEMENTAIRE", label: "Niveau 2" },
                  { value: "N3_INTERMEDIAIRE", label: "Niveau 3" }, { value: "N4_AVANCE", label: "Niveau 4" },
                  { value: "N5_EXPERT", label: "Niveau 5" },
                ]}
              />
            </Form.Item>
            <Form.Item label="Enseignants affectés">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {(selectedNode.data?.enseignantsSuggeres as unknown[] ?? []).map((id) => {
                  const e = mergedEnseignants.find((m) => String(m.id ?? m.enseignantId) === String(id));
                  const label = e ? `${e.prenom ?? ""} ${e.nom ?? ""}`.trim() : String(id);
                  return <Tag key={String(id)} closable onClose={() => handleRemoveEnseignant(id)}>{label}</Tag>;
                })}
              </div>
              <Select
                mode="multiple" placeholder="Ajouter un enseignant"
                value={selectedNode.data?.enseignantsSuggeres as string[] ?? []}
                onChange={(val) => handleUpdateField("enseignantsSuggeres", val)}
                options={mergedEnseignants.map((m) => ({ value: String(m.id ?? m.enseignantId), label: `${m.prenom ?? ""} ${m.nom ?? ""}` }))}
              />
            </Form.Item>
            <Form.Item label="Déplacer vers">
              <Select
                placeholder="Déplacer ce savoir vers une autre sous-compétence"
                onChange={(v) => handleMoveSavoir(JSON.parse(v) as number[])}
                options={scOptions}
              />
            </Form.Item>
          </>
        )}

        {(selectedNode.type === "competence" || selectedNode.type === "sousComp") && (
          <Form.Item label="Codes référentiels (refCodes)">
            <Select mode="tags" tokenSeparators={[",", " "]} value={selectedNode.data?.refCodes as string[] ?? []} onChange={(v) => handleUpdateField("refCodes", v)} />
          </Form.Item>
        )}
      </Form>

      <div style={{ marginTop: 12, position: "sticky", bottom: 8 }}>
        <Popconfirm
          title="Supprimer ce nœud ?"
          description="Cette action supprimera aussi tous ses enfants."
          okText="Supprimer" cancelText="Annuler"
          okButtonProps={{ danger: true }}
          onConfirm={() => { deleteNode(selectedNode); setSelectedNode(null); }}
        >
          <Button danger block icon={<DeleteOutlined />}>Supprimer {selectedNode.type}</Button>
        </Popconfirm>
      </div>
    </div>
  );
}
