import { useMemo, useState } from "react";
import {
  Alert, Badge, Button, Collapse, Row, Col, Segmented, Statistic, Table, Tag, Typography,
} from "antd";
import {
  BookOutlined, CheckCircleOutlined, InfoCircleOutlined, TableOutlined,
  TeamOutlined, UserOutlined, WarningOutlined, DatabaseOutlined,
} from "@ant-design/icons";
import PropTypes from "prop-types";
import EnseignantLoadView from "./EnseignantLoadView.jsx";
import EnseignantMatrixView from "./EnseignantMatrixView.jsx";
import { computeCoveragePct } from "./constants.jsx";

const { Text } = Typography;

const flatten = (tree) => {
  const all = [];
  (tree ?? []).forEach((d) => (d.competences ?? []).forEach((c) =>
    (c.sousCompetences ?? []).forEach((sc) => (sc.savoirs ?? []).forEach((s) => all.push(s)))));
  return all;
};

export default function EnseignantPanel({ tree, setTree, allEnseignants, extractedEnseignants, departement }) {
  const [viewMode, setViewMode] = useState("savoir");

  const allSavoirs = useMemo(() => flatten(tree), [tree]);
  const totalSavoirs = allSavoirs.length;
  const savoirsCoverts = allSavoirs.filter((s) => (s.enseignantsSuggeres ?? []).length > 0).length;
  const tauxCouverture = useMemo(() => computeCoveragePct(tree), [tree]);
  const enseignantsActifs = useMemo(() => {
    const ids = new Set();
    allSavoirs.forEach((s) => (s.enseignantsSuggeres ?? []).forEach((id) => ids.add(String(id))));
    return ids.size;
  }, [allSavoirs]);

  const unmatched = (extractedEnseignants ?? []).filter((e) => !e.matched_id);

  return (
    <div className="ens-panel">
      <Alert
        type="success"
        icon={<DatabaseOutlined />}
        showIcon
        style={{ marginBottom: 8 }}
        message={`${allEnseignants.length} enseignants chargés depuis la base de données`}
        description="Les suggestions IA sont basées sur les affectations existantes et les noms détectés dans vos fiches modules."
      />

      <div className="ens-panel-header">
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="Enseignants actifs"
              value={enseignantsActifs}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#1677ff" }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Savoirs couverts"
              value={`${savoirsCoverts}/${totalSavoirs}`}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: savoirsCoverts === totalSavoirs ? "#52c41a" : "#fa8c16" }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Taux de couverture"
              value={tauxCouverture}
              suffix="%"
              valueStyle={{
                color: tauxCouverture >= 80 ? "#52c41a" : tauxCouverture >= 50 ? "#fa8c16" : "#f5222d",
              }}
            />
          </Col>
        </Row>

        {tauxCouverture < 50 && (
          <Alert
            message={`${totalSavoirs - savoirsCoverts} savoirs n'ont aucun enseignant assigné`}
            type="warning"
            showIcon
            style={{ marginTop: 12 }}
          />
        )}
      </div>

      <Segmented
        value={viewMode}
        onChange={setViewMode}
        options={[
          { label: "Par savoir", value: "savoir", icon: <BookOutlined /> },
          { label: "Par enseignant", value: "enseignant", icon: <UserOutlined /> },
          { label: "Matrice", value: "matrice", icon: <TableOutlined /> },
        ]}
        style={{ marginBottom: 16 }}
        block
      />

      {viewMode === "enseignant" && (
        <EnseignantLoadView
          tree={tree}
          setTree={setTree}
          allEnseignants={allEnseignants}
          extractedEnseignants={extractedEnseignants}
        />
      )}

      {viewMode === "matrice" && (
        <EnseignantMatrixView
          tree={tree}
          setTree={setTree}
          allEnseignants={allEnseignants}
        />
      )}

      {viewMode === "savoir" && (
        <div className="ens-savoir-hint">
          <InfoCircleOutlined /> Les assignations par savoir se font directement dans les cartes de l&apos;arbre de compétences.
          Utilisez les modes &quot;Par enseignant&quot; ou &quot;Matrice&quot; pour une vue globale ({departement.toUpperCase()}).
        </div>
      )}

      {unmatched.length > 0 && (
        <Collapse
          ghost
          items={[{
            key: "unmatched",
            label: (
              <span>
                <WarningOutlined style={{ color: "#fa8c16" }} />
                {" "}Enseignants extraits non trouvés en DB
                <Badge
                  count={unmatched.length}
                  style={{ marginLeft: 8, background: "#fa8c16" }}
                />
              </span>
            ),
            children: (
              <Table
                size="small"
                pagination={false}
                dataSource={unmatched.map((r, i) => ({ ...r, key: `u-${i}` }))}
                columns={[
                  { title: "Nom extrait", dataIndex: "nom_complet" },
                  {
                    title: "Fichier source",
                    dataIndex: "fichier",
                    render: (f) => <Text type="secondary" ellipsis>{f}</Text>,
                  },
                  {
                    title: "Rôle",
                    dataIndex: "role",
                    render: (r) => <Tag>{r}</Tag>,
                  },
                  {
                    title: "Action",
                    render: () => (
                      <Button size="small" type="link">Créer dans la DB</Button>
                    ),
                  },
                ]}
              />
            ),
          }]}
        />
      )}
    </div>
  );
}

EnseignantPanel.propTypes = {
  tree: PropTypes.array.isRequired,
  setTree: PropTypes.func.isRequired,
  allEnseignants: PropTypes.array.isRequired,
  extractedEnseignants: PropTypes.array,
  departement: PropTypes.string.isRequired,
};
