import DashboardGlass from './DashboardGlass';

/**
 * Tableau de bord principal (landing /home).
 * Vue moderne « glassmorphism » pilotée par le hook useDashboard (données
 * globales de la plateforme). Accessible à tous les rôles authentifiés.
 */
export default function DashboardPage() {
  return <DashboardGlass />;
}
