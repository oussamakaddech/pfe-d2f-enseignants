import { Breadcrumb, Button, Tooltip } from 'antd';
import { HomeOutlined, PlusOutlined, ReloadOutlined, FileExcelOutlined } from '@ant-design/icons';

interface BesoinHeaderProps {
  total: number;
  filteredCount: number;
  onRefresh: () => void;
  onExport: () => void;
  onAdd: () => void;
  loading?: boolean;
  exportDisabled?: boolean;
  canAdd?: boolean;
  addLabel?: string;
}

export default function BesoinHeader({
  total,
  filteredCount,
  onRefresh,
  onExport,
  onAdd,
  loading = false,
  exportDisabled = false,
  canAdd = true,
  addLabel = 'Ajouter un besoin',
}: Readonly<BesoinHeaderProps>) {
  return (
    <header className="bf-header">
      <Breadcrumb
        className="bf-breadcrumb"
        items={[
          {
            href: '/home',
            title: (
              <>
                <HomeOutlined /> Accueil
              </>
            ),
          },
          { title: 'Compétences & IA' },
          { title: <strong>Besoins de Formation</strong> },
        ]}
      />

      <div className="bf-header__row">
        <div className="bf-header__title-block">
          <h1 className="bf-header__title">
            Besoins de Formation
            {total > 0 && (
              <span className="bf-header__count">
                {filteredCount}
                {filteredCount !== total && (
                  <span className="bf-header__count-total"> / {total}</span>
                )}
              </span>
            )}
          </h1>
          <p className="bf-header__subtitle">
            Consultez, approuvez et instruisez les demandes de formation soumises par les unités
            pédagogiques.
          </p>
        </div>

        <div className="bf-header__actions">
          <Tooltip title="Exporter la sélection au format Excel">
            <Button
              icon={<FileExcelOutlined />}
              onClick={onExport}
              disabled={exportDisabled}
              className="bf-btn bf-btn--ghost"
            >
              Exporter
            </Button>
          </Tooltip>
          <Tooltip title="Recharger les besoins depuis le serveur">
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={onRefresh}
              disabled={loading}
              className="bf-btn bf-btn--ghost"
            >
              Actualiser
            </Button>
          </Tooltip>
          {canAdd && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onAdd}
              className="bf-btn bf-btn--primary"
            >
              {addLabel}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
