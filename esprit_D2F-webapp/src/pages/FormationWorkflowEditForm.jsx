import { useState, useEffect, useContext } from "react";
import { format } from "date-fns";
import {
  Row,
  Col,
  Input,
  InputNumber,
  Select,
  Button,
  Typography,
  Collapse,
  Modal,
  Radio,
  Divider,
  Space,
  Tag,
  message,
  Popconfirm,
  Upload,
} from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
  UpOutlined,
  DownOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";

import FormationWorkflowService from "../services/FormationWorkflowService";
import DeptService from "../services/DeptService";
import EnseignantService from "../services/EnseignantService";
import UpService from "../services/upService";
import { AuthContext } from "../context/AuthContext";
import DocumentListModal from "./documentFormation/DocumentListModal";
import DocumentUploadPanel from "./documentFormation/DocumentUploadPanel";

const { Text, Title } = Typography;
const { TextArea } = Input;

const PERIOD_OPTIONS = [
  { value: "P1", label: "Période 1" },
  { value: "P2", label: "Période 2" },
  { value: "P3", label: "Période 3" },
  { value: "P4", label: "Période 4" },
  { value: "SUMMER", label: "Session d'Été" },
  { value: "WINTER", label: "Session d'Hiver" },
  { value: "OTHER", label: "Autre" },
];

export default function FormationWorkflowEditForm({ formation, onFormationUpdated }) {
  const { user } = useContext(AuthContext);
  const role = String(user?.role || "").toLowerCase().replace(/[\s_-]+/g, "");
  const isResponsableDossier = role === "responsabledossier";
  
  // Can only edit everything if admin
  // Responsable dossier can only view info but manage documents
  
  /* -------------------- états principaux -------------------- */
  const [titre, setTitre] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [typeFormation, setTypeFormation] = useState("INTERNE");
  const [etatFormation, setEtatFormation] = useState("ENREGISTRE");
  const [cout, setCout] = useState(0);
  const [organisme, setOrganisme] = useState("");
  const [chargeH, setChargeH] = useState(40);

  /* formateur externe */
  const [formNom, setFormNom] = useState("");
  const [formPrenom, setFormPrenom] = useState("");
  const [formEmail, setFormEmail] = useState("");

  /* UP & Département */
  const [ups, setUps] = useState([]);
  const [depts, setDepts] = useState([]);
  const [selectedUp, setSelectedUp] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);

  /* enseignants + filtres */
  const [ens, setEns] = useState([]);
  const [, setAnimSel] = useState([]);
  const [partSel, setPartSel] = useState([]);
  const [existingFormations, setExistingFormations] = useState([]);
  const [overlapWarnings, setOverlapWarnings] = useState([]);
  const [animFilterUp] = useState(null);
  const [animFilterDept] = useState(null);
  const [partFilterUp, setPartFilterUp] = useState(null);
  const [partFilterDept, setPartFilterDept] = useState(null);

  /* “plus d’infos” */
  const [domaine, setDomaine] = useState("");
  const [populationCible, setPopulationCible] = useState("");
  const [objectifs, setObjectifs] = useState("");
  const [objectifsPedago, setObjectifsPedago] = useState("");
  const [evalMethods, setEvalMethods] = useState("");
  const [prerequis, setPrerequis] = useState("");
  const [acquis, setAcquis] = useState("");
  const [indicateurs, setIndicateurs] = useState("");

  /* frais annexes (EXTERNE) */
  const [coutTransport, setCoutTransport] = useState(0);
  const [coutHebergement, setCoutHebergement] = useState(0);
  const [coutRepas, setCoutRepas] = useState(0);

  /* séances */
  const [seances, setSeances] = useState([]);
  const [ouverte, setOuverte] = useState(false);
  
  // Structured Period State
  const [periodCode, setPeriodCode] = useState("OTHER");
  const [customPeriodLabel, setCustomPeriodLabel] = useState("");

  /* UI */
  const [showMore, setShowMore] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" }); // kept for compatibility, will use message.xxx
  const [openDocModal, setOpenDocModal] = useState(false);
  const [openUploadPanel, setOpenUploadPanel] = useState(false);
  
  const getEnseignantLabel = (opt) => {
    if (!opt) return "";
    let roles = [];
    if (opt.type === "P") roles.push("Perm.");
    if (opt.type === "V") roles.push("Vac.");
    if (opt.cup === "O" || opt.cup === "Y" || opt.cup === "1") roles.push("CUP");
    if (opt.chefDepartement === "O" || opt.chefDepartement === "Y" || opt.chefDepartement === "1") roles.push("ChefDep");
    
    const roleStr = roles.length > 0 ? ` [${roles.join(", ")}]` : "";
    return `${opt.nom} ${opt.prenom} (${opt.mail})${roleStr}`;
  };

  /* ---------- chargement de la formation à éditer ---------- */
  useEffect(() => {
    if (!formation) return;

    setTitre(formation.titreFormation);
    setDateDebut(format(new Date(formation.dateDebut), "yyyy-MM-dd"));
    setDateFin(format(new Date(formation.dateFin), "yyyy-MM-dd"));
    setTypeFormation(formation.typeFormation);
    setEtatFormation(formation.etatFormation);
    setCout(formation.coutFormation || 0);
    setOrganisme(formation.organismeRefExterne || "");
    setChargeH(formation.chargeHoraireGlobal || 40);

    setFormNom(formation.externeFormateurNom || "");
    setFormPrenom(formation.externeFormateurPrenom || "");
    setFormEmail(formation.externeFormateurEmail || "");
    setOuverte(!!formation.ouverte);
    setDomaine(formation.domaine || "");
    setPopulationCible(formation.populationCible || "");
    setObjectifs(formation.objectifs || "");
    setObjectifsPedago(formation.objectifsPedago || "");
    setEvalMethods(formation.evalMethods || "");
    setPrerequis(formation.prerequis || "");
    setAcquis(formation.acquis || "");
    setIndicateurs(formation.indicateurs || "");

    setCoutTransport(formation.coutTransport || 0);
    setCoutHebergement(formation.coutHebergement || 0);
    setCoutRepas(formation.coutRepas || 0);

    setSelectedUp(formation.up1 || null);
    setSelectedDept(formation.departement1 || null);
    
    // Mapping back period
    setPeriodCode(formation.periodCode || "OTHER");
    setCustomPeriodLabel(formation.customPeriodLabel || formation.periodeFormation || "");

    /* séances complètes (avec animateurs) */
    setSeances(
      (formation.seances || []).map((s) => ({
        idSeance: s.idSeance,
        dateSeance: format(new Date(s.dateSeance), "yyyy-MM-dd"),
        heureDebut: s.heureDebut,
        heureFin: s.heureFin,
        salle: s.salle || "",
        animateurs: s.animateurs || [],
        typeSeance: s.typeSeance || "THEORIQUE",
        contenus: s.contenus || "",
        methodes: s.methodes || "",
        dureeTheorique: s.dureeTheorique || 0,
        dureePratique: s.dureePratique || 0,
        expanded: false,
      }))
    );

    /* sélection animateurs / participants global */
    const amap = {},
      pmap = {};
    (formation.seances || []).forEach((s) => {
      (s.animateurs || []).forEach((a) => (amap[a.id] = a));
      (s.participants || []).forEach((p) => (pmap[p.id] = p));
    });
    setAnimSel(Object.values(amap));
    setPartSel(Object.values(pmap));
  }, [formation]);

  /* ---------- chargement des listes de référence ---------- */
  useEffect(() => {
    (async () => {
      try {
        const [u, d, e, formations] = await Promise.all([
          UpService.getAllUps(),
          DeptService.getAllDepts(),
          EnseignantService.getAllEnseignants(),
          FormationWorkflowService.getAllFormationWorkflows(),
        ]);
        setUps(u);
        setDepts(d);
        setEns(e);
        setExistingFormations(Array.isArray(formations) ? formations : []);
      } catch {
        message.error("Échec du chargement des données externes");
      }
    })();
  }, []);

  /* ---------- filtres animateurs / participants ---------- */
  const optionsAnim = ens.filter(
    (x) =>
      (!animFilterUp || x.upLibelle === animFilterUp.libelle) &&
      (!animFilterDept || x.deptLibelle === animFilterDept.libelle)
  );
  const optionsPart = ens.filter(
    (x) =>
      (!partFilterUp || x.upLibelle === partFilterUp.libelle) &&
      (!partFilterDept || x.deptLibelle === partFilterDept.libelle)
  );

  const toMinutes = (timeValue) => {
    if (!timeValue) return null;
    const parts = String(timeValue).split(":");
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return (h * 60) + m;
  };

  const sameTimeWindow = (a, b) => {
    if (!a?.dateSeance || !b?.dateSeance || a.dateSeance !== b.dateSeance) return false;
    const aStart = toMinutes(a.heureDebut);
    const aEnd = toMinutes(a.heureFin);
    const bStart = toMinutes(b.heureDebut);
    const bEnd = toMinutes(b.heureFin);
    if (aStart === null || aEnd === null || bStart === null || bEnd === null) return false;
    return aStart < bEnd && bStart < aEnd;
  };

  const intersects = (left, right) => left.some((id) => right.includes(id));
  const normalizedSalle = (value) => String(value || "").trim().toLowerCase();

  const buildConflictMessages = () => {
    const messages = [];
    const participantIds = partSel.map((p) => p.id).filter(Boolean);
    const localSeances = seances.map((s) => ({
      dateSeance: s.dateSeance,
      heureDebut: s.heureDebut,
      heureFin: s.heureFin,
      salle: s.salle,
      animateurIds: (Array.isArray(s.animateurs) ? s.animateurs : []).map((a) => a?.id).filter(Boolean),
    }));

    localSeances.forEach((s, idx) => {
      const start = toMinutes(s.heureDebut);
      const end = toMinutes(s.heureFin);
      if (start !== null && end !== null && start >= end) {
        messages.push(`Séance #${idx + 1}: heure de fin doit être après l&apos;heure de début.`);
      }
    });

    for (let i = 0; i <localSeances.length; i += 1) {
      for (let j = i + 1; j < localSeances.length; j += 1) {
        const left = localSeances[i];
        const right = localSeances[j];
        if (!sameTimeWindow(left, right)) continue;

        const leftSalle = normalizedSalle(left.salle);
        const rightSalle = normalizedSalle(right.salle);
        if (leftSalle && rightSalle && leftSalle === rightSalle) {
          messages.push(`Conflit interne: les séances #${i + 1} et #${j + 1} utilisent la même salle au même horaire.`);
        }
        if (participantIds.length > 0) {
          messages.push(`Conflit interne: les séances #${i + 1} et #${j + 1} se chevauchent pour les mêmes participants.`);
        }
        if (left.animateurIds.length > 0 && right.animateurIds.length > 0 && intersects(left.animateurIds, right.animateurIds)) {
          messages.push(`Conflit interne: les séances #${i + 1} et #${j + 1} se chevauchent pour un ou plusieurs animateurs.`);
        }
      }
    }

    existingFormations
      .filter((f) => (f.idFormation || f.id) !== formation.idFormation)
      .forEach((f) => {
        const existingSeances = Array.isArray(f.seances) ? f.seances : [];
        const existingParticipants = [
          ...(Array.isArray(f.participants) ? f.participants : []),
          ...existingSeances.flatMap((s) => Array.isArray(s.participants) ? s.participants : []),
        ].map((p) => p?.id).filter(Boolean);

        localSeances.forEach((localSeance, idx) => {
          existingSeances.forEach((existingSeance) => {
            if (!sameTimeWindow(localSeance, existingSeance)) return;

            const formationName = f.titreFormation || `#${f.idFormation || f.id || "?"}`;
            const localSalle = normalizedSalle(localSeance.salle);
            const existingSalle = normalizedSalle(existingSeance.salle);
            if (localSalle && existingSalle && localSalle === existingSalle) {
              messages.push(`Conflit salle: séance #${idx + 1} chevauche la formation ${formationName} dans la salle ${localSeance.salle}.`);
            }

            const existingAnimIds = (Array.isArray(existingSeance.animateurs) ? existingSeance.animateurs : []).map((a) => a?.id).filter(Boolean);
            if (participantIds.length > 0 && existingParticipants.length > 0 && intersects(participantIds, existingParticipants)) {
              messages.push(`Conflit participants: séance #${idx + 1} chevauche la formation ${formationName}.`);
            }
            if (localSeance.animateurIds.length > 0 && existingAnimIds.length > 0 && intersects(localSeance.animateurIds, existingAnimIds)) {
              messages.push(`Conflit animateurs: séance #${idx + 1} chevauche la formation ${formationName}.`);
            }
          });
        });
      });

    return [...new Set(messages)];
  };

  useEffect(() => {
    setOverlapWarnings(buildConflictMessages());
  }, [seances, partSel, existingFormations]);

  /* ---------- helpers séances ---------- */
  const addSeance = () =>
    setSeances((s) => [
      ...s,
      {
        id: Date.now(),
        dateSeance: dateDebut || moment().format("YYYY-MM-DD"),
        heureDebut: "08:00:00",
        heureFin: "10:00:00",
        salle: "",
        animateurs: [],
        typeSeance: "THEORIQUE",
        contenus: "",
        methodes: "",
        dureeTheorique: 0,
        dureePratique: 0,
        expanded: false,
      },
    ]);

  const updateSeance = (i, f, v) =>
    setSeances((s) => {
      const a = [...s];
      a[i] = { ...a[i], [f]: v };
      return a;
    });
  const removeSeance = (i) => setSeances((s) => s.filter((_, idx) => idx !== i));
  const toggleSeance = (i) =>
    setSeances((s) =>
      s.map((se, idx) => (idx === i ? { ...se, expanded: !se.expanded } : se))
    );

  /* ---------- import Excel participants ---------- */
  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length < 2)
        return setSnack({ open: true, severity: "warning", message: "Excel vide ou mal formaté" });
      const hdr = rows[0].map((h) => String(h).toLowerCase().trim());
      const idx = hdr.findIndex((h) => h === "email" || h === "mail");
      if (idx < 0)
        return setSnack({ open: true, severity: "warning", message: "Colonne Email introuvable" });
      const mails = rows.slice(1).map((r) => r[idx]).filter(Boolean);
      const matched = ens.filter((x) => mails.includes(x.mail));
      setPartSel(matched);
      setSnack({ open: true, severity: "success", message: `${matched.length} participants importés` });
    };
    reader.readAsBinaryString(f);
  };

  /* ---------- soumission ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (seances.length === 0) {
      message.warning("Veuillez ajouter au moins une séance.");
      return;
    }

    const blockingConflicts = buildConflictMessages();
    if (blockingConflicts.length > 0) {
      setOverlapWarnings(blockingConflicts);
      message.error("Conflits détectés: corrigez les dates/salles/personnes avant mise à jour.");
      return;
    }

    const payload = {
      titreFormation: titre,
      dateDebut,
      dateFin,
      typeFormation,
      etatFormation,
      ouverte,
      coutFormation: parseFloat(cout),
      externeFormateurNom: formNom,
      externeFormateurPrenom: formPrenom,
      externeFormateurEmail: formEmail,
      organismeRefExterne: organisme,
      chargeHoraireGlobal: parseInt(chargeH, 10),
      upId: selectedUp?.id,
      departementId: selectedDept?.id,
      participantsIds: partSel.map((p) => p.id),
      domaine,
      populationCible,
      objectifs,
      objectifsPedago,
      evalMethods,
      prerequis,
      acquis,
      indicateurs,
      coutTransport,
      coutHebergement,
      coutRepas,
      periodCode,
      customPeriodLabel,
      seances: seances.map((s) => ({
        idSeance: s.idSeance,
        dateSeance: s.dateSeance,
        heureDebut: s.heureDebut,
        heureFin: s.heureFin,
        salle: s.salle,
        animateursIds: s.animateurs.map((a) => a.id),
        typeSeance: s.typeSeance,
        contenus: s.contenus,
        methodes: s.methodes,
        dureeTheorique: s.dureeTheorique,
        dureePratique: s.dureePratique,
      })),
    };
    try {
      const res = await FormationWorkflowService.updateFormationWorkflow(
        formation.idFormation,
        payload
      );
      message.success("Formation mise à jour !");
      onFormationUpdated(res);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      message.error(msg);
    }
  };

  /* ======================= RENDER ======================= */
  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 900, margin: "0 auto" }}>
      <Title level={4}>Modifier Formation (Workflow)</Title>

      <Row gutter={[16, 16]}>
        {/* ----------- infos de base ----------- */}
        <Col span={24}>
          <Text type="secondary">Titre Formation</Text>
          <Input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
            disabled={isResponsableDossier}
          />
        </Col>
        <Col span={12}>
          <Text type="secondary">Date Début</Text>
          <Input
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            required
            disabled={isResponsableDossier}
          />
        </Col>
        <Col span={12}>
          <Text type="secondary">Date Fin</Text>
          <Input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            required
            disabled={isResponsableDossier}
          />
        </Col>
        <Col span={12}>
          <Text type="secondary">Type Formation</Text>
          <Select
            value={typeFormation}
            onChange={(val) => setTypeFormation(val)}
            disabled={isResponsableDossier}
            style={{ width: "100%" }}
            options={[
              { value: "INTERNE", label: "INTERNE" },
              { value: "EXTERNE", label: "EXTERNE" },
              { value: "EN_LIGNE", label: "EN_LIGNE" },
            ]}
          />
        </Col>
        <Col span={12}>
          <Text type="secondary">État Formation</Text>
          <Select
            value={etatFormation}
            onChange={(val) => setEtatFormation(val)}
            disabled={isResponsableDossier}
            style={{ width: "100%" }}
            options={[
              { value: "ENREGISTRE", label: "ENREGISTRE" },
              { value: "PLANIFIE", label: "PLANIFIE" },
              { value: "EN_COURS", label: "EN_COURS" },
              { value: "ACHEVE", label: "ACHEVE" },
              { value: "ANNULE", label: "ANNULE" },
              { value: "VISIBLE", label: "VISIBLE" },
            ]}
          />
        </Col>

        {/* ----------- formateur externe + coûts ----------- */}
        {typeFormation === "EXTERNE" && (
          <>
            <Col span={8}>
              <Text type="secondary">Nom Formateur Ext.</Text>
              <Input value={formNom} onChange={(e) => setFormNom(e.target.value)} />
            </Col>
            <Col span={8}>
              <Text type="secondary">Prénom Formateur Ext.</Text>
              <Input value={formPrenom} onChange={(e) => setFormPrenom(e.target.value)} />
            </Col>
            <Col span={8}>
              <Text type="secondary">Email Formateur Ext.</Text>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            </Col>
            <Col span={8}>
              <Text type="secondary">Coût Formation</Text>
              <InputNumber value={cout} onChange={(val) => setCout(val)} style={{ width: "100%" }} min={0} />
            </Col>
            <Col span={8}>
              <Text type="secondary">Organisme Externe</Text>
              <Input value={organisme} onChange={(e) => setOrganisme(e.target.value)} />
            </Col>
            <Col span={8}>
              <Text type="secondary">Coût Transport</Text>
              <InputNumber value={coutTransport} onChange={(val) => setCoutTransport(val)} style={{ width: "100%" }} min={0} />
            </Col>
            <Col span={8}>
              <Text type="secondary">Coût Hébergement</Text>
              <InputNumber value={coutHebergement} onChange={(val) => setCoutHebergement(val)} style={{ width: "100%" }} min={0} />
            </Col>
            <Col span={8}>
              <Text type="secondary">Coût Repas</Text>
              <InputNumber value={coutRepas} onChange={(val) => setCoutRepas(val)} style={{ width: "100%" }} min={0} />
            </Col>
          </>
        )}

        {/* ----------- ouverte ? ----------- */}
        <Col xs={24} sm={6}>
          <Text>Formation ouverte ?</Text>
          <Radio.Group
            value={ouverte ? "oui" : "non"}
            onChange={(e) => setOuverte(e.target.value === "oui")}
            disabled={isResponsableDossier}
          >
            <Radio value="oui">Oui</Radio>
            <Radio value="non">Non</Radio>
          </Radio.Group>
        </Col>

        {/* ----------- charge & rattachement ----------- */}
        <Col span={8}>
          <Text type="secondary">UP</Text>
          <Select
            showSearch
            placeholder="Sélectionner UP"
            value={selectedUp?.id}
            onChange={(val) => setSelectedUp(ups.find(u => u.id === val) || null)}
            disabled={isResponsableDossier}
            style={{ width: "100%" }}
            options={ups.map(u => ({ value: u.id, label: u.libelle }))}
            optionFilterProp="label"
          />
        </Col>
        <Col span={8}>
          <Text type="secondary">Département</Text>
          <Select
            showSearch
            placeholder="Sélectionner Département"
            value={selectedDept?.id}
            onChange={(val) => setSelectedDept(depts.find(d => d.id === val) || null)}
            disabled={isResponsableDossier}
            style={{ width: "100%" }}
            options={depts.map(d => ({ value: d.id, label: d.libelle }))}
            optionFilterProp="label"
          />
        </Col>

        <Col span={8}>
          <Text type="secondary">Charge Horaire</Text>
          <InputNumber
            value={chargeH}
            onChange={(val) => setChargeH(val)}
            disabled={isResponsableDossier}
            style={{ width: "100%" }}
            min={0}
          />
        </Col>

        <Col xs={24} sm={12}>
          <Text type="secondary">Période de Formation</Text>
          <Select
            value={periodCode}
            onChange={(val) => setPeriodCode(val)}
            disabled={isResponsableDossier}
            style={{ width: "100%" }}
            options={PERIOD_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
          />
        </Col>
        <Col xs={24} sm={12}>
          {periodCode === "OTHER" && (
            <>
              <Text type="secondary">Précisez la période</Text>
              <Input
                value={customPeriodLabel}
                onChange={(e) => setCustomPeriodLabel(e.target.value)}
                disabled={isResponsableDossier}
                placeholder="Ex : Mai - Juin 2024"
              />
            </>
          )}
        </Col>

        {/* ----------- bouton collapse plus d'infos ----------- */}
        <Col span={24}>
          <Button
            icon={showMore ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setShowMore((m) => !m)}
          >
            {showMore ? "Moins d'infos" : "Plus d'infos"}
          </Button>
          {showMore && (
            <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
              {[
                ["Domaine", domaine, setDomaine],
                ["Pop. Cible", populationCible, setPopulationCible],
                ["Objectifs", objectifs, setObjectifs],
                ["Obj. Pédago", objectifsPedago, setObjectifsPedago],
                ["Eval Methods", evalMethods, setEvalMethods],
                ["Prérequis", prerequis, setPrerequis],
                ["Acquis", acquis, setAcquis],
                ["Indicateurs", indicateurs, setIndicateurs],
              ].map(([lbl, val, setVal]) => (
                <Col xs={24} sm={12} key={lbl}>
                  <Text type="secondary">{lbl}</Text>
                  <Input value={val} onChange={(e) => setVal(e.target.value)} />
                </Col>
              ))}
            </Row>
          )}
        </Col>

        {/* ----------- séances complètes ----------- */}
        {seances.map((s, i) => (
          <Col span={24} key={s.idSeance || s.id}>
            <div
              style={{
                marginBottom: 16,
                padding: 16,
                border: "1px solid #ddd",
                borderRadius: 8,
                position: "relative",
              }}
            >
              <Popconfirm title="Supprimer cette séance ?" onConfirm={() => removeSeance(i)}>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  style={{ position: "absolute", top: 4, right: 4 }}
                />
              </Popconfirm>

              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <Text strong style={{ flexGrow: 1 }}>Séance #{i + 1}</Text>
                <Button type="text" size="small" icon={s.expanded ? <UpOutlined /> : <DownOutlined />} onClick={() => toggleSeance(i)} />
              </div>

              {/* ligne principale */}
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Text type="secondary">Date</Text>
                  <Input type="date" value={s.dateSeance} onChange={(e) => updateSeance(i, "dateSeance", e.target.value)} />
                </Col>
                <Col span={6}>
                  <Text type="secondary">Heure Début</Text>
                  <Input type="time" value={s.heureDebut} onChange={(e) => updateSeance(i, "heureDebut", e.target.value)} />
                </Col>
                <Col span={6}>
                  <Text type="secondary">Heure Fin</Text>
                  <Input type="time" value={s.heureFin} onChange={(e) => updateSeance(i, "heureFin", e.target.value)} />
                </Col>
                <Col span={6}>
                  <Text type="secondary">Salle</Text>
                  <Input value={s.salle} onChange={(e) => updateSeance(i, "salle", e.target.value)} />
                </Col>

                {/* animateurs séance */}
                <Col span={24} style={{ marginTop: 8 }}>
                  <Text type="secondary">Animateurs</Text>
                  <Select
                    mode="multiple"
                    disabled={typeFormation === "EXTERNE"}
                    options={optionsAnim.map(o => ({ value: o.id, label: getEnseignantLabel(o) }))}
                    value={s.animateurs.map(a => a.id)}
                    onChange={(ids) => updateSeance(i, "animateurs", optionsAnim.filter(o => ids.includes(o.id)))}
                    style={{ width: "100%" }}
                    optionFilterProp="label"
                    showSearch
                  />
                </Col>
              </Row>

              {/* champs avancés séance */}
              {s.expanded && (
                <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                  <Col span={6}>
                    <Text type="secondary">Type</Text>
                    <Select
                      value={s.typeSeance}
                      onChange={(val) => updateSeance(i, "typeSeance", val)}
                      style={{ width: "100%" }}
                      options={[
                        { value: "THEORIQUE", label: "THEORIQUE" },
                        { value: "PRATIQUE", label: "PRATIQUE" },
                      ]}
                    />
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">Durée théo (h)</Text>
                    <InputNumber value={s.dureeTheorique} onChange={(val) => updateSeance(i, "dureeTheorique", val)} style={{ width: "100%" }} min={0} />
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">Durée prat (h)</Text>
                    <InputNumber value={s.dureePratique} onChange={(val) => updateSeance(i, "dureePratique", val)} style={{ width: "100%" }} min={0} />
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">Contenus</Text>
                    <Input value={s.contenus} onChange={(e) => updateSeance(i, "contenus", e.target.value)} />
                  </Col>
                  <Col span={24}>
                    <Text type="secondary">Méthodes</Text>
                    <Input value={s.methodes} onChange={(e) => updateSeance(i, "methodes", e.target.value)} />
                  </Col>
                </Row>
              )}
            </div>
          </Col>
        ))}
        <Col span={24}>
          <Button type="dashed" danger onClick={addSeance}>
            + Ajouter Séance
          </Button>
        </Col>

        {overlapWarnings.length > 0 && (
          <Col span={24}>
            <Alert
              message="Chevauchements détectés"
              description={
                <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
                  {overlapWarnings.map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              }
              type="warning"
              showIcon
            />
          </Col>
        )}

        {/* ----------- import Excel participants ----------- */}
        <input
          accept=".xls,.xlsx"
          style={{ display: "none" }}
          id="upload-participants"
          type="file"
          onChange={handleFile}
        />
        <Col span={24}>
          <label htmlFor="upload-participants">
            <Button icon={<UploadOutlined />} danger type="primary">
              Importer Participants (Excel)
            </Button>
          </label>
        </Col>

        {/* ----------- participants filtrables ----------- */}
        <Col span={24} style={{ marginTop: 24 }}>
          <Title level={5}>Participants</Title>
          <Row gutter={[16, 16]} style={{ marginBottom: 8 }}>
            <Col span={12}>
              <Text type="secondary">Filtrer UP</Text>
              <Select
                showSearch allowClear placeholder="Toutes"
                value={partFilterUp?.id}
                onChange={(val) => setPartFilterUp(ups.find(u => u.id === val) || null)}
                style={{ width: "100%" }}
                options={ups.map(u => ({ value: u.id, label: u.libelle }))}
                optionFilterProp="label"
              />
            </Col>
            <Col span={12}>
              <Text type="secondary">Filtrer Département</Text>
              <Select
                showSearch allowClear placeholder="Tous"
                value={partFilterDept?.id}
                onChange={(val) => setPartFilterDept(depts.find(d => d.id === val) || null)}
                style={{ width: "100%" }}
                options={depts.map(d => ({ value: d.id, label: d.libelle }))}
                optionFilterProp="label"
              />
            </Col>
          </Row>
          <Text type="secondary">Sélectionner Participants</Text>
          <Select
            mode="multiple"
            options={optionsPart.map(o => ({ value: o.id, label: getEnseignantLabel(o) }))}
            value={partSel.map(p => p.id)}
            onChange={(ids) => setPartSel(optionsPart.filter(o => ids.includes(o.id)))}
            style={{ width: "100%" }}
            optionFilterProp="label"
            showSearch
          />
        </Col>

        {/* ----------- Dossier Section (Specific for ResponsableDossier) ----------- */}
        <Col span={24} style={{ marginTop: 16 }}>
          <Divider>Gestion du Dossier</Divider>
          <Space style={{ display: "flex", justifyContent: "center" }}>
            <Button 
               
              icon={<UploadOutlined />}
              onClick={() => setOpenUploadPanel(true)}
            >
              Scanner / Ajouter Document
            </Button>
            <Button 
              
              onClick={() => setOpenDocModal(true)}
            >
              Consulter Dossier (CRUD)
            </Button>
          </Space>
        </Col>

        {/* ----------- submit ----------- */}
        {!isResponsableDossier && (
          <Col span={24} style={{ textAlign: "right", marginTop: 32 }}>
            <Button type="primary" danger htmlType="submit">
              ✔️ Mettre à jour
            </Button>
          </Col>
        )}
      </Row>

      {/* Modals for Documents */}
      <Modal
        open={openUploadPanel}
        onCancel={() => setOpenUploadPanel(false)}
        title="Ajouter au dossier"
        width={600}
        footer={null}
      >
        <DocumentUploadPanel 
            formationId={formation.idFormation} 
            onDocumentAdded={() => {
              message.success("Document ajouté !");
              setOpenUploadPanel(false);
            }}
            onClose={() => setOpenUploadPanel(false)}
          />
      </Modal>

      <DocumentListModal
        open={openDocModal}
        formation={formation}
        onClose={() => setOpenDocModal(false)}
        onDocumentsUpdated={() => {
          message.info("Dossier mis à jour");
        }}
      />


    </form>
  );
}

