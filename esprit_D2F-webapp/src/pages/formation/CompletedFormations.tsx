import React, { useState } from "react";
import { SafetyCertificateOutlined } from "@ant-design/icons";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { AppPageHeader } from "@/components/common";
import "@/styles/pages/completed-formations.css";
import { useFormationsAchevees, useGenerateFormationCertificates, useFormationReportFetch } from "@/hooks/formation";
import { useEnseignants } from "@/hooks/enseignant";
import { useGenerateCertificates } from "@/hooks/certificat";
import type { Dayjs } from "dayjs";
import type { Id } from "@/models/common";
import { CompletedFormationsTable } from "./components/CompletedFormationsTable";
import { CertificateGenerator } from "./components/CertificateGenerator";

export interface FormationRecord {
  idFormation?: Id;
  titreFormation?: string;
  etatFormation?: string;
  dateDebut?: string;
  dateFin?: string;
  certifGenerated?: boolean;
  chargeHoraireGlobal?: string | number;
  populationCible?: string;
  objectifs?: string;
  up1?: { libelle?: string };
  departement1?: { libelle?: string };
}

export interface EnseignantRef {
  id?: Id;
  nom?: string;
  prenom?: string;
  mail?: string;
  departement1?: { libelle?: string };
  dept?: { libelle?: string };
}

interface ReportFormateur { nom?: string; prenom?: string; }
interface ReportItem {
  titreFormation?: string;
  formateurs?: ReportFormateur[];
  dateDebut?: string;
  chargeHoraireGlobal?: string | number;
  populationCible?: string;
  objectifs?: string;
}

export default function CompletedFormations() {
  const { message } = useAppNotification();
  const { data: rawFormations = [], isLoading: loadingTable } = useFormationsAchevees();
  const formations = rawFormations as FormationRecord[];
  const { data: rawEnseignants = [], isLoading: loadingEns } = useEnseignants();
  const enseignants = rawEnseignants as EnseignantRef[];
  const generateCertMut = useGenerateCertificates();
  const genBatchMut = useGenerateFormationCertificates();
  const reportFetchMut = useFormationReportFetch();
  const [loadingButtons, setLoadingButtons] = useState<Record<string, boolean>>({});
  const [typeCertif, setTypeCertif] = useState("CERTIF");
  const navigate = useNavigate();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedEns, setSelectedEns] = useState<EnseignantRef | null>(null);
  const [attType, setAttType] = useState("PARTICIPATION");
  const [period, setPeriod] = useState<Dayjs[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [newCertDrawerVisible, setNewCertDrawerVisible] = useState(false);
  const [newCertFormationId, setNewCertFormationId] = useState<Id | null>(null);
  const [newCertEnseignants, setNewCertEnseignants] = useState<EnseignantRef[]>([]);
  const [loadingNewCertEns, setLoadingNewCertEns] = useState(false);
  const [selectedNewCertEns, setSelectedNewCertEns] = useState<EnseignantRef | null>(null);

  const handleGenerateCertificate = async (record: FormationRecord) => {
    const id = String(record.idFormation ?? "");
    setLoadingButtons((prev) => ({ ...prev, [id]: true }));
    try {
      await genBatchMut.mutateAsync({ formationId: record.idFormation!, typeCertif });
      message.success("Certificats générés !");
      navigate(`/home/certificate/${id}`);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: string } };
      const resp = err.response;
      if (resp?.status === 409 && typeof resp.data === "string" && resp.data.includes("déjà été générés")) {
        message.info(resp.data);
        navigate(`/home/certificate/${id}`);
      } else {
        message.error("Échec de la génération des certificats.");
      }
    } finally {
      setLoadingButtons((prev) => ({ ...prev, [id]: false }));
    }
  };

  const openDrawer = () => {
    setPdfUrl(null);
    setSelectedEns(null);
    setPeriod([]);
    setDrawerVisible(true);
  };

  const generateTableOnly = async () => {
    if (!selectedEns || period.length !== 2) {
      return message.warning("Sélectionnez un formateur et une période.");
    }
    const role = attType === "ANIMATION" ? "animateur" : "participant";
    const ensId = selectedEns.id;
    const [start, end] = period.map((d) => d.format("YYYY-MM-DD"));
    try {
      const rawItems = await reportFetchMut.mutateAsync({ role, enseignantId: ensId!, start, end });
      const items = rawItems as ReportItem[];
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      doc.setFont("times", "normal").setFontSize(12);
      const headers = attType === "ANIMATION"
        ? ["Formation", "Formateur(s)", "Date", "Nb.h", "Public cible", "Objectifs"]
        : ["Formation", "Formateur", "Date"];
      const body = items.map((f) => {
        const noms = Array.isArray(f.formateurs)
          ? f.formateurs.map((fr) => `${fr.nom ?? ""} ${fr.prenom ?? ""}`).join(", ")
          : "";
        return attType === "ANIMATION"
          ? [f.titreFormation ?? "", noms, f.dateDebut ?? "", `${f.chargeHoraireGlobal ?? ""} h`, f.populationCible ?? "", f.objectifs ?? ""]
          : [f.titreFormation ?? "", noms, f.dateDebut ?? ""];
      });
      autoTable(doc, {
        startY: 40,
        margin: { left: 40, right: 40 },
        head: [headers],
        body,
        theme: "grid",
        styles: { font: "times", fontSize: 12, overflow: "linebreak", cellWidth: "wrap" },
        columnStyles: attType === "ANIMATION"
          ? { 0: { cellWidth: 100 }, 1: { cellWidth: 100 }, 2: { cellWidth: 60 }, 3: { cellWidth: 50 }, 4: { cellWidth: 80 }, 5: { cellWidth: 140 } }
          : { 0: { cellWidth: 200 }, 1: { cellWidth: 200 }, 2: { cellWidth: 100 } },
        headStyles: { fillColor: [230, 230, 230], textColor: 20, halign: "center" },
        bodyStyles: { valign: "top" },
      });
      setPdfUrl(doc.output("bloburl") as unknown as string);
    } catch {
      message.error("Échec de la génération du tableau PDF.");
      setDrawerVisible(false);
    }
  };

  const openNewCertDrawer = (formationId: Id) => {
    setNewCertFormationId(formationId);
    setSelectedNewCertEns(null);
    setNewCertEnseignants(enseignants);
    setNewCertDrawerVisible(true);
  };

  const handleCreateCertificate = async () => {
    if (!selectedNewCertEns) return;
    try {
      const formation = formations.find((f) => f.idFormation === newCertFormationId);
      if (!formation) return;
      const ens = selectedNewCertEns;
      await generateCertMut.mutateAsync(formation.idFormation!);
      message.success("Certificat créé !");
      setNewCertDrawerVisible(false);
    } catch {
      message.error("Échec de la création du certificat.");
    }
  };

  const certifCount = formations.filter((f) => f.certifGenerated).length;
  const pendingCount = formations.length - certifCount;

  return (
    <div className="completed-page">
      <AppPageHeader
        icon={<SafetyCertificateOutlined />}
        title="Formations Achevées"
        subtitle={`${formations.length} formation${formations.length !== 1 ? "s" : ""} terminée${formations.length !== 1 ? "s" : ""} — Générez certificats et attestations`}
      />
      <CompletedFormationsTable
        formations={formations}
        loadingTable={loadingTable}
        typeCertif={typeCertif}
        onTypeCertifChange={setTypeCertif}
        loadingButtons={loadingButtons}
        onGenerateCertificate={handleGenerateCertificate}
        onOpenPdfDrawer={openDrawer}
        onViewCertificate={(id) => navigate(`/home/certificate/${id}`)}
        onOpenNewCertDrawer={openNewCertDrawer}
        certifCount={certifCount}
        pendingCount={pendingCount}
      />
      <CertificateGenerator
        drawerVisible={drawerVisible}
        onCloseDrawer={() => { setDrawerVisible(false); setPdfUrl(null); }}
        pdfUrl={pdfUrl}
        enseignants={enseignants}
        loadingEns={loadingEns}
        selectedEns={selectedEns}
        onSelectEns={setSelectedEns}
        attType={attType}
        onAttTypeChange={setAttType}
        period={period}
        onPeriodChange={setPeriod}
        onGeneratePdf={generateTableOnly}
        newCertDrawerVisible={newCertDrawerVisible}
        onCloseNewCertDrawer={() => setNewCertDrawerVisible(false)}
        newCertEnseignants={newCertEnseignants}
        loadingNewCertEns={loadingNewCertEns}
        selectedNewCertEns={selectedNewCertEns}
        onSelectNewCertEns={setSelectedNewCertEns}
        onCreateCertificate={handleCreateCertificate}
      />
    </div>
  );
}
