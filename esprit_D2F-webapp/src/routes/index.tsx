import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Skeleton, Row, Col } from 'antd';
import { neutral } from '@/styles/themes/tokens';

import AuthProvider from '@/context/AuthContext';
import NotificationProvider from '@/context/NotificationContext';
import NotificationBridge from '@/components/feedback/NotificationBridge';
import { NavigationSetter } from './NavigationSetter';
import { PrivateRoute, RoleGuard } from './guards';
import AppLayout from '@/components/layout/AppLayout';
import { ROLES } from '@/utils/constants/roles';

const CalendrierPage = lazy(() => import('@/pages/formation/CalendrierPage'));
const CalendrierGestionPage = lazy(() => import('@/pages/formation/CalendrierGestionPage'));
const FormationPage = lazy(() => import('@/pages/formation/FormationPage'));
const FormationCreationPage = lazy(() => import('@/pages/formation/FormationCreationPage'));
const FormationConsultationPage = lazy(() => import('@/pages/formation/FormationConsultationPage'));
const DocumentsPage = lazy(() => import('@/pages/documentFormation/DocumentsPage'));
const AdministrationPage = lazy(() => import('@/pages/admin/AdministrationPage'));
const CalendarEnseignant = lazy(() => import('@/pages/enseignant/CalendarEnseignant'));
const CertificatePage = lazy(() => import('@/pages/certificat/CertificatePage'));
const FormationList = lazy(() => import('@/pages/presence/FormationList'));
const FormationDetail = lazy(() => import('@/pages/presence/FormationDetail'));
const MaPresence = lazy(() => import('@/pages/presence/MaPresence'));
const NotFound = lazy(() => import('@/pages/errors/NotFound'));
const InscriptionsPage = lazy(() => import('@/pages/inscription/InscriptionsPage'));
const FicheFormation = lazy(() => import('@/pages/inscription/FicheFormation'));
const DemandesList = lazy(() => import('@/pages/inscription/DemandesList'));
const BesoinForm = lazy(() => import('@/pages/besoin/BesoinForm'));
const BesoinList = lazy(() => import('@/pages/besoin/BesoinList'));
const CertificatesByEmailPage = lazy(() => import('@/pages/certificat/CertificatesByEmailPage'));
const UpDeptDataGrid = lazy(() => import('@/pages/enseignant/UpDeptDataGrid'));
const Register = lazy(() => import('@/pages/auth/Register'));
const Forbidden403 = lazy(() => import('@/pages/error/Forbidden403'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const Login = lazy(() => import('@/pages/admin/gererComptes/Login'));
const PasswordRecovery = lazy(() => import('@/pages/admin/gererComptes/PasswordRecovery'));
const Profile = lazy(() => import('@/pages/auth/Profile'));
const EditProfile = lazy(() => import('@/pages/auth/EditProfile'));
const UpdatePassword = lazy(() => import('@/pages/admin/gererComptes/UpdatePassword'));
const CombinedFormationOneDriveTree = lazy(
  () => import('@/pages/documentFormation/CombinedFormationOneDriveTree'),
);
const CompetencePage = lazy(() => import('@/pages/competence/CompetencePage'));
const EnseignantCompetencePage = lazy(() => import('@/pages/competence/EnseignantCompetencePage'));
const AffectationEnseignantPage = lazy(
  () => import('@/pages/competence/AffectationEnseignantPage'),
);
const RicePage = lazy(() => import('@/pages/competence/RicePage'));
const CompetenceMatchingPage = lazy(() => import('@/pages/competence/CompetenceMatchingPage'));
const EvaluationGlobalePage = lazy(() => import('@/pages/evaluation/EvaluationGlobalePage'));
const TeacherAnalyticsPage = lazy(() => import('@/pages/analyse/AnalyticsTeacherPage'));
const AnalysePredictivePage = lazy(() => import('@/pages/analyse/AnalyticsPage'));
const EnseignantsInactifsPage = lazy(() => import('@/pages/analyse/EnseignantsInactifsPage'));
const FormationsParPeriodePage = lazy(() => import('@/pages/analyse/FormationsParPeriodePage'));
const SkillPassportPage = lazy(() => import('@/pages/profile/SkillPassportPage'));
const BureauPage = lazy(() => import('@/pages/bureau/BureauPage'));
const PersonalDashboard = lazy(() => import('@/pages/dashboard/PersonalDashboard'));
const AlertsCenterPage = lazy(() => import('@/pages/analyse/AlertsCenterPage'));
const ABTestingPage = lazy(() => import('@/pages/analyse/ABTestingPage'));
const SkillForecastPage = lazy(() => import('@/pages/analyse/SkillForecastPage'));
const PeerBenchmarkPage = lazy(() => import('@/pages/analyse/PeerBenchmarkPage'));
const AnomalyDetectionPage = lazy(() => import('@/pages/analyse/AnomalyDetectionPage'));
const AnalyticsDashboardPage = lazy(() => import('@/pages/analyse/AnalyticsDashboardPage'));
const HeatmapPage = lazy(() => import('@/pages/analyse/HeatmapPage'));
const ModelMonitoringPage = lazy(() => import('@/pages/analyse/ModelMonitoringPage'));
const ForecastPage = lazy(() => import('@/pages/analyse/ForecastPage'));
const D2FOverviewPage = lazy(() => import('@/pages/analyse/D2FOverviewPage'));

function PageSkeleton() {
  return (
    <div style={{ padding: 24, background: neutral[50], minHeight: 'calc(100vh - 128px)' }}>
      <Skeleton.Input
        active
        style={{ width: 260, height: 28, marginBottom: 28, display: 'block' }}
      />
      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} md={6} key={i}>
            <Skeleton.Node
              active
              style={{ width: '100%', height: 110, borderRadius: 14, display: 'block' }}
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
      <NotificationProvider>
        <NotificationBridge />
        <Router>
          <NavigationSetter />
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth" element={<Navigate to="/login" replace />} />
              <Route path="/auth/login" element={<Navigate to="/login" replace />} />
              <Route path="/register" element={<Register />} />
              <Route path="/403" element={<Forbidden403 />} />
              <Route path="/password-recovery" element={<PasswordRecovery />} />
              <Route path="/profile" element={<Navigate to="/home/profile" replace />} />

              <Route element={<PrivateRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/home" element={<DashboardPage />} />
                  <Route path="/home/profile" element={<Profile />} />
                  <Route path="/home/skill-passport" element={<SkillPassportPage />} />
                  <Route path="/home/skill-passport/:username" element={<SkillPassportPage />} />
                  <Route path="/home/edit-profile" element={<EditProfile />} />
                  <Route path="/home/update-password" element={<UpdatePassword />} />
                  {/* Parité INSCRIPTION_READ (AuthorizationMatrix) : ADMIN, CUP,
                      ENSEIGNANT, ANIMATEUR, CHEF_DEPARTEMENT. */}
                  <Route
                    element={
                      <RoleGuard
                        allowedRoles={[ROLES.ADMIN, ROLES.CUP, ROLES.ENSEIGNANT, ROLES.ANIMATEUR, ROLES.CHEF_DEPARTEMENT]}
                      />
                    }
                  >
                    <Route path="/home/Inscriptions" element={<InscriptionsPage />} />
                  </Route>
                  <Route
                    path="/home/ListeFormation"
                    element={<Navigate to="/home/Inscriptions" replace />}
                  />
                  <Route
                    path="/home/MesInscriptions"
                    element={<Navigate to="/home/Inscriptions?tab=mes-inscriptions" replace />}
                  />
                  <Route path="/home/ListeFormation/:id" element={<FicheFormation />} />
                  <Route path="/home/MyCertificate" element={<CertificatesByEmailPage />} />

                  <Route element={<RoleGuard allowedRoles={[ROLES.ADMIN]} />}>
                    <Route path="/home/administration" element={<AdministrationPage />} />
                    <Route
                      path="/home/accounts"
                      element={<Navigate to="/home/administration" replace />}
                    />
                    <Route
                      path="/home/comptes"
                      element={<Navigate to="/home/administration" replace />}
                    />
                    <Route
                      path="/home/utilisateurs"
                      element={<Navigate to="/home/administration" replace />}
                    />
                    <Route
                      path="/home/Enseignants"
                      element={<Navigate to="/home/administration" replace />}
                    />
                    <Route path="/home/UpDept" element={<UpDeptDataGrid />} />
                    <Route path="/home/certificate" element={<CertificatePage />} />
                    <Route path="/home/certificate/:formationId" element={<CertificatePage />} />
                    <Route path="/home/bureaux" element={<BureauPage />} />
                  </Route>

                  {/* RICE_READ = ADMIN, CUP, CHEF_DEPARTEMENT (parité AuthorizationMatrix) */}
                  <Route
                    element={
                      <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.CUP, ROLES.CHEF_DEPARTEMENT]} />
                    }
                  >
                    <Route path="/home/rice" element={<RicePage />} />
                  </Route>

                  {/* FORMATION_CREATE = ADMIN, CUP (cf. AuthorizationMatrix) */}
                  <Route element={<RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.CUP]} />}>
                    <Route path="/home/Formation" element={<FormationPage />} />
                    <Route path="/home/Formation/Creer" element={<FormationCreationPage />} />
                  </Route>

                  <Route
                    element={
                      <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.CUP, ROLES.CHEF_DEPARTEMENT]} />
                    }
                  >
                    <Route path="/home/KPI" element={<Navigate to="/home" replace />} />
                    {/* Module analytics ( consolidated into src/pages|components|hooks|services|models ) */}
                    <Route path="/home/AnalysePredictive" element={<AnalyticsDashboardPage />} />
                    <Route path="/home/analytics/dashboard" element={<AnalyticsDashboardPage />} />
                    <Route path="/home/analytics/heatmap" element={<HeatmapPage />} />
                    <Route path="/home/analytics/monitoring" element={<ModelMonitoringPage />} />
                    {/* Pages analyse existantes (conservées) */}
                    <Route path="/home/analytics/teacher" element={<TeacherAnalyticsPage />} />
                    <Route
                      path="/home/analytics/teacher/:enseignantId"
                      element={<TeacherAnalyticsPage />}
                    />
                    <Route
                      path="/home/analytics/enseignants-inactifs"
                      element={<EnseignantsInactifsPage />}
                    />
                    <Route
                      path="/home/analytics/formations-par-periode"
                      element={<FormationsParPeriodePage />}
                    />
                    <Route path="/home/analytics/alerts" element={<AlertsCenterPage />} />
                    <Route path="/home/analytics/ab-testing" element={<ABTestingPage />} />
                    <Route path="/home/analytics/forecast" element={<SkillForecastPage />} />
                    <Route path="/home/analytics/benchmark" element={<PeerBenchmarkPage />} />
                    <Route path="/home/analytics/anomalies" element={<AnomalyDetectionPage />} />
                    <Route path="/home/analytics/pilotage" element={<ForecastPage />} />
                    {/* D2F master view — source unique de vérité */}
                    <Route path="/home/analytics/d2f" element={<D2FOverviewPage />} />
                  </Route>

                  <Route element={<RoleGuard allowedRoles={[ROLES.ENSEIGNANT, ROLES.ANIMATEUR]} />}>
                    <Route path="/home/personal-dashboard" element={<PersonalDashboard />} />
                  </Route>

                  <Route
                    element={<RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.CHEF_DEPARTEMENT]} />}
                  >
                    <Route path="/home/Calendrier" element={<CalendrierPage />} />
                    <Route path="/home/calendar/:enseignantId" element={<CalendarEnseignant />} />
                  </Route>

                  {/* Gestion du calendrier des ateliers : import/export/invitations.
                    L'import et l'envoi d'invitations restent réservés à ADMIN (gardé aussi côté page et backend). */}
                  <Route
                    element={
                      <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.CUP, ROLES.CHEF_DEPARTEMENT]} />
                    }
                  >
                    <Route
                      path="/home/Formation/CalendrierGestion"
                      element={<CalendrierGestionPage />}
                    />
                  </Route>

                  <Route
                    element={
                      <RoleGuard
                        allowedRoles={[
                          ROLES.ADMIN,
                          ROLES.CUP,
                          ROLES.RESPONSABLE_DOSSIER,
                          ROLES.CHEF_DEPARTEMENT,
                        ]}
                      />
                    }
                  >
                    <Route
                      path="/home/Formation/Consulter"
                      element={<FormationConsultationPage />}
                    />
                    <Route
                      path="/home/Formation/Consulter/:formationId/documents"
                      element={<DocumentsPage />}
                    />
                    <Route path="/home/File" element={<CombinedFormationOneDriveTree />} />
                  </Route>

                  <Route
                    element={
                      <RoleGuard
                        allowedRoles={[
                          ROLES.ADMIN,
                          ROLES.CUP,
                          ROLES.CHEF_DEPARTEMENT,
                          ROLES.ENSEIGNANT,
                          ROLES.ANIMATEUR,
                        ]}
                      />
                    }
                  >
                    <Route path="/home/Evaluations" element={<EvaluationGlobalePage />} />
                  </Route>

                  {/* Référentiel Compétences : masqué aux ENSEIGNANT et ANIMATEUR (pas de besoin métier). */}
                  <Route
                    element={
                      <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.CUP, ROLES.CHEF_DEPARTEMENT]} />
                    }
                  >
                    <Route path="/home/competences" element={<CompetencePage />} />
                    <Route path="/home/competence" element={<CompetencePage />} />
                  </Route>
                  {/* Fiche compétences d'un enseignant donné (≠ référentiel) : reste accessible à l'enseignant. */}
                  <Route
                    element={
                      <RoleGuard
                        allowedRoles={[
                          ROLES.ADMIN,
                          ROLES.CUP,
                          ROLES.ENSEIGNANT,
                          ROLES.CHEF_DEPARTEMENT,
                        ]}
                      />
                    }
                  >
                    <Route
                      path="/home/competences/enseignant/:enseignantId"
                      element={<EnseignantCompetencePage />}
                    />
                    <Route
                      path="/home/competence/enseignant/:enseignantId"
                      element={<EnseignantCompetencePage />}
                    />
                  </Route>

                  <Route element={<RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.CUP, ROLES.CHEF_DEPARTEMENT]} />}>
                    <Route path="/home/affectations" element={<AffectationEnseignantPage />} />
                    <Route path="/home/rice/matchmaking" element={<CompetenceMatchingPage />} />
                    <Route
                      path="/home/rice/competence-matching"
                      element={<CompetenceMatchingPage />}
                    />
                  </Route>

                  <Route
                    element={
                      <RoleGuard
                        allowedRoles={[
                          ROLES.ADMIN,
                          ROLES.CUP,
                          ROLES.ENSEIGNANT,
                          ROLES.ANIMATEUR,
                          ROLES.CHEF_DEPARTEMENT,
                          // Parité BESOIN_FORMATION_READ_ALL (AuthorizationMatrix)
                          // et FRONTEND_PERMISSIONS.BESOIN_FORMATION.READ_ALL.
                          ROLES.RESPONSABLE_DOSSIER,
                        ]}
                      />
                    }
                  >
                    <Route path="/home/besoins" element={<BesoinList />} />
                  </Route>
                  <Route
                    element={
                      <RoleGuard
                        allowedRoles={[ROLES.ADMIN, ROLES.CUP, ROLES.ENSEIGNANT, ROLES.ANIMATEUR]}
                      />
                    }
                  >
                    <Route path="/home/besoins/ajouter" element={<BesoinForm />} />
                  </Route>

                  <Route element={<RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.CUP]} />}>
                    <Route path="/home/ListeFormation/:id/demandes" element={<DemandesList />} />
                    <Route
                      path="/home/Inscriptions/Suivi"
                      element={<Navigate to="/home/Inscriptions?tab=suivi" replace />}
                    />
                  </Route>

                  {/* Présences : CUP ajouté (parité PRESENCE_MARK backend + spec CUP
                      « consulter les présences ») ; l'animateur/formateur de la séance
                      et l'enseignant consultent leurs sessions. */}
                  <Route
                    element={
                      <RoleGuard
                        allowedRoles={[ROLES.ANIMATEUR, ROLES.ENSEIGNANT, ROLES.ADMIN, ROLES.CUP]}
                      />
                    }
                  >
                    <Route path="/home/animateur-formations" element={<FormationList />} />
                    <Route path="/home/animateur-formations/:id" element={<FormationDetail />} />
                  </Route>

                  {/* Présences : consultation de sa feuille de présence (enseignant
                      OU animateur — les présences animateurs sont créées par séance). */}
                  <Route element={<RoleGuard allowedRoles={[ROLES.ENSEIGNANT, ROLES.ANIMATEUR]} />}>
                    <Route path="/home/mes-presences" element={<MaPresence />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}
