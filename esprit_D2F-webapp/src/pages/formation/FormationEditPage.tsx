/* ─────────────────────────────────────────────────────────────────────────
 * FormationEditPage — Page dédiée de modification d'une formation.
 * Charge le détail FRAIS (GET /:id) puis affiche FormationWorkflowEditForm
 * en pleine page (URL partageable, bouton retour navigateur).
 * ─────────────────────────────────────────────────────────────────────── */
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb, Spin, Button, Result } from 'antd';
import { HomeOutlined, AppstoreOutlined } from '@ant-design/icons';

import { useFormationById } from '@/hooks/formation';
import FormationWorkflowEditForm from './FormationWorkflowEditForm';

export default function FormationEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const formationId = id != null && id !== '' ? Number(id) : undefined;
  const {
    data: formation,
    isLoading,
    isError,
    refetch,
  } = useFormationById(Number.isNaN(formationId) ? undefined : formationId);

  return (
    <div className="bf-scope bf-page">
      <Breadcrumb
        items={[
          { href: '/home', title: (<><HomeOutlined /> Accueil</>) },
          { href: '/home/Formation/Consulter', title: 'Catalogue des formations' },
          { title: <strong>Modifier la formation</strong> },
        ]}
        style={{ marginBottom: 16 }}
      />

      {isLoading && (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <Spin size="large" tip="Chargement de la formation…" />
        </div>
      )}

      {!isLoading && (isError || formation == null) && (
        <Result
          status="error"
          title="Formation introuvable"
          subTitle="La formation demandée n'existe pas ou n'est plus accessible."
          extra={[
            <Button
              key="back"
              type="primary"
              icon={<AppstoreOutlined />}
              onClick={() => navigate('/home/Formation/Consulter')}
            >
              Retour au catalogue
            </Button>,
            <Button key="retry" onClick={() => void refetch()}>
              Réessayer
            </Button>,
          ]}
        />
      )}

      {!isLoading && !isError && formation != null && (
        <FormationWorkflowEditForm
          formation={
            formation as unknown as Parameters<typeof FormationWorkflowEditForm>[0]['formation']
          }
          onFormationUpdated={() => navigate('/home/Formation/Consulter')}
        />
      )}
    </div>
  );
}
