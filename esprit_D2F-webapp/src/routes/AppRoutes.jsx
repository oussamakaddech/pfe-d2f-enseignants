
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import AuthProvider from "../context/AuthProvider";
import PrivateRoute from "../components/PrivateRoute";
import RoleGuard    from "../components/RoleGuard";
import AppLayout    from "../components/AppLayout";

// Pages publiques



// Pages protégées


import KPIChart               from "../pages/kpiFormation/KPIChart";

import CalendrierPage         from "../pages/CalendrierPage";
import FormationTable         from "../pages/FormationTable";
import ListAccounts           from "../pages/gererComptes/ListAccounts";
import Calendrier             from "../pages/Calendrier";

import TeachersDataGrid       from "../pages/enseignant/TeachersDataGrid";
import CalendarEnseignant     from "../pages/enseignant/CalendarEnseignant";
import CompletedFormations    from "../pages/CompletedFormations";
import CertificatePage        from "../pages/CertificatePage";
import Tests                  from "../pages/Tests";
import FormationList          from "../pages/presence/FormationList";
import FormationDetail        from "../pages/presence/FormationDetail";

// 404
import NotFound from "../pages/erreur/NotFound";
import FormationCards from "../pages/inscription/FormationCards";
import FicheFormation from "../pages/inscription/FicheFormation";
import DemandesList from "../pages/inscription/DemandesList";
import BesoinFormationApproval from "../pages/besoinApprouve/BesoinFormationApproval";
import CertificatesByEmailPage from "../pages/CertificatesByEmailPage";
import UpDeptDataGrid from "../pages/enseignant/UpDeptDataGrid";

import Register from "../pages/auth/Register";
import Home from "../pages/erreur/Home";
import Login from "../pages/gererComptes/Login";
import Profile from "../pages/auth/Profile";
import EditProfile from "../pages/auth/EditProfile";
import UpdatePassword from "../pages/gererComptes/UpdatePassword";
import CombinedFormationOneDriveTree from "../pages/documentFormation/CombinedFormationOneDriveTree";





export default function AppRoutes() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* PUBLIC */}
          <Route path="/"        element={<Login/>} />
          <Route path="/register" element={<Register />} />

          {/* PROTECTED */}
          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/home" element={<Home />} />

              {/* Profil */}
              <Route path="home/profile"         element={<Profile />} />
              <Route path="home/edit-profile"    element={<EditProfile />} />
              <Route path="home/update-password" element={<UpdatePassword />} />
              <Route path="home/ListeFormation"   element={<FormationCards />} />
              <Route path="home/ListeFormation/:id" element={<FicheFormation />} />
              <Route path="home/MyCertificate"          element={<CertificatesByEmailPage />} />
              {/* Admin only */}
              <Route element={<RoleGuard allowedRoles={["admin","D2F","CUP"]} />}>
                <Route path="home/File"                   element={<CombinedFormationOneDriveTree />} />
                <Route path="home/KPI"                    element={<KPIChart />} />
                <Route path="home/UpDept"                    element={<UpDeptDataGrid />} />
                <Route path="home/Calendrier"             element={<CalendrierPage />} />
                <Route path="home/Formation"              element={<FormationTable />} />
                <Route path="home/BesoinApprouver"              element={<BesoinFormationApproval />} />
                <Route path="home/ListeFormation/:id/demandes" element={<DemandesList />} />

                <Route path="home/test"                   element={<Tests />} />
               
                <Route path="home/calendar"               element={<Calendrier />} />
                <Route path="home/accounts"               element={<ListAccounts />} />
                <Route path="home/Enseignants"            element={<TeachersDataGrid />} />
                <Route path="home/calendar/:enseignantId" element={<CalendarEnseignant />} />
                <Route path="home/certificate"            element={<CompletedFormations />} />
                <Route path="home/certificate/:formationId" element={<CertificatePage />} />
               </Route>

              {/* Formateur only */}
              <Route element={<RoleGuard allowedRoles={["Formateur","D2F"]} />}>
                <Route path="home/animateur-formations"     element={<FormationList />} />
                <Route path="home/animateur-formations/:id" element={<FormationDetail />} />
                
              </Route>
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
