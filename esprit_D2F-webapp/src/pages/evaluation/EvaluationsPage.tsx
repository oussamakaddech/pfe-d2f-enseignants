import { useState } from 'react';
import { Tabs } from 'antd';
import { BarChartOutlined, FormOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserRole } from '@/routes/guards';
import { ROLES, hasAnyRole } from '@/utils/constants/roles';
import EvaluationParticipantPage from './EvaluationParticipantPage';
import QuestionnaireEvaluationPage from './QuestionnaireEvaluationPage';
import EvaluationStatsPage from './EvaluationStatsPage';

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
 * Page Évaluations :
 *  - ADMIN : « Statistiques » — graphiques du questionnaire de satisfaction
 *    (répartition par aspect, moyennes, formation complémentaire, par formation
 *    et par UP, remarques), résultats anonymes.
 *  - autres rôles : « Évaluer mes formations » — questionnaire (3 aspects notés
 *    de « Pas du tout satisfaisant » à « Très satisfaisant », besoin de formation
 *    complémentaire, remarques) pour les formations en cours ou achevées dont
 *    l'utilisateur est participant.
 *  - ANIMATEUR : en plus, « Éval. Formateur (participants) ».
 *
 * L'onglet actif est partagé avec l'URL (partageable / retour-arrière cohérent).
 */
export default function EvaluationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = useUserRole() ?? '';
  const isAnimateur = hasAnyRole(userRole, [ROLES.ANIMATEUR]);
  const isAdmin = hasAnyRole(userRole, [ROLES.ADMIN]);

  const activeTab = isAnimateur
    ? resolveActiveTab(location.pathname, location.hash)
    : TAB_FORMATION;

  const [mounted, setMounted] = useState<Record<string, boolean>>({
    [activeTab]: true,
  });

  const handleChange = (key: string) => {
    setMounted((prev) => ({ ...prev, [key]: true }));
    navigate(key === TAB_PARTICIPANTS ? '/home/Evaluations/Participants' : '/home/Evaluations', {
      replace: true,
    });
  };

  const items = [
    isAdmin
      ? {
          key: TAB_FORMATION,
          label: 'Statistiques',
          icon: <BarChartOutlined />,
          children: mounted[TAB_FORMATION] ? <EvaluationStatsPage /> : null,
        }
      : {
          key: TAB_FORMATION,
          label: 'Évaluer mes formations',
          icon: <FormOutlined />,
          children: mounted[TAB_FORMATION] ? <QuestionnaireEvaluationPage /> : null,
        },
    // Onglet réservé aux animateurs : évaluation des participants.
    ...(isAnimateur
      ? [
          {
            key: TAB_PARTICIPANTS,
            label: 'Éval. Formateur (participants)',
            icon: <UserOutlined />,
            children: mounted[TAB_PARTICIPANTS] ? <EvaluationParticipantPage /> : null,
          },
        ]
      : []),
  ];

  return (
    <div className="evaluations-tabs-page">
      <Tabs activeKey={activeTab} items={items} onChange={handleChange} size="large" />
    </div>
  );
}
