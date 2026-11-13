/* ─────────────────────────────────────────────────────────────────────────
 * BesoinTable — tableau Ant Design des besoins de formation.
 *
 * Utilisé par les deux onglets de la page « Besoins de formation » :
 * « Besoins en cours » (actions possibles) et « Approuvés » (lecture seule
 * + création de la formation). Les actions sont des boutons explicites
 * (libellés) pour la décision, et des boutons icônes pour les actions
 * secondaires.
 * ─────────────────────────────────────────────────────────────────────── */
import { Table, Tag, Button, Tooltip, Popconfirm, Space, Avatar, Badge, Grid } from 'antd';
import type { TableProps } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MailOutlined,
  InfoCircleOutlined,
  RocketOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import BesoinPriorityBadge from './BesoinPriorityBadge';
import BesoinStatusBadge from './BesoinStatusBadge';
import { getDecisionState, stepLabel } from '@/utils/besoin/workflow';
import type { BesoinFormation } from '@/models/besoin';

interface BesoinTableProps {
  data: Record<string, unknown>[];
  loading: boolean;
  approvingId: string | number | null;
  canApprove?: boolean;
  canReject?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  userRole?: string;
  currentUsername?: string | null;
  currentUserId?: string | number | null;
  getBesoinId: (r: Record<string, unknown>) => unknown;
  onApprove: (r: Record<string, unknown>) => void;
  onReject: (r: Record<string, unknown>) => void;
  onOpenMail: (r: Record<string, unknown>) => void;
  onEdit: (r: Record<string, unknown>) => void;
  onDelete: (id: unknown) => void;
  /** Ouverture de la fiche (clic sur la ligne). */
  onOpen?: (r: Record<string, unknown>) => void;
  /** Action « Créer la formation » (absente → bouton masqué). */
  onCreateFormation?: (r: Record<string, unknown>) => void;
  /** Libellé UP lisible (résolution côté page). */
  resolveUp?: (r: Record<string, unknown>) => string | null | undefined;
  /** Libellé département lisible (résolution côté page). */
  resolveDept?: (r: Record<string, unknown>) => string | null | undefined;
  /** Libellé de la période (P1, Session d'été…). */
  resolvePeriod?: (r: Record<string, unknown>) => string | null | undefined;
  /** Pagination maîtrisée par la page (sinon pagination interne). */
  pagination?: TableProps<Record<string, unknown>>['pagination'];
}

const TYPE_LABELS: Record<string, string> = {
  INDIVIDUEL: 'Individuel',
  COLLECTIF: 'Collectif',
};

function initialsOf(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export default function BesoinTable({
  data,
  loading,
  approvingId,
  canApprove = true,
  canReject = true,
  canEdit = true,
  canDelete = true,
  userRole = '',
  currentUsername = null,
  currentUserId = null,
  getBesoinId,
  onApprove,
  onReject,
  onOpenMail,
  onEdit,
  onDelete,
  onOpen,
  onCreateFormation,
  resolveUp,
  resolveDept,
  resolvePeriod,
  pagination,
}: Readonly<BesoinTableProps>) {
  // Adaptation à la largeur : sur petit écran, les colonnes secondaires
  // (UP / Département, Période, Date) sont masquées et la colonne « Actions »
  // n'est plus figée à droite (elle occuperait toute la largeur restante).
  const screens = Grid.useBreakpoint();
  const isWide = !!screens.lg;

  const columns: TableProps<Record<string, unknown>>['columns'] = [
    {
      title: 'Formation demandée',
      key: 'formation',
      render: (_: unknown, r: Record<string, unknown>) => {
        const type = typeof r.typeBesoin === 'string' ? r.typeBesoin : '';
        const decision = getDecisionState(r as unknown as BesoinFormation, {
          username: currentUsername,
          userId: currentUserId,
          role: userRole,
        });
        const step = !decision.isTerminal && decision.step ? stepLabel(decision.step) : null;
        return (
          <div className="bf-table__title-cell">
            <div className="bf-table__title">{String(r.titre || r.objectifFormation || '—')}</div>
            <div className="bf-table__sub">
              <BesoinStatusBadge
                approved={!!r.approuveAdmin}
                status={typeof r.status === 'string' ? r.status : null}
              />
              {step && <span className="bf-table__step">{step}</span>}
              {type && <Tag className="bf-table__type">{TYPE_LABELS[type] || type}</Tag>}
              {/* Le demandeur est rappelé sous le titre : la colonne dédiée est
                  masquée sur les écrans étroits. */}
              <span className="bf-table__theme">{String(r.username || '—')}</span>
              {!!r.theme && <span className="bf-table__theme">{String(r.theme)}</span>}
            </div>
          </div>
        );
      },
      sorter: (a: Record<string, unknown>, b: Record<string, unknown>) =>
        String(a.titre || '').localeCompare(String(b.titre || '')),
    },
    {
      title: 'Demandeur',
      key: 'demandeur',
      width: 180,
      responsive: ['sm'],
      render: (_: unknown, r: Record<string, unknown>) => {
        const name = String(r.username || '—');
        return (
          <div className="bf-table__requester">
            <Avatar size={28} className="bf-table__avatar">
              {initialsOf(name)}
            </Avatar>
            <span className="bf-table__requester-name">{name}</span>
          </div>
        );
      },
    },
    {
      title: 'UP / Département',
      key: 'perimetre',
      width: 210,
      responsive: ['lg'],
      render: (_: unknown, r: Record<string, unknown>) => {
        const up = resolveUp?.(r) ?? '';
        const dept = resolveDept?.(r) ?? '';
        return (
          <div className="bf-table__scope">
            {up && <span className="bf-table__scope-line">{up}</span>}
            {dept && <span className="bf-table__scope-line bf-table__scope-line--muted">{dept}</span>}
            {!up && !dept && <span className="bf-table__sub">—</span>}
          </div>
        );
      },
    },
    {
      title: 'Période',
      key: 'periode',
      width: 130,
      responsive: ['md'],
      render: (_: unknown, r: Record<string, unknown>) => {
        const period = resolvePeriod?.(r) ?? '';
        return period ? (
          <span className="bf-table__period">
            <ClockCircleOutlined /> {period}
          </span>
        ) : (
          <span className="bf-table__sub">—</span>
        );
      },
    },
    {
      title: 'Priorité',
      dataIndex: 'priorite',
      width: 120,
      render: (p: string) => <BesoinPriorityBadge value={p} size="sm" />,
      sorter: (a: Record<string, unknown>, b: Record<string, unknown>) => {
        const order: Record<string, number> = { CRITIQUE: 4, HAUTE: 3, MOYENNE: 2, BASSE: 1 };
        return (order[String(a.priorite)] || 0) - (order[String(b.priorite)] || 0);
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 340,
      fixed: isWide ? ('right' as const) : undefined,
      render: (_: unknown, r: Record<string, unknown>) => {
        const id = getBesoinId(r);
        const decision = getDecisionState(r as unknown as BesoinFormation, {
          username: currentUsername,
          userId: currentUserId,
          role: userRole,
        });
        const showApprove = canApprove && decision.canApprove;
        const showReject = canReject && decision.canReject;
        return (
          <div className="bf-table__actions">
            {showApprove && (
              <Popconfirm
                title="Approuver ce besoin ?"
                description="La validation est définitive : le besoin passe à « Validé »."
                onConfirm={() => onApprove(r)}
                okText="Approuver"
                cancelText="Annuler"
                okButtonProps={{ className: 'bf-btn bf-btn--success' }}
              >
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  loading={approvingId === id}
                  className="bf-action bf-action--approve"
                >
                  Approuver
                </Button>
              </Popconfirm>
            )}
            {showReject && (
              <Tooltip title="Refuser ce besoin (motif obligatoire)">
                <Button
                  danger
                  size="small"
                  icon={<CloseCircleOutlined />}
                  loading={approvingId === id}
                  onClick={() => onReject(r)}
                  className="bf-action bf-action--reject"
                >
                  Refuser
                </Button>
              </Tooltip>
            )}
            {onCreateFormation && (
              <Tooltip title="Créer la formation correspondant à ce besoin approuvé">
                <Button
                  type="primary"
                  ghost
                  size="small"
                  icon={<RocketOutlined />}
                  onClick={() => onCreateFormation(r)}
                  className="bf-action bf-action--formation"
                >
                  Créer la formation
                </Button>
              </Tooltip>
            )}
            {/* Le demandeur ne peut pas valider son propre besoin (règle serveur). */}
            {!showApprove && !showReject && decision.creatorBlocked && !decision.isTerminal && (
              <Tooltip title="Le demandeur ne peut pas valider son propre besoin : la décision revient au D2F (un autre administrateur).">
                <Badge
                  status="default"
                  text="Vous êtes le demandeur"
                  className="bf-table__blocked"
                />
              </Tooltip>
            )}
            <Space size={4} className="bf-table__secondary">
              <Tooltip title="Écrire au CUP">
                <Button
                  size="small"
                  icon={<MailOutlined />}
                  onClick={() => onOpenMail(r)}
                  className="bf-iconbtn bf-iconbtn--mail"
                  aria-label="Email CUP"
                />
              </Tooltip>
              {canEdit && (
                <Tooltip title="Ouvrir la fiche du besoin">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onEdit(r)}
                    className="bf-iconbtn"
                    aria-label="Modifier"
                  />
                </Tooltip>
              )}
              {canDelete && (
                <Popconfirm
                  title="Supprimer ce besoin ?"
                  description="Cette action est irréversible."
                  onConfirm={() => onDelete(id)}
                  okText="Supprimer"
                  cancelText="Annuler"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Supprimer">
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      className="bf-iconbtn bf-iconbtn--danger"
                      aria-label="Supprimer"
                    />
                  </Tooltip>
                </Popconfirm>
              )}
            </Space>
          </div>
        );
      },
    },
  ];

  return (
    <div className="bf-table-wrap">
      <Table
        dataSource={data}
        columns={columns}
        rowKey={(r: Record<string, unknown>) => String(getBesoinId(r))}
        pagination={
          pagination ?? {
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (t: number) => `${t} besoin(s)`,
          }
        }
        scroll={{ x: isWide ? 1300 : 'max-content' }}
        size="middle"
        loading={loading}
        className="bf-table"
        onRow={
          onOpen
            ? (r: Record<string, unknown>) => ({
                onClick: () => onOpen(r),
                className: 'bf-table__row--clickable',
              })
            : undefined
        }
      />
    </div>
  );
}
