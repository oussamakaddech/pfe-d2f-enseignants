import { Space, Tag, Typography } from "antd";
import {
  ApartmentOutlined,
  BookOutlined,
  BulbOutlined,
  ExperimentOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { TreeNode } from "@/models/competence";

const { Text } = Typography;

type OpenNiveauModal = (type: "competence" | "sousCompetence", id: string | number, nom: string) => void;

export function buildSavoirNode(s: TreeNode) {
  return {
    key: `sav-${s.id}`,
    title: (
      <Space>
        {s.type === "THEORIQUE" ? <BookOutlined style={{ color: "#722ed1" }} /> : <ExperimentOutlined style={{ color: "#13c2c2" }} />}
        <Text type="secondary">{s.nom}</Text>
        <Tag color={s.type === "THEORIQUE" ? "purple" : "cyan"}>
          {s.type === "THEORIQUE" ? "Théorique" : "Pratique"}
        </Tag>
        <Tag>{s.code}</Tag>
      </Space>
    ),
    isLeaf: true,
  };
}

export function buildSousCompNode(sc: TreeNode, openNiveauModal: OpenNiveauModal): Record<string, unknown> {
  const enfants = sc.enfants ?? [];
  const isLeaf = enfants.length === 0;

  return {
    key: `sc-${sc.id}`,
    title: (
      <Space>
        <BulbOutlined style={{ color: "#fa8c16" }} />
        <Text>{sc.nom}</Text>
        <Tag color="orange">{sc.code}</Tag>
        <Tag color="geekblue">N{sc.niveau ?? "-"}</Tag>
        <Tag icon={<BookOutlined />}>{sc.nombreSavoirs}</Tag>
        <Tag icon={<TeamOutlined />} color="purple">{sc.nombreEnseignants}</Tag>
        <Tag
          style={{ cursor: "pointer" }}
          icon={<InfoCircleOutlined />}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void openNiveauModal("sousCompetence", sc.id!, sc.nom ?? "");
          }}
        >
          Niveaux
        </Tag>
      </Space>
    ),
    children: [
      ...enfants.map((child) => buildSousCompNode(child, openNiveauModal)),
      ...(isLeaf ? (sc.savoirs ?? []).map(buildSavoirNode) : []),
    ],
  };
}

export function buildCompetenceNode(comp: TreeNode, openNiveauModal: OpenNiveauModal): Record<string, unknown> {
  return {
    key: `comp-${comp.id}`,
    title: (
      <Space>
        <ApartmentOutlined style={{ color: "#52c41a" }} />
        <Text>{comp.nom}</Text>
        <Tag color="green">{comp.code}</Tag>
        <Tag>{comp.nombreSousCompetences} SC / {comp.nombreSavoirs} S</Tag>
        <Tag icon={<TeamOutlined />} color="purple">{comp.nombreEnseignants}</Tag>
        <Tag
          style={{ cursor: "pointer" }}
          icon={<InfoCircleOutlined />}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void openNiveauModal("competence", comp.id!, comp.nom ?? "");
          }}
        >
          Niveaux
        </Tag>
      </Space>
    ),
    children: [
      ...(comp.sousCompetences?.map((sc) => buildSousCompNode(sc, openNiveauModal)) || []),
      ...(comp.savoirsDirect?.map((s) => ({
        key: `sav-direct-${s.id}`,
        title: (
          <Space>
            {s.type === "THEORIQUE" ? <BookOutlined style={{ color: "#722ed1" }} /> : <ExperimentOutlined style={{ color: "#13c2c2" }} />}
            <Text type="secondary">{s.nom}</Text>
            <Tag color={s.type === "THEORIQUE" ? "purple" : "cyan"}>
              {s.type === "THEORIQUE" ? "Théorique" : "Pratique"}
            </Tag>
            <Tag>{s.code}</Tag>
            <Tag color="gold">Direct</Tag>
          </Space>
        ),
        isLeaf: true,
      })) || []),
    ],
  };
}

export function buildDomaineNode(domaine: TreeNode, openNiveauModal: OpenNiveauModal): Record<string, unknown> {
  return {
    key: `dom-${domaine.id}`,
    title: (
      <Space>
        <FolderOpenOutlined style={{ color: "#1890ff" }} />
        <Text strong>{domaine.nom}</Text>
        <Tag color="blue">{domaine.code}</Tag>
        <Tag color="green">{domaine.nombreCompetences}</Tag>
        <Tag icon={<TeamOutlined />} color="purple">{domaine.nombreEnseignants}</Tag>
        {!domaine.actif && <Tag color="red">Inactif</Tag>}
      </Space>
    ),
    children: domaine.competences?.map((comp) => buildCompetenceNode(comp, openNiveauModal)) || [],
  };
}
