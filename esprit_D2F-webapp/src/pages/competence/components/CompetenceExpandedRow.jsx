// src/pages/competence/components/CompetenceExpandedRow.jsx
import PropTypes from "prop-types";
import { Alert, Button, Card, Empty, Popconfirm, Space, Tag, Tooltip, Typography } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";

const { Text } = Typography;

function flattenSousCompList(items = []) {
  const acc = [];
  const walk = (list) => {
    list.forEach((node) => {
      acc.push(node);
      if (Array.isArray(node.enfants) && node.enfants.length > 0) {
        walk(node.enfants);
      }
    });
  };
  walk(items);
  return acc;
}

function SousCompNode({ node, depth, onAddChild, onEdit, onDelete }) {
  const enfants = node.enfants ?? [];
  const isLeaf = enfants.length === 0;
  const hasSavoirs = (node.savoirs?.length ?? 0) > 0;

  return (
    <div style={{ marginLeft: depth * 20, marginTop: 8 }}>
      <Space wrap>
        <Text strong>{node.nom}</Text>
        <Tag>{node.code}</Tag>
        <Tag color="cyan">{node.savoirs?.length ?? 0} savoir(s)</Tag>
        {isLeaf ? <Tag color="green">Feuille</Tag> : <Tag color="geekblue">{enfants.length} enfant(s)</Tag>}

        <Tooltip title={hasSavoirs ? "Impossible d'ajouter un enfant: ce noeud contient des savoirs" : "Ajouter une sous-compétence"}>
          <Button
            size="small"
            icon={<PlusOutlined />}
            disabled={hasSavoirs}
            onClick={() => onAddChild(node)}
          />
        </Tooltip>

        <Tooltip title="Modifier">
          <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(node)} />
        </Tooltip>

        <Tooltip title="Supprimer">
          <Popconfirm
            title="Confirmer la suppression ?"
            okText="Oui"
            cancelText="Non"
            onConfirm={() => onDelete(node.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Tooltip>
      </Space>

      {enfants.map((child) => (
        <SousCompNode
          key={child.id}
          node={child}
          depth={depth + 1}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

SousCompNode.propTypes = {
  node: PropTypes.object.isRequired,
  depth: PropTypes.number.isRequired,
  onAddChild: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default function CompetenceExpandedRow({
  competence,
  sousComps,
  loading = false,
  onAddRoot,
  onAddChild,
  onEdit,
  onDelete,
}) {
  const allNodesForComp = flattenSousCompList(sousComps ?? []).filter(
    (sc) => String(sc.competenceId) === String(competence.id),
  );

  const byId = new Map();
  allNodesForComp.forEach((n) => {
    byId.set(String(n.id), { ...n, enfants: [] });
  });

  const roots = [];
  byId.forEach((node) => {
    if (node.parentId && byId.has(String(node.parentId))) {
      byId.get(String(node.parentId)).enfants.push(node);
    } else {
      roots.push(node);
    }
  });

  return (
    <Card size="small" style={{ margin: 8 }}>
      <Space style={{ marginBottom: 12 }} wrap>
        <Text strong>Sous-compétences de {competence.nom}</Text>
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => onAddRoot(competence)}>
          Ajouter une sous-compétence
        </Button>
      </Space>

      {roots.length === 0 ? (
        <>
          <Alert
            type="info"
            showIcon
            message="Savoirs directs"
            description="Cette compétence ne contient pas de sous-compétence. Vous pouvez y rattacher des savoirs directs."
            style={{ marginBottom: 8 }}
          />
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucune sous-compétence" />
        </>
      ) : (
        <div style={{ opacity: loading ? 0.6 : 1 }}>
          {roots.map((root) => (
            <SousCompNode
              key={root.id}
              node={root}
              depth={0}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

CompetenceExpandedRow.propTypes = {
  competence: PropTypes.object.isRequired,
  sousComps: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  onAddRoot: PropTypes.func.isRequired,
  onAddChild: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
