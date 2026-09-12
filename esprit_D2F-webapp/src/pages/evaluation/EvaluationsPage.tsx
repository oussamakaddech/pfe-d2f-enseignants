import { useMemo, useState } from 'react';
import { Tabs } from 'antd';
import { TrophyOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserRole } from '@/routes/guards';
import { ROLES, hasAnyRole } from '@/utils/constants/roles';
import EvaluationGlobalePage from './EvaluationGlobalePage';
import EvaluationParticipantPage from './EvaluationParticipantPage';

const TAB_FORMATION = 'formation';
const TAB_PARTICIPANTS = 'participants';

/** Onglet actif depuis l'URL : chemin /Participants > ancre #participants > défaut. */
function resolveActiveTab(pathname: string, hash: string): string {
  if (pathname.endsWith('/Participants')) {
    return TAB_PARTICIPANTS;
  }
  if (hash === `#${TAB_PARTICIPANTS}`) {
    return TAB_PARTICIPANTS;
  }
  return TAB_FORMATION;
}

/**
 * Page unique d'évaluation regroupant les deux dimensions (étape 3) :
 *  - « Éval. Formation »  : évaluation de la formation (contenu, organisation,
 *    supports, durée, satisfaction) — EvaluationGlobalePage.
 *  - « Éval. Formateur »  : évaluation du formateur par les participants
 *    (note, satisfaisant, commentaire) — EvaluationParticipantPage.
 *
 * L'onglet actif est partagé avec l'URL (partageable / retour-arrière cohérent).
 */
export default function EvaluationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = useUserRole() ?? '';

  const defaultTab = useMemo(() => {
    // Les enseignants/animateurs évaluent avant tout les formateurs qu'ils ont eus ;
    // les pilotes (admin/CUP/chef) commencent par la vue formation.
    const isPilot = hasAnyRole(userRole, [ROLES.ADMIN, ROLES.CUP, ROLES.CHEF_DEPARTEMENT]);
    return isPilot ? TAB_FORMATION : TAB_PARTICIPANTS;
  }, [userRole]);

  const activeTab = resolveActiveTab(location.pathname, location.hash);

  const [mounted, setMounted] = useState<Record<string, boolean>>({
    [defaultTab]: true,
  });

  const handleChange = (key: string) => {
    setMounted((prev) => ({ ...prev, [key]: true }));
    // URLs distinctes par onglet : les entrées de menu historiques continuent
    // de fonctionner et le garde de rôle reste effectif côté routing.
    navigate(key === TAB_PARTICIPANTS ? '/home/Evaluations/Participants' : '/home/Evaluations', {
      replace: true,
    });
  };

  // Chaque onglet n'est monté qu'une fois visité (données mises en cache par
  // react-query, mais les filtres/fetch de l'autre dimension ne tournent pas
  // tant qu'elle n'a pas été ouverte).
  const items = [
    {
      key: TAB_FORMATION,
      label: 'Éval. Formation',
      icon: <TrophyOutlined />,
      children: mounted[TAB_FORMATION] ? <EvaluationGlobalePage /> : null,
    },
    {
      key: TAB_PARTICIPANTS,
      label: 'Éval. Formateur (participants)',
      icon: <UserOutlined />,
      children: mounted[TAB_PARTICIPANTS] ? <EvaluationParticipantPage /> : null,
    },
  ];

  return (
    <div className="evaluations-tabs-page">
      <Tabs activeKey={activeTab} items={items} onChange={handleChange} size="large" />
    </div>
  );
}
