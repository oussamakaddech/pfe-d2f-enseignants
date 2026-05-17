import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Skeleton, Row, Col } from "antd";

import AuthProvider from "../context/AuthProvider";
import { NavigationSetter } from "./NavigationSetter";
import PrivateRoute from "../components/PrivateRoute";
import RoleGuard from "../components/RoleGuard";
import AppLayout from "../components/AppLayout";

const KPIChart = lazy(() => import("../pages/kpiFormation/KPIChart"));
const CalendrierPage = lazy(() => import("../pages/CalendrierPage"));
const FormationPage = lazy(() => import("../pages/formation/FormationPage"));
const FormationCreationPage = lazy(() => import("../pages/formation/FormationCreationPage"));
const FormationConsultationPage = lazy(() => import("../pages/formation/FormationConsultationPage"));
const ListAccounts = lazy(() => import("../pages/gererComptes/ListAccounts"));
const Calendrier = lazy(() => import("../pages/Calendrier"));
const TeachersDataGrid = lazy(() => import("../pages/enseignant/TeachersDataGrid"));
const CalendarEnseignant = lazy(() => import("../pages/enseignant/CalendarEnseignant"));
const CompletedFormations = lazy(() => import("../pages/CompletedFormations"));
const CertificatePage = lazy(() => import("../pages/CertificatePage"));
const Tests = lazy(() => import("../pages/Tests"));
const FormationList = lazy(() => import("../pages/presence/FormationList"));
const FormationDetail = lazy(() => import("../pages/presence/FormationDetail"));
const NotFound = lazy(() => import("../pages/erreur/NotFound"));
const FormationCards = lazy(() => import("../pages/inscription/FormationCards"));
const FicheFormation = lazy(() => import("../pages/inscription/FicheFormation"));
const DemandesList = lazy(() => import("../pages/inscription/DemandesList"));
const BesoinForm = lazy(() => import("../pages/besoin/BesoinForm"));
const BesoinList = lazy(() => import("../pages/besoin/BesoinList"));
const CertificatesByEmailPage = lazy(() => import("../pages/CertificatesByEmailPage"));
const UpDeptDataGrid = lazy(() => import("../pages/enseignant/UpDeptDataGrid"));
const Register = lazy(() => import("../pages/auth/Register"));
const Home = lazy(() => import("../pages/erreur/Home"));
const Login = lazy(() => import("../pages/gererComptes/Login"));
const PasswordRecovery = lazy(() => import("../pages/gererComptes/PasswordRecovery"));
const Profile = lazy(() => import("../pages/auth/Profile"));
const EditProfile = lazy(() => import("../pages/auth/EditProfile"));
const UpdatePassword = lazy(() => import("../pages/gererComptes/UpdatePassword"));
const CombinedFormationOneDriveTree = lazy(() => import("../pages/documentFormation/CombinedFormationOneDriveTree"));
const CompetencePage = lazy(() => import("../pages/competence/CompetencePage"));
const EnseignantCompetencePage = lazy(() => import("../pages/competence/EnseignantCompetencePage"));
const AffectationEnseignantPage = lazy(() => import("../pages/competence/AffectationEnseignantPage"));
const RicePage = lazy(() => import("../pages/competence/RicePage"));
const CompetenceMatchingPage = lazy(() => import("../pages/competence/CompetenceMatchingPage"));
const EvaluationGlobalePage = lazy(() => import("../pages/evaluation/EvaluationGlobalePage"));
const AnalysePredictivePage = lazy(() => import("../pages/analyse/AnalysePredictivePage"));
const AnalyticsDashboardPage = lazy(() => import("../pages/analytics/AnalyticsDashboardPage"));
const TeacherAnalyticsPage = lazy(() => import("../pages/analytics/TeacherAnalyticsPage"));
const AlertsPage = lazy(() => import("../pages/analytics/AlertsPage"));
const SkillPassportPage = lazy(() => import("../pages/profile/SkillPassportPage"));

function PageSkeleton() {
  return (
    <div style={{ padding: 24, background: "#f7fafc", minHeight: "calc(100vh - 128px)" }}>
      <Skeleton.Input active style={{ width: 260, height: 28, marginBottom: 28, display: "block" }} />
      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} md={6} key={i}>
            <Skeleton.Node
              active
              style={{ width: "100%", height: 110, borderRadius: 14, display: "block" }}
            />
          </Col>
        ))}
      </Row>
      <Skeleton active paragraph={{ rows: 8 }} />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <AuthProvider>
      <Router>
        <NavigationSetter />
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth" element={<Navigate to="/login" replace />} />
            <Route path="/auth/login" element={<Navigate to="/login" replace />} />
            <Route path="/register" element={<Register />} />
            <Route path="/password-recovery" element={<PasswordRecovery />} />
            <Route path="/profile" element={<Navigate to="/home/profile" replace />} />

            <Route element={<PrivateRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/home" element={<Home />} />
                <Route path="/home/profile" element={<Profile />} />
                <Route path="/home/skill-passport" element={<SkillPassportPage />} />
                <Route path="/home/skill-passport/:username" element={<SkillPassportPage />} />
                <Route path="/home/edit-profile" element={<EditProfile />} />
                <Route path="/home/update-password" element={<UpdatePassword />} />
                <Route path="/home/ListeFormation" element={<FormationCards />} />
                <Route path="/home/ListeFormation/:id" element={<FicheFormation />} />
                <Route path="/home/MyCertificate" element={<CertificatesByEmailPage />} />

                {/* ── Admin only ──────────────────────────────── */}
                <Route element={<RoleGuard allowedRoles={["admin"]} />}>
                  <Route path="/home/accounts" element={<ListAccounts />} />
                  <Route path="/home/rice" element={<RicePage />} />
                  <Route path="/home/test" element={<Tests />} />
                  <Route path="/home/Formation" element={<FormationPage />} />
                  <Route path="/home/Formation/Creer" element={<FormationCreationPage />} />
                  <Route path="/home/Enseignants" element={<TeachersDataGrid />} />
                  <Route path="/home/enseignants" element={<TeachersDataGrid />} />
                  <Route path="/home/enseignant" element={<TeachersDataGrid />} />
                  <Route path="/home/UpDept" element={<UpDeptDataGrid />} />
                  <Route path="/home/certificate" element={<CompletedFormations />} />
                  <Route path="/home/certificate/:formationId" element={<CertificatePage />} />
                </Route>

                {/* ── Dashboard / KPI / Analyse ──────────────── */}
                <Route element={<RoleGuard allowedRoles={["admin", "CUP", "CHEF_DEPARTEMENT"]} />}>
                  <Route path="/home/KPI" element={<KPIChart />} />
                  <Route path="/home/AnalysePredictive" element={<AnalysePredictivePage />} />
                  <Route path="/home/analytics/dashboard" element={<AnalyticsDashboardPage />} />
                  <Route path="/home/analytics/teacher" element={<TeacherAnalyticsPage />} />
                  <Route path="/home/analytics/teacher/:enseignantId" element={<TeacherAnalyticsPage />} />
                  <Route path="/home/analytics/alerts" element={<AlertsPage />} />
                </Route>

                {/* ── Calendrier ─────────────────────────────── */}
                <Route element={<RoleGuard allowedRoles={["admin", "CHEF_DEPARTEMENT"]} />}>
                  <Route path="/home/Calendrier" element={<CalendrierPage />} />
                  <Route path="/home/calendar" element={<Calendrier />} />
                  <Route path="/home/calendar/:enseignantId" element={<CalendarEnseignant />} />
                </Route>

                {/* ── Gestion Documentaire ───────────────────── */}
                <Route element={<RoleGuard allowedRoles={["admin", "ResponsableDossier", "CHEF_DEPARTEMENT"]} />}>
                  <Route path="/home/Formation/Consulter" element={<FormationConsultationPage />} />
                  <Route path="/home/File" element={<CombinedFormationOneDriveTree />} />
                </Route>

                {/* ── Évaluations ────────────────────────────── */}
                <Route element={<RoleGuard allowedRoles={["admin", "CUP", "CHEF_DEPARTEMENT"]} />}>
                  <Route path="/home/Evaluations" element={<EvaluationGlobalePage />} />
                </Route>

                {/* ── Compétences ────────────────────────────── */}
                <Route element={<RoleGuard allowedRoles={["admin", "CUP", "Enseignant", "CHEF_DEPARTEMENT"]} />}>
                  <Route path="/home/competences" element={<CompetencePage />} />
                  <Route path="/home/competence" element={<CompetencePage />} />
                  <Route path="/home/competences/enseignant/:enseignantId" element={<EnseignantCompetencePage />} />
                  <Route path="/home/competence/enseignant/:enseignantId" element={<EnseignantCompetencePage />} />
                </Route>

                {/* ── Affectations & Matchmaking ─────────────── */}
                <Route element={<RoleGuard allowedRoles={["admin", "CUP"]} />}>
                  <Route path="/home/affectations" element={<AffectationEnseignantPage />} />
                  <Route path="/home/rice/matchmaking" element={<CompetenceMatchingPage />} />
                  <Route path="/home/rice/competence-matching" element={<CompetenceMatchingPage />} />
                </Route>

                {/* ── Besoins en Formation ───────────────────── */}
                <Route element={<RoleGuard allowedRoles={["admin", "CUP", "Enseignant", "CHEF_DEPARTEMENT"]} />}>
                  <Route path="/home/besoins" element={<BesoinList />} />
                  <Route path="/home/besoins/ajouter" element={<BesoinForm />} />
                </Route>

                {/* ── Demandes d'inscription ─────────────────── */}
                <Route element={<RoleGuard allowedRoles={["admin", "CUP"]} />}>
                  <Route path="/home/ListeFormation/:id/demandes" element={<DemandesList />} />
                </Route>

                {/* ── Présence & Évaluation (Formateur) ──────── */}
                <Route element={<RoleGuard allowedRoles={["Formateur", "Enseignant", "admin"]} />}>
                  <Route path="/home/animateur-formations" element={<FormationList />} />
                  <Route path="/home/animateur-formations/:id" element={<FormationDetail />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
