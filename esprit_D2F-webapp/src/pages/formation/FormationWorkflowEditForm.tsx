import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import {
  CalendarOutlined,
  CheckOutlined,
  ClearOutlined,
  DollarOutlined,
  DownOutlined,
  EnvironmentOutlined,
  FileExcelOutlined,
  FilterOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ReadOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  TeamOutlined,
  UpOutlined,
  UploadOutlined,
  UserAddOutlined,
  UsergroupAddOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { brand, statusColors, type FormationStatus } from "@/styles/themes/tokens";

import { useFormationWorkflowEdit } from "./hooks/useFormationWorkflowEdit";
import DocumentUploadPanel from "../documentFormation/DocumentUploadPanel";
import DocumentListModal from "../documentFormation/DocumentListModal";
import type { FormationEdit } from "./formationWorkflowTypes";
import { PERIOD_OPTIONS } from "./formationWorkflowTypes";
import "@/styles/pages/formation-workflow-edit-form.css";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const TYPE_OPTIONS = [
  { value: "INTERNE",  label: "Interne",          color: "#2563eb" },
  { value: "EXTERNE",  label: "Externe",          color: "#7c3aed" },
  { value: "EN_LIGNE", label: "En ligne",         color: "#059669" },
];

const ETAT_OPTIONS: { value: FormationStatus; label: string }[] = [
  { value: "ENREGISTRE", label: "Enregistré" },
  { value: "PLANIFIE",   label: "Planifié"   },
  { value: "EN_COURS",   label: "En cours"   },
  { value: "ACHEVE",     label: "Achevé"     },
  { value: "ANNULE",     label: "Annulé"     },
];

const STEPS = [
  { title: "Général",    icon: <InfoCircleOutlined /> },
  { title: "Pédagogie",  icon: <ReadOutlined />      },
  { title: "Séances",    icon: <CalendarOutlined />  },
  { title: "Acteurs",    icon: <TeamOutlined />      },
  { title: "Coûts",      icon: <DollarOutlined />    },
];

const ACTEUR_ROLE_COLORS: Record<string, string> = {
  ANIMATEUR: "#7c3aed",
  FORMATEUR: "#2563eb",
  ENSEIGNANT: "#0d9488",
};

function getInitials(nom?: string, prenom?: string): string {
  const n = (nom || "").trim();
  const p = (prenom || "").trim();
  if (!n && !p) return "?";
  if (!p) return n.slice(0, 2).toUpperCase();
  if (!n) return p.slice(0, 2).toUpperCase();
  return (n[0] + p[0]).toUpperCase();
}

function avatarColor(seed?: string): string {
  const palette = ["#2563eb", "#7c3aed", "#0d9488", "#db2777", "#ea580c", "#059669", "#0891b2", "#9333ea", "#dc2626", "#65a30d"];
  if (!seed) return palette[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function roleOfPerson(person: Record<string, unknown>): string {
  const role = (person.role || person.userRole || "") as string;
  if (role) return String(role).toUpperCase();
  const type = person.type as string;
  if (type === "P") return "ENSEIGNANT";
  if (type === "V") return "FORMATEUR";
  return "ENSEIGNANT";
}

function formatLastReload(d: Date | null): string {
  if (!d) return "Pas encore rechargé";
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `Dernière synchro : ${h}:${m}:${s}`;
}

interface FormationWorkflowEditFormProps {
  formation: FormationEdit;
  onFormationUpdated: (res: Record<string, unknown>) => void;
}

export default function FormationWorkflowEditForm({ formation, onFormationUpdated }: Readonly<FormationWorkflowEditFormProps>) {
  const h = useFormationWorkflowEdit(formation as unknown as Record<string, unknown>, (res) => onFormationUpdated(res as Record<string, unknown>));
  const [activeStep, setActiveStep] = useState(0);
  const stepDir = useRef(0);

  const etatMeta = useMemo(() => {
    const s = statusColors[h.etatFormation as FormationStatus];
    return s ?? { color: "#6b7280", bg: "#f9fafb", label: h.etatFormation };
  }, [h.etatFormation]);

  const totalCout = useMemo(
    () => Number(h.cout || 0) + Number(h.coutTransport || 0) + Number(h.coutHebergement || 0) + Number(h.coutRepas || 0),
    [h.cout, h.coutTransport, h.coutHebergement, h.coutRepas],
  );

  const totalHeures = useMemo(
    () => h.seances.reduce((sum, s) => sum + (Number(s.dureeTheorique) || 0) + (Number(s.dureePratique) || 0), 0),
    [h.seances],
  );

  const goNext = () => { stepDir.current = 1; setActiveStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const goBack = () => { stepDir.current = -1; setActiveStep((s) => Math.max(s - 1, 0)); };

  const handleSubmit = (e: React.SyntheticEvent) => {
    void h.handleSubmit(e);
  };

  // ════════════════════════════════════════════════════════════════════════
  // RENDU DES ÉTAPES
  // ════════════════════════════════════════════════════════════════════════

  const renderGeneralStep = () => (
    <div className="edit-step-grid">
      <div className="edit-step-hero edit-step-hero--general">
        <div className="edit-step-hero-icon"><InfoCircleOutlined /></div>
        <div className="edit-step-hero-body">
          <div className="edit-step-hero-title">Identité de la formation</div>
          <div className="edit-step-hero-subtitle">
            Définissez les informations principales : titre, période, type, état et rattachement organisationnel.
          </div>
        </div>
      </div>

      <div className="creation-section-box edit-section-box">
        <div className="creation-section-box-title">
          <InfoCircleOutlined /> Informations principales
        </div>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <label className="creation-field-label">
              Titre <span className="creation-field-required">*</span>
            </label>
            <Input
              size="large"
              value={h.titre}
              onChange={(e) => h.setTitre(e.target.value)}
              disabled={h.isResponsableDossier}
              placeholder="Ex : Formation Spring Boot avancé"
            />
          </Col>

          <Col xs={24} sm={12}>
            <label className="creation-field-label">Date de début</label>
            <DatePicker
              size="large"
              style={{ width: "100%" }}
              value={h.dateDebut ? dayjs(h.dateDebut) : null}
              onChange={(d: Dayjs | null) => h.setDateDebut(d ? d.format("YYYY-MM-DD") : "")}
              format="DD/MM/YYYY"
              disabled={h.isResponsableDossier}
            />
          </Col>
          <Col xs={24} sm={12}>
            <label className="creation-field-label">Date de fin</label>
            <DatePicker
              size="large"
              style={{ width: "100%" }}
              value={h.dateFin ? dayjs(h.dateFin) : null}
              onChange={(d: Dayjs | null) => h.setDateFin(d ? d.format("YYYY-MM-DD") : "")}
              format="DD/MM/YYYY"
              disabled={h.isResponsableDossier}
            />
          </Col>

          <Col xs={24} sm={12}>
            <label className="creation-field-label"><EnvironmentOutlined /> Salle / Lieu</label>
            <Input
              size="large"
              value={h.salle}
              onChange={(e) => h.setSalle(e.target.value)}
              disabled={h.isResponsableDossier}
              placeholder="Ex : Salle A101, Amphi B..."
              prefix={<EnvironmentOutlined style={{ color: "#a0aec0" }} />}
            />
          </Col>

          <Col xs={24} sm={8}>
            <label className="creation-field-label">Type</label>
            <Select
              size="large"
              value={h.typeFormation}
              onChange={h.setTypeFormation}
              disabled={h.isResponsableDossier}
              style={{ width: "100%" }}
              options={TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
            />
          </Col>
          <Col xs={24} sm={8}>
            <label className="creation-field-label">État</label>
            <Select
              size="large"
              value={h.etatFormation}
              onChange={h.setEtatFormation}
              disabled={h.isResponsableDossier}
              style={{ width: "100%" }}
              options={ETAT_OPTIONS.map((e) => ({ value: e.value, label: e.label }))}
            />
          </Col>
          <Col xs={24} sm={8}>
            <label className="creation-field-label">Charge horaire (h)</label>
            <InputNumber
              size="large"
              value={h.chargeH}
              onChange={(v) => h.setChargeH(v ?? 0)}
              disabled={h.isResponsableDossier}
              min={0}
              style={{ width: "100%" }}
            />
          </Col>

          <Col xs={24} sm={12}>
            <label className="creation-field-label">UP</label>
            <Select
              size="large"
              showSearch
              placeholder="Sélectionner une UP"
              value={h.selectedUp?.id}
              onChange={(val) => h.setSelectedUp(h.ups.find((u) => u.id === val) ?? null)}
              disabled={h.isResponsableDossier}
              style={{ width: "100%" }}
              options={h.ups.map((u) => ({ value: u.id, label: u.libelle }))}
              optionFilterProp="label"
            />
          </Col>
          <Col xs={24} sm={12}>
            <label className="creation-field-label">Département</label>
            <Select
              size="large"
              showSearch
              placeholder="Sélectionner un département"
              value={h.selectedDept?.id}
              onChange={(val) => h.setSelectedDept(h.depts.find((d) => d.id === val) ?? null)}
              disabled={h.isResponsableDossier}
              style={{ width: "100%" }}
              options={h.depts.map((d) => ({ value: d.id, label: d.libelle }))}
              optionFilterProp="label"
            />
          </Col>

          <Col xs={24} sm={12}>
            <label className="creation-field-label">Période</label>
            <Select
              size="large"
              value={h.periodCode}
              onChange={h.setPeriodCode}
              disabled={h.isResponsableDossier}
              style={{ width: "100%" }}
              options={PERIOD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </Col>
          {h.periodCode === "OTHER" && (
            <Col xs={24} sm={12}>
              <label className="creation-field-label">Précisez la période</label>
              <Input
                size="large"
                value={h.customPeriodLabel}
                onChange={(e) => h.setCustomPeriodLabel(e.target.value)}
                disabled={h.isResponsableDossier}
                placeholder="Ex : Mai - Juin 2024"
              />
            </Col>
          )}

          <Col span={24}>
            <div
              className={`creation-switch-row${h.ouverte ? " active" : ""}`}
              onClick={() => !h.isResponsableDossier && h.setOuverte(!h.ouverte)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); !h.isResponsableDossier && h.setOuverte(!h.ouverte); } }}
              style={{ cursor: h.isResponsableDossier ? 'not-allowed' : 'pointer', opacity: h.isResponsableDossier ? 0.6 : 1 }}
            >
              <Switch
                checked={h.ouverte}
                onChange={(v) => h.setOuverte(v)}
                disabled={h.isResponsableDossier}
              />
              <div className="creation-switch-texts">
                <span className="creation-switch-label">Formation ouverte aux inscriptions</span>
                <span className="creation-switch-hint">
                  Activez pour rendre la formation visible et accessible aux participants.
                </span>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );

  const renderPedagogyStep = () => (
    <div className="edit-step-grid">
      <div className="edit-step-hero edit-step-hero--pedagogy">
        <div className="edit-step-hero-icon"><ReadOutlined /></div>
        <div className="edit-step-hero-body">
          <div className="edit-step-hero-title">Détails pédagogiques</div>
          <div className="edit-step-hero-subtitle">
            Décrivez le contenu pédagogique, les objectifs, les méthodes d'évaluation et les acquis visés.
          </div>
        </div>
      </div>

      <div className="creation-section-box edit-section-box">
        <div className="creation-section-box-title">
          <ReadOutlined /> Informations pédagogiques
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <label className="creation-field-label">Domaine</label>
            <Input
              value={h.domaine}
              onChange={(e) => h.setDomaine(e.target.value)}
              disabled={h.isResponsableDossier}
              placeholder="Ex : Informatique, Management…"
            />
          </Col>
          <Col xs={24} sm={12}>
            <label className="creation-field-label">Population cible</label>
            <Input
              value={h.populationCible}
              onChange={(e) => h.setPopulationCible(e.target.value)}
              disabled={h.isResponsableDossier}
              placeholder="À qui s'adresse la formation ?"
            />
          </Col>
          <Col span={24}>
            <label className="creation-field-label">Objectifs</label>
            <Input.TextArea
              rows={3}
              value={h.objectifs}
              onChange={(e) => h.setObjectifs(e.target.value)}
              disabled={h.isResponsableDossier}
              placeholder="Objectifs globaux de la formation…"
            />
          </Col>
          <Col span={24}>
            <label className="creation-field-label">Objectifs pédagogiques</label>
            <Input.TextArea
              rows={3}
              value={h.objectifsPedago}
              onChange={(e) => h.setObjectifsPedago(e.target.value)}
              disabled={h.isResponsableDossier}
              placeholder="Compétences visées, savoir-faire…"
            />
          </Col>
          <Col xs={24} sm={12}>
            <label className="creation-field-label">Méthodes d'évaluation</label>
            <Input.TextArea
              rows={2}
              value={h.evalMethods}
              onChange={(e) => h.setEvalMethods(e.target.value)}
              disabled={h.isResponsableDossier}
              placeholder="Quiz, projet, examen…"
            />
          </Col>
          <Col xs={24} sm={12}>
            <label className="creation-field-label">Prérequis</label>
            <Input.TextArea
              rows={2}
              value={h.prerequis}
              onChange={(e) => h.setPrerequis(e.target.value)}
              disabled={h.isResponsableDossier}
              placeholder="Connaissances ou compétences nécessaires…"
            />
          </Col>
          <Col xs={24} sm={12}>
            <label className="creation-field-label">Acquis / Compétences validées</label>
            <Input.TextArea
              rows={2}
              value={h.acquis}
              onChange={(e) => h.setAcquis(e.target.value)}
              disabled={h.isResponsableDossier}
              placeholder="Ce que les apprenants sauront faire à l'issue…"
            />
          </Col>
          <Col xs={24} sm={12}>
            <label className="creation-field-label">Indicateurs de succès</label>
            <Input.TextArea
              rows={2}
              value={h.indicateurs}
              onChange={(e) => h.setIndicateurs(e.target.value)}
              disabled={h.isResponsableDossier}
              placeholder="Taux de réussite, satisfaction…"
            />
          </Col>
        </Row>
      </div>
    </div>
  );

  const renderSeancesStep = () => (
    <div className="edit-step-grid">
      <div className="edit-step-hero edit-step-hero--seances">
        <div className="edit-step-hero-icon"><CalendarOutlined /></div>
        <div className="edit-step-hero-body">
          <div className="edit-step-hero-title">Planification des séances</div>
          <div className="edit-step-hero-subtitle">
            Définissez le calendrier, les horaires, les salles et les durées. Le système détecte automatiquement les conflits.
          </div>
        </div>
      </div>

      {h.overlapWarnings.length > 0 && (
        <Alert
          className="creation-alert-overlap"
          type="error"
          showIcon
          icon={<WarningOutlined />}
          message="Conflits détectés"
          description={
            <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
              {h.overlapWarnings.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          }
        />
      )}

      <div className="creation-section-box">
        <div className="creation-section-box-title" style={{ display: "flex", justifyContent: "space-between" }}>
          <span><CalendarOutlined /> Séances ({h.seances.length})</span>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={h.addSeance}
            disabled={h.isResponsableDossier}
            className="creation-btn-add-seance"
            style={{ width: "auto", padding: "0 16px" }}
          >
            Ajouter une séance
          </Button>
        </div>

        {h.seances.length === 0 ? (
          <div className="creation-comp-empty">
            <CalendarOutlined />
            <span>Aucune séance planifiée. Cliquez sur "Ajouter une séance" pour commencer.</span>
          </div>
        ) : (
          <div className="creation-seances-list">
            {h.seances.map((s, i) => (
              <Card key={s.idSeance?.toString() ?? s.id?.toString() ?? `seance-${i}`} className="creation-seance-card">
                <div className="creation-seance-header">
                  <div>
                    <div className="creation-seance-title">
                      <span className="creation-seance-number">{i + 1}</span>
                      Séance {i + 1}
                    </div>
                    <div className="creation-seance-summary">
                      {s.dateSeance ? dayjs(s.dateSeance).format("DD/MM/YYYY") : "—"}
                      {s.heureDebut ? ` · ${s.heureDebut}–${s.heureFin}` : ""}
                      {s.salle ? ` · ${s.salle}` : ""}
                    </div>
                  </div>
                  <Space>
                    <Button
                      type="text"
                      size="small"
                      icon={s.expanded ? <UpOutlined /> : <DownOutlined />}
                      onClick={() => h.toggleSeance(i)}
                    />
                    {!h.isResponsableDossier && (
                      <Popconfirm title="Supprimer cette séance ?" onConfirm={() => h.removeSeance(i)} okText="Supprimer" cancelText="Annuler">
                        <Button type="text" danger size="small" icon={<span>🗑</span>} />
                      </Popconfirm>
                    )}
                  </Space>
                </div>

                <div className="creation-seance-body">
                  <Row gutter={[12, 12]}>
                    <Col xs={24} sm={6}>
                      <label className="creation-field-label">Date</label>
                      <DatePicker
                        style={{ width: "100%" }}
                        value={s.dateSeance ? dayjs(s.dateSeance) : null}
                        onChange={(d: Dayjs | null) => h.updateSeance(i, "dateSeance", d ? d.format("YYYY-MM-DD") : "")}
                        format="DD/MM/YYYY"
                        disabled={h.isResponsableDossier}
                      />
                    </Col>
                    <Col xs={12} sm={4}>
                      <label className="creation-field-label">Début</label>
                      <Input
                        type="time"
                        value={(s.heureDebut || "").slice(0, 5)}
                        onChange={(e) => h.updateSeance(i, "heureDebut", e.target.value)}
                        disabled={h.isResponsableDossier}
                      />
                    </Col>
                    <Col xs={12} sm={4}>
                      <label className="creation-field-label">Fin</label>
                      <Input
                        type="time"
                        value={(s.heureFin || "").slice(0, 5)}
                        onChange={(e) => h.updateSeance(i, "heureFin", e.target.value)}
                        disabled={h.isResponsableDossier}
                      />
                    </Col>
                    <Col xs={24} sm={4}>
                      <label className="creation-field-label">Type</label>
                      <Select
                        value={s.typeSeance}
                        onChange={(v) => h.updateSeance(i, "typeSeance", v)}
                        disabled={h.isResponsableDossier}
                        style={{ width: "100%" }}
                        options={[
                          { value: "THEORIQUE", label: "Théorique" },
                          { value: "PRATIQUE",  label: "Pratique"  },
                        ]}
                      />
                    </Col>
                    <Col xs={24} sm={6}>
                      <label className="creation-field-label">Salle</label>
                      <Input
                        value={s.salle}
                        onChange={(e) => h.updateSeance(i, "salle", e.target.value)}
                        disabled={h.isResponsableDossier}
                        placeholder="Salle / visio"
                      />
                    </Col>
                    {s.expanded && (
                      <>
                        <Col xs={12} sm={6}>
                          <label className="creation-field-label">Durée théo. (h)</label>
                          <InputNumber
                            value={s.dureeTheorique}
                            onChange={(v) => h.updateSeance(i, "dureeTheorique", v ?? 0)}
                            min={0}
                            disabled={h.isResponsableDossier}
                            style={{ width: "100%" }}
                          />
                        </Col>
                        <Col xs={12} sm={6}>
                          <label className="creation-field-label">Durée prat. (h)</label>
                          <InputNumber
                            value={s.dureePratique}
                            onChange={(v) => h.updateSeance(i, "dureePratique", v ?? 0)}
                            min={0}
                            disabled={h.isResponsableDossier}
                            style={{ width: "100%" }}
                          />
                        </Col>
                        <Col span={24}>
                          <label className="creation-field-label">Contenus</label>
                          <Input.TextArea
                            rows={2}
                            value={s.contenus}
                            onChange={(e) => h.updateSeance(i, "contenus", e.target.value)}
                            disabled={h.isResponsableDossier}
                            placeholder="Sujets, modules, chapitres…"
                          />
                        </Col>
                        <Col span={24}>
                          <label className="creation-field-label">Méthodes</label>
                          <Input.TextArea
                            rows={2}
                            value={s.methodes}
                            onChange={(e) => h.updateSeance(i, "methodes", e.target.value)}
                            disabled={h.isResponsableDossier}
                            placeholder="Pédagogie, supports, outils…"
                          />
                        </Col>
                      </>
                    )}
                  </Row>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderActeursStep = () => {
    const totalPersonnes = h.animSel.length + h.partSel.length;
    const isReloading = h.isReloading || h.isFetchingEnseignants || h.isFetchingAccounts;
    const externalMode = h.typeFormation === "EXTERNE";
    const cardFilterStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" };

    const renderPersonTag = (
      person: Record<string, unknown> | undefined,
      value: string,
      closable: boolean,
      onClose: () => void,
      accentColor: string,
      badge?: { label: string; color: string },
    ) => {
      const nom = (person?.nom as string) || "";
      const prenom = (person?.prenom as string) || "";
      const mail = ((person?.mail as string) || (person?.email as string) || "") as string;
      const fullName = `${prenom} ${nom}`.trim() || String(value);
      const initials = getInitials(nom, prenom);
      const bg = avatarColor(String(person?.id || mail || fullName));
      return (
        <Tag
          closable={closable}
          onClose={onClose}
          style={{
            padding: "4px 8px 4px 4px",
            borderRadius: 999,
            border: `1px solid ${accentColor}33`,
            background: `${accentColor}0d`,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginRight: 6,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: bg,
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {initials}
          </span>
          <span style={{ fontSize: 12, color: "#0f172a" }}>{fullName}</span>
          {badge && (
            <Tag color={badge.color} style={{ marginInlineEnd: 0, margin: 0, fontSize: 10, lineHeight: "14px", padding: "0 6px" }}>
              {badge.label}
            </Tag>
          )}
        </Tag>
      );
    };

    const renderAnimateurTag = (props: { value: string; closable: boolean; onClose: () => void }) => {
      const person = h.optionsAnim.find((o) => String(o.id) === props.value) ?? h.animSel.find((a) => String(a.id) === props.value);
      const role = roleOfPerson((person ?? {}) as Record<string, unknown>);
      const color = ACTEUR_ROLE_COLORS[role] || "#7c3aed";
      return renderPersonTag(person as Record<string, unknown>, props.value, props.closable, props.onClose, color, { label: role, color });
    };

    const renderParticipantTag = (props: { value: string; closable: boolean; onClose: () => void }) => {
      const person = h.optionsPart.find((o) => String(o.id) === props.value) ?? h.partSel.find((p) => String(p.id) === props.value);
      const isCup = person && (person.cup === "O" || person.cup === "Y" || person.cup === "1");
      const isChef = person && (person.chefDepartement === "O" || person.chefDepartement === "Y" || person.chefDepartement === "1");
      const accent = isCup ? "#7c3aed" : isChef ? "#ea580c" : "#0d9488";
      const badge = isCup ? { label: "CUP", color: "purple" } : isChef ? { label: "Chef", color: "volcano" } : undefined;
      return renderPersonTag(person as Record<string, unknown>, props.value, props.closable, props.onClose, accent, badge);
    };

    return (
      <div className="edit-step-grid">
        <div className="edit-step-hero edit-actors-hero">
          <div className="edit-step-hero-icon"><TeamOutlined /></div>
          <div className="edit-step-hero-body">
            <div className="edit-step-hero-title">Sélection des acteurs</div>
            <div className="edit-step-hero-subtitle">
              Composez l'équipe pédagogique et la liste des participants. Les animateurs animent les séances ;
              les participants assistent à la formation. Les filtres (UP / Département / recherche) et le bouton
              "Recharger les données" vous permettent de rafraîchir la liste des enseignants et comptes à tout moment.
            </div>
          </div>
          <Space size="small">
            <Tooltip title="Recharger enseignants, comptes, UPs et départements depuis le serveur">
              <Button
                icon={<ReloadOutlined spin={isReloading} />}
                onClick={() => { void h.refetchAll(); }}
                loading={isReloading}
              >
                Recharger les données
              </Button>
            </Tooltip>
          </Space>
        </div>

        <Row gutter={[12, 12]} className="edit-actors-stat-row">
          <Col xs={12} sm={6}>
            <div className="edit-actors-stat edit-actors-stat--anim">
              <div className="edit-actors-stat-icon"><UsergroupAddOutlined /></div>
              <div className="edit-actors-stat-value">{h.animSel.length}</div>
              <div className="edit-actors-stat-label">Animateurs</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="edit-actors-stat edit-actors-stat--part">
              <div className="edit-actors-stat-icon"><UserAddOutlined /></div>
              <div className="edit-actors-stat-value">{h.partSel.length}</div>
              <div className="edit-actors-stat-label">Participants</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="edit-actors-stat">
              <div className="edit-actors-stat-icon"><TeamOutlined /></div>
              <div className="edit-actors-stat-value">{totalPersonnes}</div>
              <div className="edit-actors-stat-label">Total personnes</div>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div className="edit-actors-stat edit-actors-stat--meta">
              <div className="edit-actors-stat-icon"><InfoCircleOutlined /></div>
              <div className="edit-actors-stat-value edit-actors-stat-value--small">{formatLastReload(h.lastReloadAt)}</div>
              <div className="edit-actors-stat-label">État du cache local</div>
            </div>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={externalMode ? 24 : 12}>
        {externalMode ? (
          <div className="creation-externe-box">
            <div className="creation-externe-title">
              <TeamOutlined /> Formateur externe
            </div>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={8}>
                <label className="creation-field-label">Nom</label>
                <Input value={h.formNom} onChange={(e) => h.setFormNom(e.target.value)} placeholder="Nom" />
              </Col>
              <Col xs={24} sm={8}>
                <label className="creation-field-label">Prénom</label>
                <Input value={h.formPrenom} onChange={(e) => h.setFormPrenom(e.target.value)} placeholder="Prénom" />
              </Col>
              <Col xs={24} sm={8}>
                <label className="creation-field-label">Email</label>
                <Input type="email" value={h.formEmail} onChange={(e) => h.setFormEmail(e.target.value)} placeholder="email@exemple.com" />
              </Col>
            </Row>
          </div>
        ) : (
          <Card
            className="edit-actors-card edit-actors-card--anim"
            bordered
            title={
              <div className="edit-actors-card-title">
                <Badge color="#7c3aed" />
                <TeamOutlined style={{ color: "#7c3aed" }} />
                <span>Animateurs</span>
                <Tag color="purple" style={{ marginInlineStart: 8 }}>{h.animSel.length} sélectionné{h.animSel.length > 1 ? "s" : ""}</Tag>
              </div>
            }
            extra={
              <Space size={4}>
                <Tooltip title="Tout sélectionner (selon les filtres)">
                  <Button size="small" icon={<UsergroupAddOutlined />} onClick={h.selectAllVisibleAnim} disabled={h.animSel.length >= h.optionsAnim.length && h.optionsAnim.length > 0}>
                    Tout
                  </Button>
                </Tooltip>
                <Tooltip title="Vider la sélection">
                  <Button size="small" icon={<ClearOutlined />} onClick={h.clearAnimSel} disabled={h.animSel.length === 0}>
                    Vider
                  </Button>
                </Tooltip>
              </Space>
            }
          >
            <div className="edit-actors-filters" style={cardFilterStyle}>
              <Input
                allowClear
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                placeholder="Rechercher (nom, prénom, email)…"
                value={h.animSearch}
                onChange={(e) => h.setAnimSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200 }}
              />
              <Select
                allowClear
                placeholder={<><FilterOutlined /> UP</>}
                value={h.animFilterUp?.id}
                onChange={(val) => h.setAnimFilterUp(h.ups.find((u) => u.id === val) ?? null)}
                options={h.ups.map((u) => ({ value: String(u.id), label: u.libelle }))}
                style={{ minWidth: 130 }}
              />
              <Select
                allowClear
                placeholder={<><FilterOutlined /> Département</>}
                value={h.animFilterDept?.id}
                onChange={(val) => h.setAnimFilterDept(h.depts.find((d) => d.id === val) ?? null)}
                options={h.depts.map((d) => ({ value: String(d.id), label: d.libelle }))}
                style={{ minWidth: 150 }}
              />
            </div>
            <Divider style={{ margin: "12px 0" }} />
            <Spin spinning={isReloading} tip="Rechargement…">
              {h.optionsAnim.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    h.animSearch || h.animFilterUp || h.animFilterDept
                      ? "Aucun animateur ne correspond aux filtres. Essayez de les réinitialiser ou de recharger les données."
                      : "Aucun animateur disponible. Vérifiez la connexion au serveur et cliquez sur 'Recharger les données'."
                  }
                />
              ) : (
                <Select
                  mode="multiple"
                  size="large"
                  value={h.animSel.map((a) => String(a.id))}
                  onChange={(ids) => {
                    const set = new Set(ids.map(String));
                    h.setAnimSel(h.optionsAnim.filter((o) => set.has(String(o.id))));
                  }}
                  options={h.optionsAnim.map((o) => ({ value: String(o.id), label: h.getEnseignantLabel(o) }))}
                  optionFilterProp="label"
                  showSearch
                  placeholder="Rechercher et sélectionner des animateurs…"
                  style={{ width: "100%" }}
                  tagRender={renderAnimateurTag}
                  maxTagCount="responsive"
                />
              )}
            </Spin>
            {h.animSel.length > 0 && (
              <div className="edit-actors-selected-summary">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <InfoCircleOutlined /> Les animateurs sélectionnés peuvent aussi être modifiés séance par séance à l'étape précédente.
                </Text>
              </div>
            )}
          </Card>
        )}
          </Col>
          <Col xs={24} md={12}>
        <Card
          className="edit-actors-card edit-actors-card--part"
          bordered
          title={
            <div className="edit-actors-card-title">
              <Badge color="#0d9488" />
              <UserAddOutlined style={{ color: "#0d9488" }} />
              <span>Participants</span>
              <Tag color="cyan" style={{ marginInlineStart: 8 }}>{h.partSel.length} sélectionné{h.partSel.length > 1 ? "s" : ""}</Tag>
            </div>
          }
          extra={
            <Space size={4}>
              <Upload
                accept=".xlsx,.xls"
                beforeUpload={() => false}
                showUploadList={false}
                onChange={(info) => {
                  const file = info.file.originFileObj as File | undefined;
                  if (!file) return;
                  const fakeEvent = { target: { files: [file], value: "" } } as unknown as React.ChangeEvent<HTMLInputElement>;
                  void h.handleFile(fakeEvent);
                }}
              >
                <Tooltip title="Importer un fichier Excel (colonne Email)">
                  <Button size="small" icon={<FileExcelOutlined />}>
                    Importer Excel
                  </Button>
                </Tooltip>
              </Upload>
              <Tooltip title="Tout sélectionner (selon les filtres)">
                <Button size="small" icon={<UsergroupAddOutlined />} onClick={h.selectAllVisiblePart} disabled={h.partSel.length >= h.optionsPart.length && h.optionsPart.length > 0}>
                  Tout
                </Button>
              </Tooltip>
              <Tooltip title="Vider la sélection">
                <Button size="small" icon={<ClearOutlined />} onClick={h.clearPartSel} disabled={h.partSel.length === 0}>
                  Vider
                </Button>
              </Tooltip>
            </Space>
          }
        >
          <div className="edit-actors-filters" style={cardFilterStyle}>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              placeholder="Rechercher (nom, prénom, email)…"
              value={h.partSearch}
              onChange={(e) => h.setPartSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <Select
              allowClear
              placeholder={<><FilterOutlined /> UP</>}
              value={h.partFilterUp?.id}
              onChange={(val) => h.setPartFilterUp(h.ups.find((u) => u.id === val) ?? null)}
              options={h.ups.map((u) => ({ value: String(u.id), label: u.libelle }))}
              style={{ minWidth: 130 }}
            />
            <Select
              allowClear
              placeholder={<><FilterOutlined /> Département</>}
              value={h.partFilterDept?.id}
              onChange={(val) => h.setPartFilterDept(h.depts.find((d) => d.id === val) ?? null)}
              options={h.depts.map((d) => ({ value: String(d.id), label: d.libelle }))}
              style={{ minWidth: 150 }}
            />
          </div>
          <Divider style={{ margin: "12px 0" }} />
          <Spin spinning={isReloading} tip="Rechargement…">
            {h.optionsPart.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  h.partSearch || h.partFilterUp || h.partFilterDept
                    ? "Aucun participant ne correspond aux filtres. Essayez de les réinitialiser ou de recharger les données."
                    : "Aucun participant disponible. Vérifiez la connexion au serveur et cliquez sur 'Recharger les données'."
                }
              />
            ) : (
              <Select
                mode="multiple"
                size="large"
                value={h.partSel.map((p) => String(p.id))}
                onChange={(ids) => {
                  const set = new Set(ids.map(String));
                  h.setPartSel(h.optionsPart.filter((o) => set.has(String(o.id))));
                }}
                options={h.optionsPart.map((o) => ({ value: String(o.id), label: h.getEnseignantLabel(o) }))}
                optionFilterProp="label"
                showSearch
                placeholder="Rechercher et sélectionner des participants…"
                style={{ width: "100%" }}
                tagRender={renderParticipantTag}
                maxTagCount="responsive"
              />
            )}
          </Spin>
          {h.partSel.length > 0 && (
            <div className="edit-actors-selected-summary">
              <Text type="secondary" style={{ fontSize: 12 }}>
                <InfoCircleOutlined /> Astuce : vous pouvez importer un fichier Excel (1 colonne "Email") pour ajouter
                rapidement plusieurs participants.
              </Text>
            </div>
          )}
        </Card>
          </Col>
        </Row>
      </div>
    );
  };

  const renderCostsStep = () => (
    <div className="edit-step-grid">
      <div className="edit-step-hero edit-step-hero--costs">
        <div className="edit-step-hero-icon"><DollarOutlined /></div>
        <div className="edit-step-hero-body">
          <div className="edit-step-hero-title">Coûts et budget</div>
          <div className="edit-step-hero-subtitle">
            Renseignez les coûts de la formation, transport, hébergement et repas. Le total est calculé automatiquement.
          </div>
        </div>
      </div>

      {h.typeFormation === "EXTERNE" ? (
        <div className="creation-section-box edit-section-box">
          <div className="creation-section-box-title">
            <DollarOutlined /> Coûts (formation externe)
          </div>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <label className="creation-field-label">Organisme</label>
              <Input
                value={h.organisme}
                onChange={(e) => h.setOrganisme(e.target.value)}
                placeholder="Nom de l'organisme externe"
              />
            </Col>
            <Col xs={24} sm={12}>
              <label className="creation-field-label">Coût de la formation (TND)</label>
              <InputNumber
                value={h.cout}
                onChange={(v) => h.setCout(v ?? 0)}
                min={0}
                style={{ width: "100%" }}
                addonAfter="TND"
              />
            </Col>
            <Col xs={24} sm={8}>
              <label className="creation-field-label">Transport (TND)</label>
              <InputNumber
                value={h.coutTransport}
                onChange={(v) => h.setCoutTransport(v ?? 0)}
                min={0}
                style={{ width: "100%" }}
                addonAfter="TND"
              />
            </Col>
            <Col xs={24} sm={8}>
              <label className="creation-field-label">Hébergement (TND)</label>
              <InputNumber
                value={h.coutHebergement}
                onChange={(v) => h.setCoutHebergement(v ?? 0)}
                min={0}
                style={{ width: "100%" }}
                addonAfter="TND"
              />
            </Col>
            <Col xs={24} sm={8}>
              <label className="creation-field-label">Repas (TND)</label>
              <InputNumber
                value={h.coutRepas}
                onChange={(v) => h.setCoutRepas(v ?? 0)}
                min={0}
                style={{ width: "100%" }}
                addonAfter="TND"
              />
            </Col>
          </Row>
        </div>
      ) : (
        <div className="creation-section-box">
          <div className="creation-section-box-title">
            <InfoCircleOutlined /> Coûts
          </div>
          <Alert
            showIcon
            type="info"
            message="Formation interne"
            description="Les coûts ne sont renseignés que pour les formations de type EXTERNE. Changez le type à l'étape Général pour accéder aux champs de coûts."
          />
        </div>
      )}

      <div className="creation-section-box">
        <div className="creation-section-box-title">
          <InfoCircleOutlined /> Récapitulatif
        </div>
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={6}>
            <div className="edit-summary-tile">
              <div className="edit-summary-tile-label">Séances</div>
              <div className="edit-summary-tile-value" style={{ color: brand[500] }}>{h.seances.length}</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="edit-summary-tile">
              <div className="edit-summary-tile-label">Heures totales</div>
              <div className="edit-summary-tile-value" style={{ color: "#2563eb" }}>{totalHeures}h</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="edit-summary-tile">
              <div className="edit-summary-tile-label">Participants</div>
              <div className="edit-summary-tile-value" style={{ color: "#059669" }}>{h.partSel.length}</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="edit-summary-tile">
              <div className="edit-summary-tile-label">Coût total</div>
              <div className="edit-summary-tile-value" style={{ color: "#7c3aed" }}>{totalCout.toLocaleString()} <small>TND</small></div>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );

  const renderStep = (step: number) => {
    switch (step) {
      case 0: return renderGeneralStep();
      case 1: return renderPedagogyStep();
      case 2: return renderSeancesStep();
      case 3: return renderActeursStep();
      case 4: return renderCostsStep();
      default: return null;
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // RENDU PRINCIPAL
  // ════════════════════════════════════════════════════════════════════════

  return (
    <form onSubmit={handleSubmit} className="edit-form">
      {/* ── Progress bar ───────────────────────────────────────────── */}
      <div className="edit-progress-bar">
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            className={`edit-progress-step${i <= activeStep ? " filled" : ""}`}
            onClick={() => { stepDir.current = i > activeStep ? 1 : -1; setActiveStep(i); }}
          >
            <div className="edit-progress-fill" />
          </div>
        ))}
      </div>

      {/* ── Hero compact ─────────────────────────────────────────────── */}
      <div className="edit-hero">
        <div className="edit-hero-icon" aria-hidden="true">
          <InfoCircleOutlined />
        </div>
        <div className="edit-hero-body">
          <Title level={5} className="edit-hero-title">
            {h.titre || "Modifier la formation"}
          </Title>
          <div className="edit-hero-meta">
            <Tag color={etatMeta.color} style={{ background: etatMeta.bg, borderColor: etatMeta.color, fontWeight: 600 }}>
              {etatMeta.label}
            </Tag>
            {h.dateDebut && h.dateFin && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(h.dateDebut).format("DD/MM/YYYY")} → {dayjs(h.dateFin).format("DD/MM/YYYY")}
              </Text>
            )}
            {h.selectedUp?.libelle && (
              <Text type="secondary" style={{ fontSize: 12 }}>· {String(h.selectedUp.libelle)}</Text>
            )}
          </div>
        </div>
      </div>

      {/* ── Body : sidebar + contenu ────────────────────────────────── */}
      <div className="edit-body">
        {/* Sidebar */}
        <aside className="edit-sidebar">
          <nav className="edit-sidenav">
            {STEPS.map((s, i) => {
              const isDone = i < activeStep;
              const isActive = i === activeStep;
              return (
                <button
                  key={s.title}
                  type="button"
                  className={`edit-sidenav-item${isActive ? " active" : ""}${isDone ? " done" : ""}`}
                  onClick={() => { stepDir.current = i > activeStep ? 1 : -1; setActiveStep(i); }}
                >
                  <span className="edit-sidenav-num">
                    {isDone ? <CheckOutlined /> : i + 1}
                  </span>
                  <span className="edit-sidenav-label">{s.title}</span>
                  {isActive && <span className="edit-sidenav-dot" />}
                </button>
              );
            })}
          </nav>
          <Divider style={{ margin: "10px 0" }} />
          <div className="edit-sidebar-summary">
            <div className="edit-sidebar-summary-row">
              <span>Séances</span><strong>{h.seances.length}</strong>
            </div>
            <div className="edit-sidebar-summary-row">
              <span>Acteurs</span><strong>{h.animSel.length + h.partSel.length}</strong>
            </div>
            <div className="edit-sidebar-summary-row">
              <span>Coût total</span><strong>{totalCout.toLocaleString("fr-FR")} TND</strong>
            </div>
            <div className="edit-sidebar-summary-row">
              <span>Heures</span><strong>{totalHeures} h</strong>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="edit-main">
          <Card className="edit-card" bordered={false}>
            <div className="edit-card-header">
              <span className="edit-card-step-badge">Étape {activeStep + 1}/{STEPS.length}</span>
              <div className="edit-card-header-main">
                <span className="edit-card-header-icon">{STEPS[activeStep].icon}</span>
                <span className="edit-card-header-title">{STEPS[activeStep].title}</span>
              </div>
              <span className="edit-card-header-progress">{Math.round(((activeStep + 1) / STEPS.length) * 100)}%</span>
            </div>
            <div className={`edit-card-body ${stepDir.current >= 0 ? "step-enter-right" : "step-enter-left"}`} key={`step-${activeStep}`}>
              {renderStep(activeStep)}
            </div>
            <div className="edit-card-footer">
              <Button
                disabled={activeStep === 0}
                onClick={goBack}
                size="large"
                className="edit-btn-back"
              >
                ← Retour
              </Button>
              <Space size={10}>
                {!h.isResponsableDossier && (
                  <Button
                    type="primary"
                    size="large"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    className="edit-btn-save"
                    loading={h.saving}
                  >
                    Enregistrer
                  </Button>
                )}
                {activeStep < STEPS.length - 1 && (
                  <Button
                    size="large"
                    onClick={goNext}
                    className="edit-btn-next"
                  >
                    Suivant →
                  </Button>
                )}
              </Space>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Documents (rapide) ──────────────────────────────────────── */}
      <Card className="creation-step-card" size="small">
        <div className="wf-step-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
          <div className="wf-step-header-icon" style={{ background: "#0ea5e9" }} aria-hidden="true">
            <FolderOpenOutlined />
          </div>
          <div className="wf-step-header-text">
            <div className="wf-step-header-title">Gestion documentaire</div>
            <div className="wf-step-header-desc">Ajouter ou consulter les pièces jointes du dossier</div>
          </div>
        </div>
        <div className="creation-step-content">
          <Space>
            <Button icon={<UploadOutlined />} onClick={() => h.setOpenUploadPanel(true)}>
              Scanner / Ajouter un document
            </Button>
            <Button onClick={() => h.setOpenDocModal(true)}>
              Consulter le dossier
            </Button>
          </Space>
        </div>
      </Card>

      <Modal
        open={h.openUploadPanel}
        onCancel={() => h.setOpenUploadPanel(false)}
        title="Ajouter au dossier"
        width={600}
        footer={null}
      >
        <DocumentUploadPanel
          formationId={formation.idFormation}
          onDocumentAdded={() => h.setOpenUploadPanel(false)}
          onClose={() => h.setOpenUploadPanel(false)}
        />
      </Modal>

      <DocumentListModal
        open={h.openDocModal}
        formation={formation}
        onClose={() => h.setOpenDocModal(false)}
        onDocumentsUpdated={() => undefined}
      />
    </form>
  );
}
