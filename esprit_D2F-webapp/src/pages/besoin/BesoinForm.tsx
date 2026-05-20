/* ─────────────────────────────────────────────────────────────────────────
 * BesoinForm — Page "Ajouter un besoin de formation"
 * Wizard 4 étapes + récapitulatif groupé.
 * Design system partagé avec la page liste (.bf-scope + tokens --bf-*).
 * ─────────────────────────────────────────────────────────────────────── */
import { useContext, useEffect, useRef, useState } from "react";
import {
  Form,
  Input,
  Select,
  Button,
  Typography,
  Spin,
  Row,
  Col,
  Tag,
  Result,
  DatePicker,
  ConfigProvider,
  Breadcrumb,
  Progress,
  Empty,
} from "antd";
import locale from "antd/es/date-picker/locale/fr_FR";
import moment from "moment";
import {
  SaveOutlined,
  ApartmentOutlined,
  TeamOutlined,
  BookOutlined,
  AimOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  UploadOutlined,
  DeleteOutlined,
  CalendarOutlined,
  HomeOutlined,
  EditOutlined,
  NodeIndexOutlined,
  PlusOutlined,
  MinusCircleOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";

import { AuthContext } from "@/components/common/AuthProvider";
import BesoinFormationService from "@/services/besoin/BesoinFormationService";
import BesoinCompetenceService from "@/services/besoin/BesoinCompetenceService";
import CompetenceService from "@/services/competence/CompetenceService";
import DeptService from "@/services/formation/DeptService";
import UpService from "@/services/api/UploadService";
import useAppNotification from "@/hooks/ui/useAppNotification";
import "@/styles/pages/besoin-tokens.css";
import "@/styles/pages/besoin-form.css";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const PERIOD_OPTIONS = [
  { value: "WINTER",   label: "Winter" },
  { value: "SUMMER",   label: "Summer" },
  { value: "SPRINT",   label: "Sprint" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "OTHER",    label: "Autre" },
];

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction < 0 ? 40 : -40, opacity: 0 }),
};

const typeOptions = [
  {
    value: "INDIVIDUEL",
    label: "Individuel",
    description: "Une seule personne concernée par cette formation",
    icon: <UserOutlined />,
    accent: "#2563eb",
    accentBg: "#eff6ff",
  },
  {
    value: "COLLECTIF",
    label: "Collectif",
    description: "Plusieurs participants regroupés sur une même session",
    icon: <TeamOutlined />,
    accent: "#7c3aed",
    accentBg: "#f5f3ff",
  },
];

const prioriteOptions = [
  { value: "BASSE",    label: "Basse",    description: "Peut attendre",         accent: "#10b981", accentBg: "#ecfdf5" },
  { value: "MOYENNE",  label: "Moyenne",  description: "À planifier",           accent: "#f59e0b", accentBg: "#fffbeb" },
  { value: "HAUTE",    label: "Haute",    description: "Important",             accent: "#ef4444", accentBg: "#fef2f2" },
  { value: "CRITIQUE", label: "Critique", description: "Urgent — délai serré",  accent: "#b91c1c", accentBg: "#fef2f2" },
];

const STEPS_META = [
  { key: "contexte",    title: "Contexte",    subtitle: "UP, département & type",       icon: <ApartmentOutlined /> },
  { key: "formation",   title: "Formation",   subtitle: "Titre & objectifs",            icon: <AimOutlined /> },
  { key: "details",     title: "Détails",     subtitle: "Formateur, horaire & période", icon: <ClockCircleOutlined /> },
  { key: "competences", title: "Compétences", subtitle: "Référentiel RICE",             icon: <NodeIndexOutlined /> },
  { key: "parametres",  title: "Paramètres",  subtitle: "Type & évaluation",            icon: <CheckCircleOutlined /> },
];

/* ─────────────────────────────────────────────────────────────────────── */
/* Sub-component : SectionLabel (header au-dessus d'un groupe de champs) */
/* ─────────────────────────────────────────────────────────────────────── */
function SectionLabel({ icon, title, hint }) {
  return (
    <div className="bf-form-section">
      <div className="bf-form-section__icon">{icon}</div>
      <div className="bf-form-section__body">
        <div className="bf-form-section__title">{title}</div>
        {hint && <div className="bf-form-section__hint">{hint}</div>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Sub-component : ChoiceCardGroup (Type / Priorité)                       */
/* ─────────────────────────────────────────────────────────────────────── */
function ChoiceCardGroup({ options, value, onChange, variant = "type" }) {
  return (
    <div className={`bf-choice-grid bf-choice-grid--${variant}`}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            type="button"
            key={opt.value}
            className={`bf-choice${active ? " bf-choice--active" : ""}`}
            style={{
              "--choice-accent": opt.accent,
              "--choice-accent-bg": opt.accentBg,
            }}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
          >
            {variant === "type" ? (
              <span className="bf-choice__icon">{opt.icon}</span>
            ) : (
              <span className="bf-choice__dot" aria-hidden="true" />
            )}
            <span className="bf-choice__body">
              <span className="bf-choice__title">{opt.label}</span>
              <span className="bf-choice__desc">{opt.description}</span>
            </span>
            {active && (
              <span className="bf-choice__check" aria-hidden="true">
                <CheckCircleOutlined />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* MAIN COMPONENT                                                            */
/* ═══════════════════════════════════════════════════════════════════════ */
export default function BesoinForm() {
  const { user } = useContext(AuthContext);
  const [form] = Form.useForm();
  const activeRole = String(localStorage.getItem("activeRole") || "").toUpperCase();
  const userRole = String(user?.role || "").toUpperCase();
  const canManageParticipants = ["CUP", "ADMIN"].includes(userRole) || ["CUP", "ADMIN"].includes(activeRole);

  const { message: msgApi } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [departements, setDepartements] = useState([]);
  const [ups, setUps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const participantsFileInputRef = useRef(null);
  const [lastImportCount, setLastImportCount] = useState(0);
  const participantsText = Form.useWatch("publicCible", form) || "";
  const participantsLines = participantsText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const participantsCount = participantsLines.length;

  // Competence RICE state
  const [compDomaines, setCompDomaines] = useState<any[]>([]);
  const [compCompetences, setCompCompetences] = useState<any[]>([]);
  const [selectedCompLinks, setSelectedCompLinks] = useState<any[]>([]);
  const [rowSousComps, setRowSousComps] = useState<Record<number, any[]>>({});
  const [rowSavoirs, setRowSavoirs] = useState<Record<number, any[]>>({});
  const [compLoaded, setCompLoaded] = useState(false);
  const [compSearch, setCompSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [deptsData, upsData] = await Promise.all([DeptService.getAllDepts(), UpService.getAllUps()]);
        setDepartements(deptsData);
        setUps(upsData);
      } catch {
        msgApi.error("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    })();
  }, [msgApi]);

  // Lazy-load référentiel RICE quand l'utilisateur atteint l'étape Compétences (step 3)
  useEffect(() => {
    if (currentStep === 3 && !compLoaded) {
      const upId   = form.getFieldValue("up")         ? Number(form.getFieldValue("up"))         : null;
      const deptId = form.getFieldValue("departement") ? Number(form.getFieldValue("departement")) : null;
      Promise.all([
        CompetenceService.domaine.getAll(upId, deptId),
        CompetenceService.competence.getAll(),
      ]).then(([domainesData, competencesData]) => {
        setCompDomaines(Array.isArray(domainesData) ? domainesData : []);
        setCompCompetences(Array.isArray(competencesData) ? competencesData : []);
        setCompLoaded(true);
      }).catch(() => msgApi.error("Impossible de charger le référentiel de compétences"));
    }
  }, [currentStep]);

  const handleCompetenceChange = async (idx: number, competence: any) => {
    const updated = [...selectedCompLinks];
    updated[idx] = {
      ...updated[idx],
      competenceId: competence?.id || null,
      competenceNom: competence?.nom || "",
      domaineId: competence?.domaineId || updated[idx]?.domaineId || null,
      sousCompetenceId: null,
      savoirId: null,
    };
    setSelectedCompLinks(updated);
    const newSavoirs: Record<number, any[]> = { ...rowSavoirs };
    newSavoirs[idx] = [];
    if (competence?.id) {
      try {
        newSavoirs[idx] = await CompetenceService.savoir.getByCompetence(competence.id);
      } catch { /* ignore */ }
    }
    setRowSavoirs(newSavoirs);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const values = form.getFieldsValue(true);
      const payload = {
        username: user?.username || user?.userName || "anonymous",
        typeBesoin: values.typeBesoin,
        up: values.up,
        departement: values.departement,
        titre: values.titre,
        objectifFormation: values.objectifFormation,
        propositionAnimateur: values.propositionAnimateur,
        dateDebut: values.dateDebut ? values.dateDebut.format("YYYY-MM-DD") : undefined,
        dateFin: values.dateFin ? values.dateFin.format("YYYY-MM-DD") : undefined,
        priorite: values.priorite,
        impactStrategique: values.impactStrategique,
        publicCible: (canManageParticipants || values.typeBesoin === "INDIVIDUEL" || values.typeBesoin === "COLLECTIF") ? values.publicCible : undefined,
        estOuverte: values.estOuverte || false,
        autresInformations: values.autresInformations,
        theme: values.theme,
        dureeFormation: values.dureeFormation ? Number(values.dureeFormation) : undefined,
        nbMaxParticipants: values.nbMaxParticipants ? Number(values.nbMaxParticipants) : 0,
        periodCode: values.periodCode,
        customPeriodLabel: values.customPeriodLabel,
        objectifsPedagogiques: values.objectifsPedagogiques,
        methodesEvaluationAcquis: values.methodesEvaluationAcquis,
      };
      const created = await BesoinFormationService.addBesoinFormation(payload);
      const besoinId = created?.idBesoinFormation;
      if (besoinId && selectedCompLinks.length > 0) {
        const links = selectedCompLinks.filter((l) => l.competenceId).map((l) => ({ ...l }));
        if (links.length > 0) {
          await BesoinCompetenceService.replaceAll(Number(besoinId), links);
        }
      }
      msgApi.success("Besoin de formation ajouté avec succès !");
      setSubmitted(true);
      form.resetFields();
      setSelectedCompLinks([]);
      setRowSousComps({});
      setRowSavoirs({});
      setCompLoaded(false);
      setCompSearch("");
      setLastImportCount(0);
      setCurrentStep(0);
    } catch (err) {
      msgApi.error(err.response?.data?.message || "Erreur lors de l'ajout du besoin");
    } finally {
      setSubmitting(false);
    }
  };

  const getStepFields = (step: number) => {
    switch (step) {
      case 0: return ["up", "departement", "typeBesoin", "publicCible"];
      case 1: return ["titre", "theme", "objectifFormation", "objectifsPedagogiques", "priorite", "impactStrategique"];
      case 2: return ["propositionAnimateur", "dateDebut", "dateFin", "dureeFormation", "nbMaxParticipants", "periodCode", "customPeriodLabel"];
      case 3: return [];
      case 4: return ["estOuverte", "methodesEvaluationAcquis", "autresInformations"];
      default: return [];
    }
  };

  const importParticipantsFromExcel = async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) { msgApi.warning("Fichier Excel vide"); return; }
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1 });
      if (!Array.isArray(rows) || rows.length === 0) { msgApi.warning("Aucune donnée participants trouvée"); return; }
      const [headerRow = [], ...dataRows] = rows;
      const header = headerRow.map((cell) => String(cell || "").trim().toLowerCase());
      const idxNom = header.findIndex((h) => ["nom", "name"].includes(h));
      const idxPrenom = header.findIndex((h) => ["prénom", "prenom", "first name", "firstname"].includes(h));
      const idxEmail = header.findIndex((h) => ["email", "mail"].includes(h));
      const parsedLines = dataRows
        .map((row) => {
          if (!Array.isArray(row)) return "";
          const nom = idxNom >= 0 ? String(row[idxNom] || "").trim() : "";
          const prenom = idxPrenom >= 0 ? String(row[idxPrenom] || "").trim() : "";
          const email = idxEmail >= 0 ? String(row[idxEmail] || "").trim() : "";
          const fallback = String(row[0] || "").trim();
          if (nom || prenom || email) {
            return [nom, prenom].filter(Boolean).join(" ") + (email ? ` <${email}>` : "");
          }
          return fallback;
        })
        .map((l) => l.trim())
        .filter(Boolean);
      const uniqueLines = [...new Set(parsedLines)];
      const currentValue = String(form.getFieldValue("publicCible") || "").trim();
      const merged = [currentValue, ...uniqueLines].filter(Boolean).join("\n");
      form.setFieldsValue({ publicCible: merged });
      setLastImportCount(uniqueLines.length);
      msgApi.success(`${uniqueLines.length} participant(s) importé(s) depuis Excel`);
    } catch {
      msgApi.error("Erreur lors de l'import Excel des participants");
    } finally {
      if (participantsFileInputRef.current) participantsFileInputRef.current.value = "";
    }
  };

  const clearParticipants = () => { form.setFieldsValue({ publicCible: "" }); setLastImportCount(0); };

  const formatParticipantsSummary = (rawValue) => {
    const lines = String(rawValue || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return "—";
    const preview = lines.slice(0, 3).join(" | ");
    if (lines.length <= 3) return `${lines.length} participant(s) — ${preview}`;
    return `${lines.length} participant(s) — ${preview} ...`;
  };

  const next = async () => {
    try {
      await form.validateFields(getStepFields(currentStep));
      setDirection(1);
      setCurrentStep(currentStep + 1);
    } catch { /* validation failed */ }
  };
  const prev = () => { setDirection(-1); setCurrentStep(currentStep - 1); };

  /* ═══════════════ STEPS CONTENT ═══════════════ */

  const stepContent = [
    /* ────── Step 0 : Contexte ────── */
    <div key="contexte" className="bf-step">
      <SectionLabel
        icon={<ApartmentOutlined />}
        title="Identification de la demande"
        hint="Précisez l'unité pédagogique et le département concernés"
      />
      <Row gutter={[16, 12]}>
        <Col xs={24} md={12}>
          <Form.Item label="Unité Pédagogique (UP)" name="up" rules={[{ required: true, message: "Sélectionnez l'UP" }]}>
            <Select placeholder="Sélectionner l'UP" size="large" showSearch optionFilterProp="children">
              {ups.map((u) => <Option key={u.id} value={String(u.id)}>{u.name || u.libelle}</Option>)}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Département" name="departement" rules={[{ required: true, message: "Sélectionnez le département" }]}>
            <Select placeholder="Sélectionner le département" size="large" showSearch optionFilterProp="children">
              {departements.map((d) => <Option key={d.id} value={String(d.id)}>{d.name || d.libelle}</Option>)}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <SectionLabel
        icon={<BookOutlined />}
        title="Nature du besoin"
        hint="Une formation pour un enseignant ou un groupe ?"
      />
      <Form.Item name="typeBesoin" rules={[{ required: true, message: "Sélectionnez le type de besoin" }]}>
        <Form.Item noStyle shouldUpdate={(p, c) => p.typeBesoin !== c.typeBesoin}>
          {({ getFieldValue, setFieldsValue }) => (
            <ChoiceCardGroup
              variant="type"
              options={typeOptions}
              value={getFieldValue("typeBesoin")}
              onChange={(v) => setFieldsValue({ typeBesoin: v })}
            />
          )}
        </Form.Item>
      </Form.Item>

      <Form.Item noStyle shouldUpdate={(p, c) => p.typeBesoin !== c.typeBesoin}>
        {({ getFieldValue }) => {
          const typeBesoin = getFieldValue("typeBesoin");
          const isIndividuel = typeBesoin === "INDIVIDUEL";
          const isCollectif  = typeBesoin === "COLLECTIF";
          const showSection  = canManageParticipants || isIndividuel || isCollectif;
          if (!showSection) return null;
          const sectionTitle = canManageParticipants
            ? "Liste des participants"
            : isCollectif
            ? "Liste des enseignants participants"
            : "Autres enseignants participants";
          const sectionHint = canManageParticipants
            ? "Optionnel — vous pouvez importer un fichier Excel ou saisir manuellement"
            : isCollectif
            ? "Ajoutez les enseignants qui participeront à cette formation collective"
            : "Optionnel — ajoutez les enseignants qui participeront avec vous";
          return (
            <>
              <SectionLabel
                icon={<TeamOutlined />}
                title={sectionTitle}
                hint={sectionHint}
              />
              <Form.Item name="publicCible">
                <div className="bf-import-box">
                  <div className="bf-import-box__toolbar">
                    <Button
                      icon={<UploadOutlined />}
                      onClick={() => participantsFileInputRef.current?.click()}
                      className="bf-btn bf-btn--ghost"
                    >
                      Importer Excel
                    </Button>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={clearParticipants}
                      disabled={participantsCount === 0}
                      className="bf-btn bf-btn--ghost"
                    >
                      Vider la liste
                    </Button>
                    <div className="bf-import-box__stats">
                      <Tag color="blue" className="bf-import-tag">{participantsCount} participant{participantsCount > 1 ? "s" : ""}</Tag>
                      {lastImportCount > 0 && <Tag color="green" className="bf-import-tag">+{lastImportCount} importé{lastImportCount > 1 ? "s" : ""}</Tag>}
                    </div>
                  </div>
                  <input
                    ref={participantsFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: "none" }}
                    onChange={importParticipantsFromExcel}
                  />
                  <TextArea
                    rows={5}
                    placeholder="Un participant par ligne — format : Nom Prénom <email>"
                    showCount
                    maxLength={2000}
                    className="bf-import-textarea"
                  />
                  <div className="bf-import-box__hint">
                    Format attendu : <code>Nom Prénom &lt;email@esprit.tn&gt;</code>
                  </div>
                </div>
              </Form.Item>
            </>
          );
        }}
      </Form.Item>
    </div>,

    /* ────── Step 1 : Formation ────── */
    <div key="formation" className="bf-step">
      <SectionLabel
        icon={<BookOutlined />}
        title="Identité de la formation"
        hint="Comment cette formation sera-t-elle reconnue ?"
      />
      <Row gutter={[16, 12]}>
        <Col xs={24} md={12}>
          <Form.Item label="Nom de la formation" name="titre" rules={[{ required: true, message: "Le titre est obligatoire" }]}>
            <Input placeholder="Ex : Formation Angular avancé" size="large" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Domaine / Thème" name="@/components/common">
            <Input placeholder="Ex : Informatique, Management..." size="large" />
          </Form.Item>
        </Col>
      </Row>

      <SectionLabel
        icon={<AimOutlined />}
        title="Objectifs pédagogiques"
        hint="Décrivez ce que les participants doivent acquérir"
      />
      <Row gutter={[16, 12]}>
        <Col xs={24}>
          <Form.Item label="Objectif général" name="objectifFormation" rules={[{ required: true, message: "L'objectif est obligatoire" }]}>
            <TextArea rows={2} placeholder="Décrire l'objectif général..." showCount maxLength={500} />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item label="Objectifs pédagogiques détaillés" name="objectifsPedagogiques">
            <TextArea rows={3} placeholder="Compétences spécifiques à acquérir..." showCount maxLength={1000} />
          </Form.Item>
        </Col>
      </Row>

      <SectionLabel
        icon={<AimOutlined />}
        title="Urgence & impact"
        hint="Niveau de priorité et alignement stratégique"
      />
      <Form.Item name="priorite" rules={[{ required: true, message: "Sélectionnez la priorité" }]}>
        <Form.Item noStyle shouldUpdate={(p, c) => p.priorite !== c.priorite}>
          {({ getFieldValue, setFieldsValue }) => (
            <ChoiceCardGroup
              variant="priorite"
              options={prioriteOptions}
              value={getFieldValue("priorite")}
              onChange={(v) => setFieldsValue({ priorite: v })}
            />
          )}
        </Form.Item>
      </Form.Item>
      <Form.Item label="Impact stratégique" name="impactStrategique">
        <Input placeholder="Ex : Alignement avec la stratégie D2F..." size="large" />
      </Form.Item>
    </div>,

    /* ────── Step 2 : Détails ────── */
    <div key="details" className="bf-step">
      <SectionLabel
        icon={<UserOutlined />}
        title="Formateur souhaité"
        hint="Optionnel — vous pouvez proposer un nom"
      />
      <Form.Item label="Proposition de formateur" name="propositionAnimateur">
        <Input placeholder="Nom du formateur proposé (optionnel)" size="large" prefix={<UserOutlined />} />
      </Form.Item>

      <SectionLabel
        icon={<CalendarOutlined />}
        title="Période de formation"
        hint="Quand la formation devrait-elle se tenir ?"
      />
      <Row gutter={[16, 12]}>
        <Col xs={24} md={12}>
          <Form.Item label="Période" name="periodCode" rules={[{ required: true, message: "Choisissez une période" }]} initialValue="OTHER">
            <Select placeholder="Choisir la période" size="large">
              {PERIOD_OPTIONS.map((opt) => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Date de début" name="dateDebut" rules={[{ required: true, message: "Précisez la date de début" }]}>
            <DatePicker format="YYYY-MM-DD" placeholder="Date de début" size="large" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Date de fin" name="dateFin" rules={[{ required: true, message: "Précisez la date de fin" }]}>
            <DatePicker format="YYYY-MM-DD" placeholder="Date de fin" size="large" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Form.Item noStyle shouldUpdate={(p, c) => p.periodCode !== c.periodCode}>
          {({ getFieldValue }) => getFieldValue("periodCode") === "OTHER" ? (
            <Col xs={24}>
              <Form.Item
                label="Précisez la période"
                name="customPeriodLabel"
                rules={[{ required: true, message: "Précisez la période" }]}
              >
                <Input placeholder="Ex : Mai - Juin 2024" size="large" />
              </Form.Item>
            </Col>
          ) : null}
        </Form.Item>
      </Row>

      <SectionLabel
        icon={<TeamOutlined />}
        title="Charge horaire"
        hint="Durée et taille du groupe"
      />
      <Row gutter={[16, 12]}>
        <Col xs={24} md={12}>
          <Form.Item label="Durée prévue (heures)" name="dureeFormation">
            <Input type="number" placeholder="Ex : 40" size="large" suffix="h" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Nombre participants" name="nbMaxParticipants" rules={[{ required: true, message: "Précisez le nombre de participants" }]}>
            <Input type="number" placeholder="Ex : 20" size="large" />
          </Form.Item>
        </Col>
      </Row>
    </div>,

    /* ────── Step 3 : Compétences RICE ────── */
    <div key="competences" className="bf-step">
      <SectionLabel
        icon={<NodeIndexOutlined />}
        title="Compétences visées (référentiel RICE)"
        hint="Optionnel — sélectionnez les compétences et savoirs ciblés par cette formation"
      />
      {!compLoaded ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <Spin tip="Chargement du référentiel…" />
        </div>
      ) : compDomaines.length === 0 && compCompetences.length === 0 ? (
        <Empty description="Référentiel non disponible" />
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Input
              allowClear
              placeholder="Rechercher une compétence…"
              prefix={<NodeIndexOutlined style={{ color: "#999" }} />}
              value={compSearch}
              onChange={(e) => setCompSearch(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            {compSearch && (
              <span style={{ fontSize: 12, color: "#888" }}>
                {compCompetences.filter((c: any) => c.nom?.toLowerCase().includes(compSearch.trim().toLowerCase())).length} résultat(s)
              </span>
            )}
          </div>

          {selectedCompLinks.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Aucune compétence sélectionnée — cliquez sur « Ajouter » pour en associer"
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
              {selectedCompLinks.map((link, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 8, padding: "12px 14px" }}>
                  <span style={{ minWidth: 22, fontWeight: 600, color: "#999", paddingTop: 4 }}>{idx + 1}</span>
                  <div style={{ flex: 1, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Select
                      placeholder="Domaine (filtre)"
                      allowClear
                      style={{ minWidth: 180 }}
                      value={link.domaineId}
                      onChange={(val) => {
                        const u = [...selectedCompLinks];
                        u[idx] = { ...u[idx], domaineId: val ?? null, competenceId: null, savoirId: null };
                        setSelectedCompLinks(u);
                        const ns: Record<number, any[]> = { ...rowSavoirs }; ns[idx] = []; setRowSavoirs(ns);
                      }}
                      options={compDomaines.map((d: any) => ({ value: d.id, label: d.nom }))}
                      showSearch
                      optionFilterProp="label"
                    />
                    <Select
                      placeholder="Rechercher une compétence…"
                      allowClear
                      style={{ minWidth: 220 }}
                      value={link.competenceId}
                      onChange={(val) => handleCompetenceChange(idx, compCompetences.find((c: any) => c.id === val) || null)}
                      options={compCompetences
                        .filter((c: any) => {
                          const kw = compSearch.trim().toLowerCase();
                          return (!link.domaineId || c.domaineId === link.domaineId) && (!kw || c.nom?.toLowerCase().includes(kw));
                        })
                        .map((c: any) => ({ value: c.id, label: c.nom }))}
                      showSearch
                      optionFilterProp="label"
                    />
                    <Select
                      placeholder="Savoir (optionnel)"
                      allowClear
                      style={{ minWidth: 200 }}
                      value={link.savoirId}
                      disabled={!link.competenceId}
                      onChange={(val) => {
                        const u = [...selectedCompLinks];
                        u[idx] = { ...u[idx], savoirId: val ?? null, savoirNom: (rowSavoirs[idx] || []).find((s: any) => s.id === val)?.nom || "" };
                        setSelectedCompLinks(u);
                      }}
                      options={(rowSavoirs[idx] || []).map((s: any) => ({ value: s.id, label: `${s.nom} (${s.type || ""})` }))}
                      showSearch
                      optionFilterProp="label"
                    />
                  </div>
                  <Button
                    type="text"
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() => setSelectedCompLinks(selectedCompLinks.filter((_, i) => i !== idx))}
                  />
                </div>
              ))}
            </div>
          )}
          <Button
            icon={<PlusOutlined />}
            onClick={() => setSelectedCompLinks([...selectedCompLinks, { domaineId: null, competenceId: null, savoirId: null }])}
            style={{ marginTop: 4 }}
          >
            Ajouter une compétence
          </Button>
        </>
      )}
    </div>,

    /* ────── Step 4 : Paramètres ────── */
    <div key="parametres" className="bf-step">
      <SectionLabel
        icon={<ApartmentOutlined />}
        title="Accessibilité de la formation"
        hint="Réservée à l'UP ou ouverte à d'autres unités ?"
      />
      <Form.Item label="Type de formation" name="estOuverte">
        <Select placeholder="Ouverte ou fermée ?" size="large">
          <Option value={false}>Fermée — réservée aux participants de l'UP</Option>
          <Option value={true}>Ouverte — accessible à d'autres UPs</Option>
        </Select>
      </Form.Item>

      <SectionLabel
        icon={<CheckCircleOutlined />}
        title="Méthodes d'évaluation"
        hint="Comment évaluer les acquis ?"
      />
      <Form.Item label="Méthodes d'évaluation" name="methodesEvaluationAcquis">
        <Input placeholder="Ex : Quiz, Projet, QCM, mise en situation..." size="large" />
      </Form.Item>

      <SectionLabel
        icon={<BookOutlined />}
        title="Informations complémentaires"
        hint="Remarques, contraintes, contexte particulier"
      />
      <Form.Item label="Autres informations" name="autresInformations">
        <TextArea
          rows={4}
          placeholder="Informations additionnelles, spécificités, remarques particulières..."
          showCount
          maxLength={1000}
        />
      </Form.Item>
    </div>,
  ];

  /* ═══════════════ SUMMARY (groupé par section) ═══════════════ */

  const buildSummary = () => {
    const v = form.getFieldsValue(true);
    const upObj = ups.find((u) => String(u.id) === String(v.up));
    const depObj = departements.find((d) => String(d.id) === String(v.departement));
    const typeLabel = typeOptions.find((t) => t.value === v.typeBesoin)?.label;
    const prioMeta = prioriteOptions.find((p) => p.value === v.priorite);
    const periodLabel = v.periodCode === "OTHER"
      ? (v.customPeriodLabel || "Autre")
      : (PERIOD_OPTIONS.find((o) => o.value === v.periodCode)?.label || "—");

    return [
      {
        key: "contexte",
        title: "Contexte",
        icon: <ApartmentOutlined />,
        items: [
          { label: "Unité Pédagogique", value: upObj?.name || upObj?.libelle || "—" },
          { label: "Département",       value: depObj?.name || depObj?.libelle || "—" },
          { label: "Type de besoin",    value: typeLabel || "—" },
          ...((canManageParticipants || v.typeBesoin === "INDIVIDUEL" || v.typeBesoin === "COLLECTIF") ? [{ label: "Participants", value: formatParticipantsSummary(v.publicCible) }] : []),
        ],
      },
      {
        key: "formation",
        title: "Formation",
        icon: <BookOutlined />,
        items: [
          { label: "Nom",                 value: v.titre || "—", strong: true },
          { label: "Domaine",             value: v.theme || "—" },
          { label: "Objectif",            value: v.objectifFormation || "—" },
          { label: "Objectifs pédago",    value: v.objectifsPedagogiques || "—" },
          { label: "Priorité",            value: prioMeta?.label || "—", pillColor: prioMeta?.accent },
          { label: "Impact stratégique",  value: v.impactStrategique || "—" },
        ],
      },
      {
        key: "details",
        title: "Détails & planning",
        icon: <ClockCircleOutlined />,
        items: [
          { label: "Formateur proposé", value: v.propositionAnimateur || "—" },
          { label: "Période",           value: periodLabel },
          { label: "Date de début",     value: v.dateDebut ? v.dateDebut.format("DD/MM/YYYY") : "—" },
          { label: "Date de fin",       value: v.dateFin   ? v.dateFin.format("DD/MM/YYYY")   : "—" },
          { label: "Durée",             value: v.dureeFormation ? `${v.dureeFormation} h` : "—" },
          { label: "Participants max",  value: v.nbMaxParticipants ? `${v.nbMaxParticipants}` : "—" },
        ],
      },
      {
        key: "competences",
        title: "Compétences RICE",
        icon: <NodeIndexOutlined />,
        items: selectedCompLinks.filter((l) => l.competenceId).length === 0
          ? [{ label: "Compétences", value: "—" }]
          : selectedCompLinks.filter((l) => l.competenceId).map((l, i) => ({
              label: `Compétence ${i + 1}`,
              value: [l.competenceNom, l.savoirNom].filter(Boolean).join(" → ") || "—",
            })),
      },
      {
        key: "parametres",
        title: "Paramètres",
        icon: <CheckCircleOutlined />,
        items: [
          { label: "Type de formation", value: v.estOuverte ? "Ouverte (toutes UPs)" : "Fermée (UP uniquement)" },
          { label: "Évaluation",        value: v.methodesEvaluationAcquis || "—" },
          { label: "Autres informations", value: v.autresInformations || "—" },
        ],
      },
    ];
  };

  /* ═══════════════ RENDER ═══════════════ */

  if (loading) {
    return (
      <div className="bf-scope bf-form-page bf-form-page--loading">
        <Spin size="large" />
        <Text type="secondary" style={{ marginTop: 16 }}>Chargement...</Text>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="bf-scope bf-form-page">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <div className="bf-form-shell">
            <Result
              status="success"
              icon={
                <div className="bf-success-icon">
                  <CheckCircleOutlined />
                </div>
              }
              title={<Title level={3} style={{ margin: 0 }}>Besoin enregistré avec succès</Title>}
              subTitle="Votre demande de formation a été transmise et sera examinée prochainement par le CUP."
              extra={[
                <Button
                  type="primary"
                  key="list"
                  size="large"
                  className="bf-btn bf-btn--primary"
                  onClick={() => window.location.href = "/home/besoins"}
                >
                  Voir la liste des besoins
                </Button>,
                <Button
                  key="again"
                  size="large"
                  className="bf-btn bf-btn--ghost"
                  onClick={() => { setSubmitted(false); form.resetFields(); setCurrentStep(0); }}
                >
                  Ajouter un autre besoin
                </Button>,
              ]}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  const isSummary = currentStep >= STEPS_META.length;
  const progressPercent = isSummary
    ? 100
    : Math.round(((currentStep + 1) / (STEPS_META.length + 1)) * 100);

  return (
    <ConfigProvider
      locale={locale}
      theme={{ token: { colorPrimary: "#B51200", borderRadius: 10, fontFamily: "'Inter', sans-serif" } }}
    >
      <div className="bf-scope bf-form-page">
        {/* ═══════════ HEADER ═══════════ */}
        <header className="bf-form-header">
          <Breadcrumb
            className="bf-breadcrumb"
            items={[
              { href: "/home", title: <><HomeOutlined /> Accueil</> },
              { href: "/home/besoins", title: "Besoins de Formation" },
              { title: <strong>Ajouter un besoin</strong> },
            ]}
          />
          <div className="bf-form-header__row">
            <div className="bf-form-header__title-block">
              <h1 className="bf-form-header__title">Nouveau besoin de formation</h1>
              <p className="bf-form-header__subtitle">
                Décrivez votre besoin en quelques étapes — il sera transmis au CUP pour instruction.
              </p>
            </div>
            <div className="bf-form-header__progress">
              <Progress
                type="circle"
                percent={progressPercent}
                size={56}
                strokeColor={{ "0%": "#B51200", "100%": "#9a0f00" }}
                strokeWidth={8}
                format={() => (
                  <span className="bf-form-header__progress-text">
                    {isSummary ? STEPS_META.length : currentStep + 1}/<small>{STEPS_META.length}</small>
                  </span>
                )}
              />
            </div>
          </div>
        </header>

        {/* ═══════════ STEPPER MINIMAL ═══════════ */}
        <nav className="bf-stepper" aria-label="Étapes du formulaire">
          {STEPS_META.map((s, idx) => {
            const state = idx < currentStep ? "done" : idx === currentStep ? "active" : "pending";
            return (
              <button
                key={s.key}
                type="button"
                className={`bf-stepper__item bf-stepper__item--${state}`}
                onClick={() => idx <= currentStep && setCurrentStep(idx)}
                disabled={idx > currentStep}
                aria-current={idx === currentStep ? "step" : undefined}
              >
                <span className="bf-stepper__bubble">
                  {state === "done" ? <CheckCircleOutlined /> : <span>{idx + 1}</span>}
                </span>
                <span className="bf-stepper__text">
                  <span className="bf-stepper__title">{s.title}</span>
                  <span className="bf-stepper__sub">{s.subtitle}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* ═══════════ FORM SHELL ═══════════ */}
        <div className="bf-form-shell">
          <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off" preserve={true} className="bf-form">
            <AnimatePresence mode="wait" custom={direction}>
              {!isSummary ? (
                <motion.div
                  key={`step-${currentStep}`}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  {stepContent[currentStep]}
                </motion.div>
              ) : (
                <motion.div
                  key="summary"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="bf-summary">
                    <header className="bf-summary__header">
                      <div className="bf-summary__icon"><EditOutlined /></div>
                      <div>
                        <h2 className="bf-summary__title">Récapitulatif de votre demande</h2>
                        <p className="bf-summary__sub">Vérifiez les informations avant de soumettre. Cliquez sur "Modifier" pour revenir à une étape.</p>
                      </div>
                    </header>

                    <div className="bf-summary__grid">
                      {buildSummary().map((section, idx) => (
                        <article key={section.key} className="bf-summary-card">
                          <header className="bf-summary-card__head">
                            <span className="bf-summary-card__icon">{section.icon}</span>
                            <h3 className="bf-summary-card__title">{section.title}</h3>
                            <button
                              type="button"
                              className="bf-summary-card__edit"
                              onClick={() => { setDirection(-1); setCurrentStep(idx); }}
                            >
                              <EditOutlined /> Modifier
                            </button>
                          </header>
                          <dl className="bf-summary-card__list">
                            {section.items.map((it) => (
                              <div key={it.label} className="bf-summary-card__row">
                                <dt>{it.label}</dt>
                                <dd className={it.strong ? "is-strong" : ""}>
                                  {it.pillColor ? (
                                    <span className="bf-summary-pill" style={{ "--pill": it.pillColor }}>
                                      {it.value}
                                    </span>
                                  ) : (
                                    it.value
                                  )}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </article>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Form>
        </div>

        {/* ═══════════ STICKY NAV BAR ═══════════ */}
        <div className="bf-nav-bar" role="region" aria-label="Navigation du formulaire">
          <div className="bf-nav-bar__progress">
            <span className="bf-nav-bar__step-label">
              Étape {isSummary ? STEPS_META.length : currentStep + 1} sur {STEPS_META.length}
              {isSummary && <span className="bf-nav-bar__step-tag">Récapitulatif</span>}
            </span>
            <div className="bf-nav-bar__progress-track">
              <div className="bf-nav-bar__progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <div className="bf-nav-bar__actions">
            {currentStep > 0 && (
              <Button
                size="large"
                icon={<ArrowLeftOutlined />}
                onClick={prev}
                className="bf-btn bf-btn--ghost"
              >
                Précédent
              </Button>
            )}
            {currentStep < STEPS_META.length - 1 && (
              <Button
                type="primary"
                size="large"
                onClick={next}
                className="bf-btn bf-btn--primary"
              >
                Suivant <ArrowRightOutlined />
              </Button>
            )}
            {currentStep === STEPS_META.length - 1 && (
              <Button
                type="primary"
                size="large"
                onClick={next}
                className="bf-btn bf-btn--primary"
              >
                Voir le récapitulatif <ArrowRightOutlined />
              </Button>
            )}
            {isSummary && (
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={submitting}
                onClick={handleSubmit}
                className="bf-btn bf-btn--success"
              >
                Enregistrer le besoin
              </Button>
            )}
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}




