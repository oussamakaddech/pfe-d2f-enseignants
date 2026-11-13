import { useAuth } from '@/hooks/auth/useAuth';
import { normalizeRole } from '@/utils/constants/roles';
import CupDashboardPage from './CupDashboardPage';
import PersonalDashboard from './PersonalDashboard';

/**
 * Tableau de bord principal (landing /home).
 * Routing basé sur le rôle :
 * - ENSEIGNANT / ANIMATEUR → PersonalDashboard (espace personnel)
 * - Tous les autres rôles → CupDashboardPage (vue consolidée CUP/Admin/Chef)
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);

  if (role === 'enseignant' || role === 'animateur') {
    return <PersonalDashboard />;
  }

  return <CupDashboardPage />;
}
