import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import type {
  CompetenceDemandee,
  BesoinParDept,
  BesoinPriorise,
  TauxReussiteDomaine,
} from '@/hooks/dashboard/useCupDashboard';

dayjs.locale('fr');

interface DashboardPdfData {
  kpis: {
    totalFormations: number;
    achevees: number;
    enCours: number;
    tauxReussiteGlobal: number;
    tauxParticipation: number;
    totalHeures: number;
    participants: number;
    pendingBesoins: number;
    critiques: number;
    totalBesoins: number;
    departements: number;
    couverture: number | null;
  };
  topCompetences: CompetenceDemandee[];
  besoinsParDept: BesoinParDept[];
  besoinsPriorises: BesoinPriorise[];
  tauxReussite: TauxReussiteDomaine[];
}

const BRAND_RED = [181, 18, 0] as const;
const ACCENT_BLUE = [99, 102, 241] as const;
const TEXT_DARK = [15, 23, 42] as const;
const TEXT_MUTED = [100, 116, 139] as const;

export function generateDashboardPdf(data: DashboardPdfData): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  function addPage() {
    doc.addPage();
    y = margin;
  }

  function ensureSpace(needed: number) {
    if (y + needed > 280) addPage();
  }

  // ── Header ──────────────────────────────────────────────
  doc.setFillColor(...BRAND_RED);
  doc.rect(0, 0, pageW, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Tableau de Bord CUP — D2F', margin, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Rapport généré le ${dayjs().format('dddd D MMMM YYYY [à] HH:mm')}`, margin, 28);

  doc.setFontSize(9);
  doc.text('Plateforme ESPRIT — Développement Des Formations', margin, 35);

  y = 52;

  // ── KPIs Summary ────────────────────────────────────────
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Indicateurs Clés', margin, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Formations totales', `${data.kpis.totalFormations}`],
      ['Formations achevées', `${data.kpis.achevees}`],
      ['En cours', `${data.kpis.enCours}`],
      ['Taux de réussite global', `${data.kpis.tauxReussiteGlobal}%`],
      ['Taux de participation moyen', `${data.kpis.tauxParticipation}%`],
      ['Heures de formation', `${data.kpis.totalHeures.toLocaleString('fr-FR')}`],
      ['Participants uniques', `${data.kpis.participants.toLocaleString('fr-FR')}`],
      ['Besoins en attente', `${data.kpis.pendingBesoins}`],
      ['Besoins critiques', `${data.kpis.critiques}`],
      ['Départements actifs', `${data.kpis.departements}`],
      ['Couverture compétences', `${data.kpis.couverture ?? 'N/A'}%`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [...BRAND_RED], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [...TEXT_DARK] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: contentW * 0.6 },
      1: { cellWidth: contentW * 0.4, halign: 'right', fontStyle: 'bold' },
    },
  });

  y = ((doc as any).lastAutoTable?.finalY ?? y + 48) + 12;

  // ── Top Compétences ─────────────────────────────────────
  ensureSpace(50);
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Compétences les Plus Demandées', margin, y);
  y += 8;

  if (data.topCompetences.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Compétence', 'Demandes']],
      body: data.topCompetences.map((c, i) => [`${i + 1}`, c.name, `${c.count}`]),
      theme: 'striped',
      headStyles: { fillColor: [...ACCENT_BLUE], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [...TEXT_DARK] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: contentW - 40 },
        2: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      },
    });
    y = ((doc as any).lastAutoTable?.finalY ?? y + 28) + 12;
  }

  // ── Besoins par Département ─────────────────────────────
  ensureSpace(50);
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Consultation des Besoins par Département', margin, y);
  y += 8;

  if (data.besoinsParDept.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Département', 'Total', 'Approuvés', 'En attente', 'Critiques', 'Hautes']],
      body: data.besoinsParDept.map((d) => [
        d.departement,
        `${d.total}`,
        `${d.approuves}`,
        `${d.enAttente}`,
        `${d.critiques}`,
        `${d.hautes}`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [...BRAND_RED], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [...TEXT_DARK] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = ((doc as any).lastAutoTable?.finalY ?? y + 28) + 12;
  }

  // ── Priorisation des Besoins ────────────────────────────
  ensureSpace(50);
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Priorisation des Besoins (Urgence × Impact)', margin, y);
  y += 8;

  const urgentNeeds = data.besoinsPriorises
    .filter((b) => b.urgency >= 4 || b.impact >= 4)
    .slice(0, 15);

  if (urgentNeeds.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Besoin', 'Priorité', 'Urgence', 'Impact', 'Département']],
      body: urgentNeeds.map((b) => [
        b.label,
        b.priorite,
        `${b.urgency}/5`,
        `${b.impact}/5`,
        b.departement ?? '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [...TEXT_DARK] },
      alternateRowStyles: { fillColor: [254, 242, 242] },
    });
    y = ((doc as any).lastAutoTable?.finalY ?? y + 28) + 12;
  }

  // ── Taux de Réussite par Domaine ────────────────────────
  ensureSpace(50);
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Taux de Réussite par Département', margin, y);
  y += 8;

  if (data.tauxReussite.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Département', 'Réussite', 'En cours', 'Échec']],
      body: data.tauxReussite.map((d) => [
        d.domaine,
        `${d.reussite}%`,
        `${d.enCours}%`,
        `${d.echec}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [...TEXT_DARK] },
      alternateRowStyles: { fillColor: [236, 253, 245] },
      columnStyles: {
        1: { fontStyle: 'bold', textColor: [16, 185, 129] },
      },
    });
  }

  // ── Footer ──────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`D2F — Plateforme ESPRIT · Page ${i}/${totalPages}`, pageW / 2, 290, {
      align: 'center',
    });
  }

  doc.save(`tableau-de-bord-cup-${dayjs().format('YYYY-MM-DD')}.pdf`);
}
