import { useState } from 'react';
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

  const isAnimateur = hasAnyRole(userRole, [ROLES.ANIMATEUR]);

  const activeTab = isAnimateur
    ? resolveActiveTab(location.pathname, location.hash)
    : TAB_PARTICIPANTS;

  const [mounted, setMounted] = useState<Record<string, boolean>>({
    [activeTab]: true,
  });

  const handleChange = (key: string) => {
    setMounted((prev) => ({ ...prev, [key]: true }));
    navigate(key === TAB_PARTICIPANTS ? '/home/Evaluations/Participants' : '/home/Evaluations', {
      replace: true,
    });
  };

  const items = isAnimateur
    ? [
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
      ]
    : [
        {
          key: TAB_PARTICIPANTS,
          label: 'Évaluations participants',
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
