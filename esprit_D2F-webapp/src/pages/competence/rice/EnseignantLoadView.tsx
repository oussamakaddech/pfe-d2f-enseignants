import { useMemo, useState } from "react";
import {
  Alert, Avatar, Badge, Button, Card, Col, Collapse, Progress, Row, Space, Tag, Typography,
} from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { cloneDeep, computeEnseignantLoad, getInitials, avatarColor } from "./constants";

const { Text } = Typography;

interface FlatSavoirRow {
  di: number;
  ci: number;
  sci: number;
  si: number;
  domaineNom: string;
  competenceNom: string;
  code?: string;
  nom?: string;
  type?: string;
  niveau?: string;
  enseignantsSuggeres?: (string | number)[];
  refCodes?: string[];
  [key: string]: unknown;
}

interface EnseignantRef extends Record<string, unknown> {
  id?: string | number;
  enseignantId?: string | number;
  nom?: string;
  prenom?: string;
  modules?: string[];
  matched_id?: string | number;
}

interface ExtractedEnseignantRef extends Record<string, unknown> {
  nom_complet?: string;
  fichier?: string;
  matched_id?: string | number;
}

interface TreeSavoir extends Record<string, unknown> {
  code?: string;
  nom?: string;
  type?: string;
  niveau?: string;
  enseignantsSuggeres?: (string | number)[];
  refCodes?: string[];
}

interface TreeSousComp extends Record<string, unknown> {
  savoirs?: TreeSavoir[];
}

interface TreeComp extends Record<string, unknown> {
  nom?: string;
  savoirs?: TreeSavoir[];
  sousCompetences?: TreeSousComp[];
}

interface TreeDomaine extends Record<string, unknown> {
  nom?: string;
  competences?: TreeComp[];
}

const addSousCompSavoirRows = (
  rows: FlatSavoirRow[],
  d: TreeDomaine,
  di: number,
  c: TreeComp,
  ci: number,
  sc: TreeSousComp,
  sci: number,
) => {
  (sc.savoirs ?? []).forEach((s, si) => {
    rows.push({ di, ci, sci, si, domaineNom: d.nom ?? "", competenceNom: c.nom ?? "", ...s });
  });
};

const flattenSavoirs = (tree: TreeDomaine[]): FlatSavoirRow[] => {
  const rows: FlatSavoirRow[] = [];
  (tree ?? []).forEach((d, di) => {
    (d.competences ?? []).forEach((c, ci) => {
      (c.savoirs ?? []).forEach((s, si) => {
        rows.push({ di, ci, sci: -1, si, domaineNom: d.nom ?? "", competenceNom: c.nom ?? "", ...s });
      });
      (c.sousCompetences ?? []).forEach((sc, sci) => {
        addSousCompSavoirRows(rows, d, di, c, ci, sc, sci);
      });
    });
  });
  return rows;
};

const getSavoirByPath = (next: TreeDomaine[], di: number, ci: number, sci: number, si: number) => {
  if (sci === -1) return next?.[di]?.competences?.[ci]?.savoirs?.[si];
  return next?.[di]?.competences?.[ci]?.sousCompetences?.[sci]?.savoirs?.[si];
};

const forEachTreeSavoir = (tree: TreeDomaine[], cb: (s: TreeSavoir) => void) => {
  (tree ?? []).forEach((d) => {
    (d.competences ?? []).forEach((c) => {
      (c.savoirs ?? []).forEach(cb);
      (c.sousCompetences ?? []).forEach((sc) => (sc.savoirs ?? []).forEach(cb));
    });
  });
};

const computeLoadStyle = (e: { loadCount: number }, total: number) => {
  const ratio = total ? Math.round((e.loadCount / total) * 100) : 0;
  let loadCls = "";
  if (e.loadCount > 10) loadCls = "overloaded";
  else if (e.loadCount > 5) loadCls = "warning";
  let loadStrokeColor = "#52c41a";
  if (loadCls === "overloaded") loadStrokeColor = "#f5222d";
  else if (loadCls === "warning") loadStrokeColor = "#fa8c16";
  return { ratio, loadCls, loadStrokeColor };
};

const isEnterOrSpace = (key: string) => key === "Enter" || key === " ";

interface EnseignantLoadViewProps {
  tree: TreeDomaine[];
  setTree: (tree: TreeDomaine[]) => void;
  allEnseignants: EnseignantRef[];
  extractedEnseignants?: ExtractedEnseignantRef[];
}

export default function EnseignantLoadView({ tree, setTree, allEnseignants, extractedEnseignants }: Readonly<EnseignantLoadViewProps>) {
  const loadMap = useMemo(() => computeEnseignantLoad(tree), [tree]);
  const allSavoirs = useMemo(() => flattenSavoirs(tree), [tree]);

  const enseignantRows = useMemo(() => {
    const base = (allEnseignants ?? []).map((e) => {
      const id = String(e.id ?? e.enseignantId);
      const load = loadMap.get(id) ?? { count: 0, savoirCodes: [], refCodes: [] };
      const nomComplet = e.prenom ? `${e.prenom} ${e.nom}` : e.nom;
      return {
        id,
        nomComplet: String(nomComplet ?? ""),
        loadCount: load.count,
        refCodes: [...new Set(load.refCodes)].slice(0, 8),
      };
    });

    base.sort((a, b) => b.loadCount - a.loadCount || a.nomComplet.localeCompare(b.nomComplet));
    return base;
  }, [allEnseignants, loadMap]);

  const [selectedEnsId, setSelectedEnsId] = useState(() => enseignantRows[0]?.id);

  const selected = enseignantRows.find((e) => e.id === selectedEnsId) ?? null;
  const selectedSavoirs = useMemo(() => {
    if (!selectedEnsId) return [];
    return allSavoirs.filter((s) => (s.enseignantsSuggeres ?? []).includes(selectedEnsId));
  }, [allSavoirs, selectedEnsId]);

  const noTeacherSavoirs = useMemo(
    () => allSavoirs.filter((s) => (s.enseignantsSuggeres ?? []).length === 0),
    [allSavoirs],
  );

  const removeOne = (path: FlatSavoirRow, eid: string) => {
    const { di, ci, sci, si } = path;
    const next = cloneDeep(tree) as TreeDomaine[];
    const s = getSavoirByPath(next, di, ci, sci, si);
    if (!s) return;
    s.enseignantsSuggeres = (s.enseignantsSuggeres ?? []).filter((x) => String(x) !== String(eid));
    setTree(next);
  };

  const addOne = (path: FlatSavoirRow, eid: string) => {
    const { di, ci, sci, si } = path;
    const next = cloneDeep(tree) as TreeDomaine[];
    const s = getSavoirByPath(next, di, ci, sci, si);
    if (!s) return;
    const ids = new Set((s.enseignantsSuggeres ?? []).map(String));
    ids.add(String(eid));
    s.enseignantsSuggeres = Array.from(ids);
    setTree(next);
  };

  const removeAllFromTeacher = () => {
    if (!selectedEnsId) return;
    const next = cloneDeep(tree) as TreeDomaine[];
    forEachTreeSavoir(next, (s) => {
      s.enseignantsSuggeres = (s.enseignantsSuggeres ?? []).filter((x) => String(x) !== String(selectedEnsId));
    });
    setTree(next);
  };

  const grouped = useMemo(() => {
    const map = new Map<string, FlatSavoirRow[]>();
    selectedSavoirs.forEach((s) => {
      const k = s.domaineNom || "Domaine";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    });
    return map;
  }, [selectedSavoirs]);

  const unmatched = (extractedEnseignants ?? []).filter((e) => !e.matched_id);

  return (
    <Row gutter={16}>
      <Col xs={24} lg={8}>
        {(enseignantRows ?? []).map((e) => {
          const { ratio, loadCls, loadStrokeColor } = computeLoadStyle(e, allSavoirs.length);
          const cls = [
            "ens-teacher-card",
            selectedEnsId === e.id ? "selected" : "",
            loadCls,
          ].filter(Boolean).join(" ");
          return (
            <button
              key={e.id}
              type="button"
              className={cls}
              onClick={() => setSelectedEnsId(e.id)}
              onKeyDown={(ev) => {
                if (!isEnterOrSpace(ev.key)) return;
                ev.preventDefault();
                setSelectedEnsId(e.id);
              }}
            >
              <Space align="start">
                <Avatar style={{ background: avatarColor(e.id) }}>{getInitials(String(e.nomComplet ?? ""), "")}</Avatar>
                <div>
                  <Text strong>{e.nomComplet}</Text>
                  <div style={{ marginTop: 6 }}>
                    <Progress
                      size="small"
                      percent={ratio}
                      strokeColor={loadStrokeColor}
                      format={() => `${e.loadCount}/${allSavoirs.length} savoirs`}
                    />
                  </div>
                  <Space wrap size={4} style={{ marginTop: 4 }}>
                    {e.refCodes.slice(0, 5).map((rc) => <Tag key={`${e.id}-${rc}`}>{rc}</Tag>)}
                  </Space>
                </div>
              </Space>
            </button>
          );
        })}
      </Col>

      <Col xs={24} lg={16}>
        <Card
          size="small"
          title={selected ? `Savoirs de ${selected.nomComplet}` : "Sélectionnez un enseignant"}
          extra={
            <Button danger size="small" onClick={removeAllFromTeacher} disabled={!selectedEnsId}>
              Tout retirer
            </Button>
          }
        >
          {selectedSavoirs.length === 0 ? (
            <Text type="secondary">Aucun savoir assigné.</Text>
          ) : (
            <Collapse
              items={Array.from(grouped.entries()).map(([domaineNom, savoirs]) => ({
                key: domaineNom,
                label: `${domaineNom} (${savoirs.length} savoirs)`,
                children: (
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {savoirs.map((s) => (
                      <div key={`${s.code}-${s.di}-${s.ci}-${s.sci}-${s.si}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Tag color={s.type === "PRATIQUE" ? "volcano" : "purple"}>{s.type}</Tag>
                        <Text style={{ flex: 1 }}>{s.nom}</Text>
                        <Tag>{s.niveau}</Tag>
                        <Button size="small" danger onClick={() => removeOne(s, selectedEnsId ?? "")}>✕ Retirer</Button>
                      </div>
                    ))}
                  </Space>
                ),
              }))}
            />
          )}

          <Alert
            style={{ marginTop: 14, marginBottom: 8 }}
            type="warning"
            showIcon
            message={`⚠️ ${noTeacherSavoirs.length} savoirs sans enseignant`}
          />
          <Space direction="vertical" style={{ width: "100%" }}>
            {noTeacherSavoirs.slice(0, 20).map((s) => (
              <div key={`u-${s.code}-${s.di}-${s.ci}-${s.sci}-${s.si}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Text style={{ flex: 1 }}>{s.nom}</Text>
                <Button
                  size="small"
                  type="primary"
                  disabled={!selectedEnsId}
                  onClick={() => addOne(s, selectedEnsId ?? "")}
                >
                  + Assigner à {selected?.nomComplet ?? "..."}
                </Button>
              </div>
            ))}
          </Space>
        </Card>

        {unmatched.length > 0 && (
          <Collapse
            ghost
            style={{ marginTop: 12 }}
            items={[{
              key: "unmatched-local",
              label: (
                <span><WarningOutlined style={{ color: "#fa8c16" }} /> Enseignants non trouvés en DB <Badge count={unmatched.length} style={{ marginLeft: 8, background: "#fa8c16" }} /></span>
              ),
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  {unmatched.map((u) => (
                    <div key={`${u.nom_complet}-${u.fichier}`} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <Text>{u.nom_complet}</Text>
                      <Text type="secondary">{u.fichier}</Text>
                    </div>
                  ))}
                </Space>
              ),
            }]}
          />
        )}
      </Col>
    </Row>
  );
}
