import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";

import AuthProvider from "../context/AuthProvider";
import { setNavigate } from "../utils/navigation";
import PrivateRoute from "../components/PrivateRoute";
import RoleGuard from "../components/RoleGuard";
import AppLayout from "../components/AppLayout";

import KPIChart from "../pages/kpiFormation/KPIChart";
import CalendrierPage from "../pages/CalendrierPage";
import FormationTable from "../pages/FormationTable";
import FormationPage from "../pages/formation/FormationPage";
import FormationCreationPage from "../pages/formation/FormationCreationPage";
import FormationConsultationPage from "../pages/formation/FormationConsultationPage";
import ListAccounts from "../pages/gererComptes/ListAccounts";
import Calendrier from "../pages/Calendrier";
import TeachersDataGrid from "../pages/enseignant/TeachersDataGrid";
import CalendarEnseignant from "../pages/enseignant/CalendarEnseignant";
import CompletedFormations from "../pages/CompletedFormations";
import CertificatePage from "../pages/CertificatePage";
import Tests from "../pages/Tests";
import FormationList from "../pages/presence/FormationList";
import FormationDetail from "../pages/presence/FormationDetail";

import NotFound from "../pages/erreur/NotFound";
import FormationCards from "../pages/inscription/FormationCards";
import FicheFormation from "../pages/inscription/FicheFormation";
import DemandesList from "../pages/inscription/DemandesList";
import BesoinForm from "../pages/besoin/BesoinForm";
import BesoinList from "../pages/besoin/BesoinList";
import CertificatesByEmailPage from "../pages/CertificatesByEmailPage";
import UpDeptDataGrid from "../pages/enseignant/UpDeptDataGrid";

import Register from "../pages/auth/Register";
import Home from "../pages/erreur/Home";
import Login from "../pages/gererComptes/Login";
import Profile from "../pages/auth/Profile";
import EditProfile from "../pages/auth/EditProfile";
import UpdatePassword from "../pages/gererComptes/UpdatePassword";
import CombinedFormationOneDriveTree from "../pages/documentFormation/CombinedFormationOneDriveTree";
import CompetencePage from "../pages/competence/CompetencePage";
import EnseignantCompetencePage from "../pages/competence/EnseignantCompetencePage";
import AffectationEnseignantPage from "../pages/competence/AffectationEnseignantPage";
import RicePage from "../pages/competence/RicePage";
import CompetenceMatchingPage from "../pages/competence/CompetenceMatchingPage";
import MatchmakingPage from "../pages/competence/rice/MatchmakingPage";
import EvaluationGlobalePage from "../pages/evaluation/EvaluationGlobalePage";
import AnalysePredictivePage from "../pages/analyse/AnalysePredictivePage";

export default function AppRoutes() {
  return (
    <AuthProvider>
      <Router>
        {/* Ensure non-component code can perform SPA navigation */}
        <NavigationSetter />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />
          <Route path="/auth/login" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Navigate to="/home/profile" replace />} />

          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              {/* ════════════════════════════════════════════════════════════
                  Routes communes — tous les rôles authentifiés
                  ════════════════════════════════════════════════════════════ */}
              <Route path="/home" element={<Home />} />
              <Route path="/home/profile" element={<Profile />} />
              <Route path="/home/edit-profile" element={<EditProfile />} />
              <Route path="/home/update-password" element={<UpdatePassword />} />
              <Route path="/home/ListeFormation" element={<FormationCards />} />
              <Route path="/home/ListeFormation/:id" element={<FicheFormation />} />
              <Route path="/home/MyCertificate" element={<CertificatesByEmailPage />} />

              {/* ════════════════════════════════════════════════════════════
                  Admin uniquement — gestion des comptes, RICE, test
                  ════════════════════════════════════════════════════════════ */}
              <Route element={<RoleGuard allowedRoles={["admin"]} />}>
                <Route path="/home/accounts" element={<ListAccounts />} />
                <Route path="/home/rice" element={<RicePage />} />
                <Route path="/home/test" element={<Tests />} />
              </Route>

              {/* ════════════════════════════════════════════════════════════
                  Admin + D2F — KPI complet, Analyse prédictive,
                  gestion formations (créer), Documents
                  ════════════════════════════════════════════════════════════ */}
              <Route element={<RoleGuard allowedRoles={["admin"]} />}>
                <Route path="/home/KPI" element={<KPIChart />} />
                <Route path="/home/AnalysePredictive" element={<AnalysePredictivePage />} />
                <Route path="/home/Formation" element={<FormationPage />} />
                <Route path="/home/Formation/Creer" element={<FormationCreationPage />} />
                <Route path="/home/Formation/Consulter" element={<FormationConsultationPage />} />
                <Route path="/home/File" element={<CombinedFormationOneDriveTree />} />
                <Route path="/home/Calendrier" element={<CalendrierPage />} />
                <Route path="/home/calendar" element={<Calendrier />} />
                <Route path="/home/calendar/:enseignantId" element={<CalendarEnseignant />} />
                <Route path="/home/Enseignants" element={<TeachersDataGrid />} />
                <Route path="/home/enseignants" element={<TeachersDataGrid />} />
                <Route path="/home/enseignant" element={<TeachersDataGrid />} />
                <Route path="/home/UpDept" element={<UpDeptDataGrid />} />
                <Route path="/home/certificate" element={<CompletedFormations />} />
                <Route path="/home/certificate/:formationId" element={<CertificatePage />} />
              </Route>

              {/* ════════════════════════════════════════════════════════════
                  Admin + CUP — évaluations globales
                  ════════════════════════════════════════════════════════════ */}
              <Route element={<RoleGuard allowedRoles={["admin", "CUP"]} />}>
                <Route path="/home/Evaluations" element={<EvaluationGlobalePage />} />
              </Route>

              {/* ════════════════════════════════════════════════════════════
                  Compétences — Admin, CUP, Enseignant
                  ════════════════════════════════════════════════════════════ */}
              <Route element={<RoleGuard allowedRoles={["admin", "CUP", "Enseignant"]} />}>
                <Route path="/home/competences" element={<CompetencePage />} />
                <Route path="/home/competence" element={<CompetencePage />} />
                <Route
                  path="/home/competences/enseignant/:enseignantId"
                  element={<EnseignantCompetencePage />}
                />
                <Route
                  path="/home/competence/enseignant/:enseignantId"
                  element={<EnseignantCompetencePage />}
                />
              </Route>

              {/* ════════════════════════════════════════════════════════════
                  Affectations & Matchmaking — Admin, CUP
                  ════════════════════════════════════════════════════════════ */}
              <Route element={<RoleGuard allowedRoles={["admin", "CUP"]} />}>
                <Route path="/home/affectations" element={<AffectationEnseignantPage />} />
                <Route path="/home/rice/matchmaking" element={<CompetenceMatchingPage />} />
                <Route path="/home/rice/competence-matching" element={<CompetenceMatchingPage />} />
              </Route>

              {/* ════════════════════════════════════════════════════════════
                  Besoin Formation — lecture : tous, approbation : Admin+CUP
                  ════════════════════════════════════════════════════════════ */}
              <Route element={<RoleGuard allowedRoles={["admin", "CUP", "Enseignant"]} />}>
                <Route path="/home/besoins" element={<BesoinList />} />
                <Route path="/home/besoins/ajouter" element={<BesoinForm />} />
              </Route>

              <Route element={<RoleGuard allowedRoles={["admin", "CUP"]} />}>
                <Route
                  path="/home/ListeFormation/:id/demandes"
                  element={<DemandesList />}
                />
              </Route>

              {/* ════════════════════════════════════════════════════════════
                  Présence & Évaluation Formateur — Formateur, D2F, Enseignant
                  ════════════════════════════════════════════════════════════ */}
              <Route element={<RoleGuard allowedRoles={["Formateur", "Enseignant", "admin"]} />}>
                <Route
                  path="/home/animateur-formations"
                  element={<FormationList />}
                />
                <Route
                  path="/home/animateur-formations/:id"
                  element={<FormationDetail />}
                />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

function NavigationSetter() {
  const nav = useNavigate();
  useEffect(() => {
    setNavigate((to, opts) => nav(to, { replace: !!opts?.replace }));
  }, [nav]);
  return null;
}
