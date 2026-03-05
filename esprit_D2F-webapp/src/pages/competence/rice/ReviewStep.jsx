// src/pages/competence/rice/ReviewStep.jsx
// Step 2 – Interactive review panel.
// Left: competence tree (rename, delete, type toggle, niveau, merge).
// Right: enseignant drop zone for drag-and-drop assignments.

import {
  Alert, Badge, Button, Card, Col, Collapse, Divider, Empty, Flex,
  Input, Popconfirm, Row, Select, Skeleton, Space, Tag, Tooltip, Typography,
} from "antd";
import {
  ApartmentOutlined, ArrowLeftOutlined, BookOutlined,
  CheckCircleOutlined, ClearOutlined, DeleteOutlined, DragOutlined,
  EditOutlined, EyeOutlined, FileTextOutlined, ReloadOutlined,
  SearchOutlined, UserAddOutlined, UserOutlined,
} from "@ant-design/icons";
import PropTypes from "prop-types";
import SavoirCard from "./SavoirCard.jsx";
import { DepartmentBadge, TYPE_COLOR } from "./constants.jsx";
import { useId } from "react";

const { Text } = Typography;

export default function ReviewStep({
  // tree state
  tree,
  treeSearch, setTreeSearch,
  editingNom, setEditingNom,
  startRename, commitRename,
  deleteSavoir, deleteSC, deleteComp, deleteDomaine,
  toggleType, setNiveau, setEnseignants,
  openMerge, setMergeModal,
  liveStats, treeFilteredIndices,

  // teacher state
  departement,
  extractedEnseignants,
  allEnseignants,
  effectiveEnseignants,
  filteredEffectiveEns,
  ensSearchStep2, setEnsSearchStep2,
  loadingEns, loadEnseignants,
  clearAllAssignments,
  remapEnseignant,
  allSavoirsFlat,

  // create enseignant
  setCreateEnsTarget,
  setCreateEnsData,
  setCreateEnsModal,

  // DnD
  isDragging, draggedSavoirInfo, dragOverEns,
  onSavoirDragStart, onSavoirDragEnd, onTagDragStart,
  onEnsDragOver, onEnsDragLeave, onEnsDrop,
  toggleEnsAssign,

  // navigation
  setCurrentStep,
}) {
  const uniqueId = useId();

  return (
    <>
      {/* ── Live stats banner ─────────────────────────────────────────────── */}
      <Alert
        type="info"
        className="rice-stats-banner"
        message={
          <Flex gap={16} wrap="wrap" align="center">
            <DepartmentBadge deptCode={departement} showIcon style={{ marginRight: 4 }} />
            <Divider type="vertical" />
            <span className="rice-stat-item">
              <ApartmentOutlined />
              <span className="rice-stat-value">{liveStats.totalDomaines}</span> domaines
            </span>
            <Divider type="vertical" />
            <span className="rice-stat-item">
              <span className="rice-stat-value">{liveStats.totalComp}</span> compétences
            </span>
            <Divider type="vertical" />
            <span className="rice-stat-item">
              <span className="rice-stat-value">{liveStats.totalSC}</span> sous-compétences
            </span>
            <Divider type="vertical" />
            <span className="rice-stat-item">
              <BookOutlined />
              <span className="rice-stat-value">{liveStats.totalSavoirs}</span> savoirs
            </span>
            <Divider type="vertical" />
            <span className="rice-stat-item">
              <UserOutlined />
              <span className="rice-stat-value">{liveStats.enseignantsAssigned}</span> enseignants assignés
            </span>
            {extractedEnseignants.length > 0 && (
              <>
                <Divider type="vertical" />
                <span className="rice-stat-item">
                  <FileTextOutlined />
                  <span className="rice-stat-value">{extractedEnseignants.length}</span>{" "}
                  noms extraits des fiches
                  {extractedEnseignants.filter((e) => e.matched_id).length > 0 && (
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                      ({extractedEnseignants.filter((e) => e.matched_id).length} identifiés)
                    </Text>
                  )}
                </span>
              </>
            )}
          </Flex>
        }
        icon={<CheckCircleOutlined />}
        showIcon
      />

      <Alert
        type="info"
        className="rice-dnd-tip"
        message={
          <Space size={8}>
            <DragOutlined />
            <Text style={{ fontSize: 13 }}>
              Les savoirs sont vides — glissez la poignée{" "}
              <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>⠿</Tag>
              {" "}d&apos;un savoir (gauche) vers la carte d&apos;un enseignant (droite) pour l&apos;affecter.
              Pour déplacer un savoir déjà assigné, glissez son tag d&apos;une carte enseignant vers une autre.
            </Text>
          </Space>
        }
        closable
      />

      <Row gutter={[16, 16]}>
        {/* ── LEFT: Competence tree ──────────────────────────────────────── */}
        <Col xs={24} xl={14}>
          <Card
            title={
              <Space wrap>
                <Space>
                  <ApartmentOutlined />
                  Structure de compétences
                  <Badge
                    count={liveStats.totalSavoirs}
                    style={{ backgroundColor: "#1677ff" }}
                    overflowCount={999}
                  />
                </Space>
                <Input
                  size="small"
                  prefix={<SearchOutlined />}
                  placeholder="Filtrer domaines / savoirs…"
                  value={treeSearch}
                  onChange={(e) => setTreeSearch(e.target.value)}
                  allowClear
                  style={{ width: 220 }}
                />
              </Space>
            }
            size="small"
            className="rice-tree-card"
          >
            {tree.length === 0 && (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    Aucun élément généré.{" "}
                    <Button type="link" size="small" onClick={() => setCurrentStep(0)}>
                      Retour à l&apos;upload
                    </Button>
                  </span>
                }
              />
            )}

            {tree.map((domaine, di) => {
              if (treeFilteredIndices && !treeFilteredIndices.visibleDi.has(di)) return null;
              const domaineKey = domaine.tmpId ?? `${uniqueId}-d${di}`;
              return (
                <Collapse
                  key={domaineKey}
                  defaultActiveKey={[domaineKey]}
                  style={{ marginBottom: 8 }}
                  items={[{
                    key: domaineKey,
                    label: (
                      <Space>
                        <Tag color="blue">{domaine.code}</Tag>
                        {editingNom?.path[0] === di && editingNom?.path.length === 1 ? (
                          <Input
                            size="small"
                            value={editingNom.value}
                            onChange={(e) => setEditingNom((p) => ({ ...p, value: e.target.value }))}
                            onPressEnter={commitRename}
                            onBlur={commitRename}
                            onKeyDown={(e) => e.key === "Escape" && setEditingNom(null)}
                            style={{ width: 220 }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <Text strong>{domaine.nom}</Text>
                        )}
                        <Badge
                          count={domaine.competences?.length ?? 0}
                          style={{ backgroundColor: "#e6f4ff", color: "#1677ff" }}
                          size="small"
                        />
                      </Space>
                    ),
                    extra: (
                      <Space onClick={(e) => e.stopPropagation()} size={2}>
                        <Tooltip title="Renommer">
                          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => startRename([di], domaine.nom)} />
                        </Tooltip>
                        <Popconfirm
                          title="Supprimer ce domaine ?"
                          description="Toutes ses compétences et savoirs seront supprimés."
                          okText="Supprimer"
                          cancelText="Annuler"
                          onConfirm={() => deleteDomaine(di)}
                        >
                          <Tooltip title="Supprimer">
                            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                          </Tooltip>
                        </Popconfirm>
                      </Space>
                    ),
                    children: (
                      <>
                        {(domaine.competences ?? []).map((comp, ci) => {
                          if (treeFilteredIndices && !treeFilteredIndices.visibleCi.has(`${di}-${ci}`)) return null;
                          const compKey = comp.tmpId ?? `${uniqueId}-d${di}c${ci}`;
                          return (
                            <Collapse
                              key={compKey}
                              style={{ marginBottom: 6 }}
                              items={[{
                                key: compKey,
                                label: (
                                  <Space>
                                    <Tag color="geekblue">{comp.code}</Tag>
                                    {editingNom?.path[0] === di && editingNom?.path[1] === ci && editingNom?.path.length === 2 ? (
                                      <Input
                                        size="small"
                                        value={editingNom.value}
                                        onChange={(e) => setEditingNom((p) => ({ ...p, value: e.target.value }))}
                                        onPressEnter={commitRename}
                                        onBlur={commitRename}
                                        onKeyDown={(e) => e.key === "Escape" && setEditingNom(null)}
                                        style={{ width: 220 }}
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    ) : (
                                      <Text>{comp.nom}</Text>
                                    )}
                                    <Badge
                                      count={comp.sousCompetences?.reduce((a, sc) => a + (sc.savoirs?.length ?? 0), 0) ?? 0}
                                      style={{ backgroundColor: "#f0f5ff", color: "#2f54eb" }}
                                      size="small"
                                      overflowCount={99}
                                      title="Nombre de savoirs"
                                    />
                                  </Space>
                                ),
                                extra: (
                                  <Space onClick={(e) => e.stopPropagation()} size={2}>
                                    <Button size="small" type="text" icon={<EditOutlined />} onClick={() => startRename([di, ci], comp.nom)} />
                                    <Popconfirm
                                      title="Supprimer cette compétence ?"
                                      okText="Supprimer"
                                      cancelText="Annuler"
                                      onConfirm={() => deleteComp(di, ci)}
                                    >
                                      <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                                    </Popconfirm>
                                  </Space>
                                ),
                                children: (
                                  <>
                                    {(comp.sousCompetences ?? []).map((sc, sci) => {
                                      if (treeFilteredIndices && !treeFilteredIndices.visibleSci.has(`${di}-${ci}-${sci}`)) return null;
                                      return (
                                        <div
                                          key={sc.tmpId ?? `${uniqueId}-d${di}c${ci}sc${sci}`}
                                          className="rice-sous-comp-section"
                                        >
                                          <div className="rice-sous-comp-header">
                                            <Tag color="cyan">{sc.code}</Tag>
                                            {editingNom?.path[0] === di && editingNom?.path[1] === ci && editingNom?.path[2] === sci && editingNom?.path.length === 3 ? (
                                              <Input
                                                size="small"
                                                value={editingNom.value}
                                                onChange={(e) => setEditingNom((p) => ({ ...p, value: e.target.value }))}
                                                onPressEnter={commitRename}
                                                onBlur={commitRename}
                                                onKeyDown={(e) => e.key === "Escape" && setEditingNom(null)}
                                                style={{ width: 200 }}
                                                autoFocus
                                              />
                                            ) : (
                                              <Text italic>{sc.nom}</Text>
                                            )}
                                            <Tooltip title="Renommer">
                                              <Button size="small" type="text" icon={<EditOutlined />} onClick={() => startRename([di, ci, sci], sc.nom)} />
                                            </Tooltip>
                                            <Popconfirm
                                              title="Supprimer cette sous-compétence ?"
                                              okText="Supprimer"
                                              cancelText="Annuler"
                                              onConfirm={() => deleteSC(di, ci, sci)}
                                            >
                                              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                                            </Popconfirm>
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                              ({sc.savoirs?.length ?? 0} savoirs)
                                            </Text>
                                          </div>

                                          {(sc.savoirs ?? []).map((savoir, si) => (
                                            <SavoirCard
                                              key={savoir.tmpId ?? `${uniqueId}-d${di}c${ci}sc${sci}s${si}`}
                                              savoir={savoir}
                                              di={di} ci={ci} sci={sci} si={si}
                                              editingNom={editingNom}
                                              setEditingNom={setEditingNom}
                                              commitRename={commitRename}
                                              startRename={startRename}
                                              toggleType={toggleType}
                                              setNiveau={setNiveau}
                                              setEnseignants={setEnseignants}
                                              deleteSavoir={deleteSavoir}
                                              openMerge={openMerge}
                                              setMergeModal={setMergeModal}
                                              onSavoirDragStart={onSavoirDragStart}
                                              onSavoirDragEnd={onSavoirDragEnd}
                                              isBeingDragged={
                                                draggedSavoirInfo?.di === di &&
                                                draggedSavoirInfo?.ci === ci &&
                                                draggedSavoirInfo?.sci === sci &&
                                                draggedSavoirInfo?.si === si
                                              }
                                              allEnseignants={effectiveEnseignants}
                                            />
                                          ))}
                                        </div>
                                      );
                                    })}
                                  </>
                                ),
                              }]}
                            />
                          );
                        })}
                      </>
                    ),
                  }]}
                />
              );
            })}
          </Card>
        </Col>

        {/* ── RIGHT: Enseignants drop zone ──────────────────────────────── */}
        <Col xs={24} xl={10}>
          <Card
            title={
              <Space>
                <UserOutlined />
                Affectations enseignants
                <Badge count={liveStats.enseignantsAssigned} style={{ backgroundColor: "#52c41a" }} overflowCount={99} />
              </Space>
            }
            size="small"
            className={`rice-ens-panel${isDragging ? " rice-dnd-active" : ""}`}
            extra={
              <Space size={4}>
                {extractedEnseignants.length > 0 && (
                  <Tooltip title={`${extractedEnseignants.filter((e) => e.matched_id).length} identifié(s) · ${extractedEnseignants.filter((e) => !e.matched_id).length} non identifié(s)`}>
                    <Tag color="blue" style={{ margin: 0, fontSize: 11, cursor: "help" }}>
                      <FileTextOutlined /> {extractedEnseignants.length} extraits
                    </Tag>
                  </Tooltip>
                )}
                <Popconfirm
                  title="Vider toutes les affectations ?"
                  description="Les savoirs seront désassociés de tous les enseignants."
                  okText="Vider"
                  okButtonProps={{ danger: true }}
                  cancelText="Annuler"
                  onConfirm={clearAllAssignments}
                >
                  <Tooltip title="Vider toutes les affectations pour assigner manuellement">
                    <Button
                      size="small"
                      danger
                      icon={<ClearOutlined />}
                      disabled={liveStats.enseignantsAssigned === 0}
                    >
                      Vider
                    </Button>
                  </Tooltip>
                </Popconfirm>
                <Tooltip title="Recharger la liste">
                  <Button size="small" type="text" icon={<ReloadOutlined />} loading={loadingEns} onClick={loadEnseignants} />
                </Tooltip>
              </Space>
            }
          >
            {/* Drag-mode banner */}
            {isDragging && draggedSavoirInfo && (
              <div className="rice-drag-banner">
                <DragOutlined style={{ marginRight: 6 }} />
                Déposez{" "}
                <strong style={{ color: TYPE_COLOR[draggedSavoirInfo.type] === "purple" ? "#722ed1" : "#fa541c" }}>
                  «&nbsp;{draggedSavoirInfo.nom}&nbsp;»
                </strong>{" "}
                sur un enseignant ci-dessous
              </div>
            )}

            {/* Teacher search */}
            <Input
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="Rechercher un enseignant…"
              value={ensSearchStep2}
              onChange={(e) => setEnsSearchStep2(e.target.value)}
              allowClear
              size="small"
              className="rice-ens-search-input"
            />

            {loadingEns ? (
              <div style={{ padding: "12px 4px" }}>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton
                    key={i}
                    avatar={{ shape: "circle", size: "small" }}
                    active
                    paragraph={{ rows: 1 }}
                    style={{ marginBottom: 14 }}
                  />
                ))}
              </div>
            ) : effectiveEnseignants.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    Aucun enseignant disponible.{" "}
                    <Button type="link" size="small" onClick={loadEnseignants}>Recharger</Button>
                  </span>
                }
              />
            ) : filteredEffectiveEns.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucun enseignant trouvé" />
            ) : null}

            {/* Identified + unidentified sections */}
            {!loadingEns && (() => {
              const dbEns = filteredEffectiveEns.filter((e) => !e._fromExtraction || e._matched);
              const unidentifiedEns = filteredEffectiveEns.filter((e) => e._fromExtraction && !e._matched);
              return (
                <>
                  {dbEns.length > 0 && (
                    <div className="rice-ens-section">
                      <div className="rice-ens-section-header">
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                        <Text strong style={{ fontSize: 12 }}>Enseignants identifiés</Text>
                        <Badge count={dbEns.length} style={{ backgroundColor: "#52c41a" }} size="small" />
                      </div>
                      {dbEns.map((ens) => {
                        const eid = String(ens.id ?? ens.enseignantId);
                        const isOver = dragOverEns === eid;
                        const assignedSavoirs = allSavoirsFlat.filter((s) =>
                          (s.enseignantsSuggeres ?? []).includes(eid),
                        );
                        const ensName = ens.prenom ? `${ens.prenom} ${ens.nom}` : ens.nom;
                        const extInfo = ens._fromExtraction
                          ? extractedEnseignants.find((ex) => String(ex.matched_id) === eid)
                          : null;
                        return (
                          <div
                            key={eid}
                            className={[
                              "rice-ens-drop-card",
                              isDragging ? "rice-ens-ready" : "",
                              isOver ? "rice-ens-drag-over" : "",
                              assignedSavoirs.length > 0 ? "rice-ens-has-savoirs" : "",
                            ].filter(Boolean).join(" ")}
                            onDragOver={(e) => onEnsDragOver(e, eid)}
                            onDragLeave={onEnsDragLeave}
                            onDrop={(e) => onEnsDrop(e, eid)}
                          >
                            <div className="rice-ens-header-row">
                              <div className={`rice-ens-avatar${ens._fromExtraction ? " rice-ens-avatar-extracted" : ""}`}>
                                {ensName.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <Text className="rice-ens-name" ellipsis={{ tooltip: ensName }}>{ensName}</Text>
                                {extInfo && (
                                  <div className="rice-ens-meta">
                                    <Tag
                                      color={extInfo.role === "responsable" ? "blue" : extInfo.role === "coordinateur" ? "cyan" : "default"}
                                      style={{ fontSize: 9, margin: 0, lineHeight: "16px", padding: "0 4px" }}
                                    >
                                      {extInfo.role}
                                    </Tag>
                                    <Text type="secondary" style={{ fontSize: 10 }} ellipsis={{ tooltip: extInfo.fichier }}>
                                      {extInfo.fichier}
                                    </Text>
                                  </div>
                                )}
                              </div>
                              <div className="rice-ens-count-badge">{assignedSavoirs.length}</div>
                            </div>

                            {isDragging && (
                              <div className={`rice-drop-overlay${isOver ? " rice-drop-overlay-active" : ""}`}>
                                {isOver ? <>✓ Relâchez pour assigner</> : <>⬇ Déposer ici</>}
                              </div>
                            )}

                            {!isDragging && (
                              <div className="rice-ens-tags">
                                {assignedSavoirs.length === 0 ? (
                                  <span className="rice-ens-placeholder">Aucun savoir assigné — glissez-en un ici</span>
                                ) : (
                                  assignedSavoirs.map((s) => (
                                    <Tag
                                      key={s.tmpId ?? `${s.di}-${s.ci}-${s.sci}-${s.si}`}
                                      closable
                                      draggable
                                      color={TYPE_COLOR[s.type]}
                                      style={{ fontSize: 11, maxWidth: 220, cursor: "grab" }}
                                      title="Glisser vers un autre enseignant pour réassigner"
                                      onDragStart={(e) => onTagDragStart(e, eid, s)}
                                      onDragEnd={onSavoirDragEnd}
                                      onClose={() => toggleEnsAssign(s.di, s.ci, s.sci, s.si, eid)}
                                    >
                                      ⠿ {s.nom.length > 28 ? `${s.nom.slice(0, 26)}…` : s.nom}
                                    </Tag>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {unidentifiedEns.length > 0 && (
                    <Collapse
                      ghost
                      size="small"
                      className="rice-unidentified-collapse"
                      items={[{
                        key: "unidentified",
                        label: (
                          <Space size={6}>
                            <span style={{ color: "#faad14" }}>⚠</span>
                            <Text type="secondary" style={{ fontSize: 12 }}>Non identifiés</Text>
                            <Badge count={unidentifiedEns.length} style={{ backgroundColor: "#faad14" }} size="small" />
                          </Space>
                        ),
                        children: unidentifiedEns.map((ens) => {
                          const eid = String(ens.id ?? ens.enseignantId);
                          const ensName = ens.prenom ? `${ens.prenom} ${ens.nom}` : ens.nom;
                          const extInfo = extractedEnseignants.find(
                            (ex) => ex.nom_complet && ex.nom_complet.toLowerCase() === ens.nom.toLowerCase(),
                          );
                          return (
                            <div key={eid} className="rice-ens-drop-card rice-ens-disabled">
                              <div className="rice-ens-header-row">
                                <div className="rice-ens-avatar rice-ens-avatar-unidentified">
                                  {ensName.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <Text className="rice-ens-name" ellipsis={{ tooltip: ensName }}>{ensName}</Text>
                                  {extInfo && (
                                    <div className="rice-ens-meta">
                                      <Tag
                                        color={extInfo.role === "responsable" ? "blue" : extInfo.role === "coordinateur" ? "cyan" : "default"}
                                        style={{ fontSize: 9, margin: 0, lineHeight: "16px", padding: "0 4px" }}
                                      >
                                        {extInfo.role}
                                      </Tag>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div style={{ marginTop: 6 }}>
                                <Space.Compact style={{ width: "100%" }}>
                                  <Select
                                    placeholder="🔗 Lier à un enseignant..."
                                    size="small"
                                    style={{ flex: 1 }}
                                    allowClear
                                    showSearch
                                    popupMatchSelectWidth={false}
                                    filterOption={(input, opt) =>
                                      (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
                                    }
                                    options={allEnseignants.map((e) => ({
                                      value: String(e.id ?? e.enseignantId),
                                      label: e.prenom ? `${e.prenom} ${e.nom}` : e.nom,
                                    }))}
                                    onChange={(realId) => { if (realId) remapEnseignant(eid, realId); }}
                                  />
                                  <Tooltip title="Créer un nouvel enseignant">
                                    <Button
                                      icon={<UserAddOutlined />}
                                      size="small"
                                      onClick={() => {
                                        const nameParts = ens.nom.split(" ");
                                        setCreateEnsTarget({ eid, name: ens.nom });
                                        setCreateEnsData({
                                          nom: nameParts[nameParts.length - 1] || "",
                                          prenom: nameParts.slice(0, -1).join(" ") || "",
                                          mail: "",
                                        });
                                        setCreateEnsModal(true);
                                      }}
                                    />
                                  </Tooltip>
                                </Space.Compact>
                              </div>
                            </div>
                          );
                        }),
                      }]}
                    />
                  )}
                </>
              );
            })()}
          </Card>
        </Col>
      </Row>

      {/* ── Bottom action bar ─────────────────────────────────────────────── */}
      <div className="rice-bottom-bar">
        <Row justify="space-between" align="middle">
          <Col>
            <Button onClick={() => setCurrentStep(0)} icon={<ArrowLeftOutlined />}>
              Recommencer
            </Button>
          </Col>
          <Col>
            <Space size={16}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {liveStats.totalSavoirs} savoirs · {liveStats.enseignantsAssigned} enseignants
              </Text>
              <Button
                type="primary"
                size="large"
                icon={<EyeOutlined />}
                disabled={allSavoirsFlat.length === 0}
                onClick={() => setCurrentStep(3)}
                className="rice-recap-btn"
              >
                Voir le récapitulatif
              </Button>
            </Space>
          </Col>
        </Row>
      </div>
    </>
  );
}

ReviewStep.propTypes = {
  tree: PropTypes.array.isRequired,
  treeSearch: PropTypes.string.isRequired,
  setTreeSearch: PropTypes.func.isRequired,
  editingNom: PropTypes.object,
  setEditingNom: PropTypes.func.isRequired,
  startRename: PropTypes.func.isRequired,
  commitRename: PropTypes.func.isRequired,
  deleteSavoir: PropTypes.func.isRequired,
  deleteSC: PropTypes.func.isRequired,
  deleteComp: PropTypes.func.isRequired,
  deleteDomaine: PropTypes.func.isRequired,
  toggleType: PropTypes.func.isRequired,
  setNiveau: PropTypes.func.isRequired,
  setEnseignants: PropTypes.func.isRequired,
  openMerge: PropTypes.func.isRequired,
  setMergeModal: PropTypes.func.isRequired,
  liveStats: PropTypes.object.isRequired,
  treeFilteredIndices: PropTypes.object,
  departement: PropTypes.string.isRequired,
  extractedEnseignants: PropTypes.array.isRequired,
  allEnseignants: PropTypes.array.isRequired,
  effectiveEnseignants: PropTypes.array.isRequired,
  filteredEffectiveEns: PropTypes.array.isRequired,
  ensSearchStep2: PropTypes.string.isRequired,
  setEnsSearchStep2: PropTypes.func.isRequired,
  loadingEns: PropTypes.bool,
  loadEnseignants: PropTypes.func.isRequired,
  clearAllAssignments: PropTypes.func.isRequired,
  remapEnseignant: PropTypes.func.isRequired,
  allSavoirsFlat: PropTypes.array.isRequired,
  setCreateEnsTarget: PropTypes.func.isRequired,
  setCreateEnsData: PropTypes.func.isRequired,
  setCreateEnsModal: PropTypes.func.isRequired,
  isDragging: PropTypes.bool,
  draggedSavoirInfo: PropTypes.object,
  dragOverEns: PropTypes.string,
  onSavoirDragStart: PropTypes.func.isRequired,
  onSavoirDragEnd: PropTypes.func.isRequired,
  onTagDragStart: PropTypes.func.isRequired,
  onEnsDragOver: PropTypes.func.isRequired,
  onEnsDragLeave: PropTypes.func.isRequired,
  onEnsDrop: PropTypes.func.isRequired,
  toggleEnsAssign: PropTypes.func.isRequired,
  setCurrentStep: PropTypes.func.isRequired,
};
