import { Button, Popconfirm, Tooltip, Avatar, Tag } from 'antd';
import type React from 'react';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  MailOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  ApartmentOutlined,
  EnvironmentOutlined,
  ReadOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import BesoinPriorityBadge from './BesoinPriorityBadge';
import BesoinStatusBadge from './BesoinStatusBadge';
import BesoinCardMeta from './BesoinCardMeta';
import { getDecisionState, stepLabel } from '@/utils/besoin/workflow';
import type { BesoinFormation } from '@/models/besoin';

const TYPE_TONES: Record<string, string> = {
  INDIVIDUEL: 'info',
  COLLECTIF: 'violet',
};
const TYPE_LABELS: Record<string, string> = {
  INDIVIDUEL: 'Individuel',
  COLLECTIF: 'Collectif',
};

interface BesoinData {
  idBesoinFormation?: string | number;
  idBesionFormation?: string | number;
  id?: string | number;
  priorite?: string;
  username?: string;
  createdByUserId?: string;
  titre?: string;
  objectifFormation?: string;
  typeBesoin?: string;
  dateCreation?: string;
  approuveCUP?: boolean;
  approuveChefDep?: boolean;
  approuveAdmin?: boolean;
  status?: string;
  currentApprovalStep?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  propositionAnimateur?: string;
  horaireSouhaite?: string;
  theme?: string;
}

interface BesoinCardProps {
  besoin: BesoinData;
  upLabel?: string | null;
  deptLabel?: string | null;
  periodLabel?: string | null;
  approvingId?: string | number | null;
  canApprove?: boolean;
  canReject?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  userRole?: string;
  currentUsername?: string | null;
  currentUserId?: string | number | null;
  onApprove: (besoin: Record<string, unknown>) => void;
  onReject: (besoin: Record<string, unknown>) => void;
  onOpenMail: (besoin: Record<string, unknown>) => void;
  onEdit: (besoin: Record<string, unknown>) => void;
  onDelete: (id: string | number) => void;
  onOpen: () => void;
}

const initialsOf = (name: string) => {
  const parts = String(name || '')
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0].charAt(0) + (parts[1]?.charAt(0) || '')).toUpperCase();
};

const colorOfName = (str: string) => {
  const palette = ['#b51200', '#0891b2', '#7c3aed', '#059669', '#d97706', '#2563eb', '#db2777'];
  let h = 0;
  for (let i = 0; i < (str || '').length; i += 1) h = (h * 31 + (str.codePointAt(i) ?? 0)) >>> 0;
  return palette[h % palette.length];
};

const formatDate = (d: string | null | undefined) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(d);
  }
};

const NEW_THRESHOLD_DAYS = 7;
const isRecent = (d: string | null | undefined) => {
  if (!d) return false;
  const t = new Date(d).getTime();
  if (!Number.isFinite(t)) return false;
  const days = (Date.now() - t) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= NEW_THRESHOLD_DAYS;
};

/**
 * Card individuelle d'un besoin de formation.
 * - Surface entière cliquable → ouvre l'édition (onOpen)
 * - Les boutons actions stopPropagation pour éviter le double-déclenchement
 * - Priorité = rail gauche coloré + pill en top
 */
export default function BesoinCard({
  besoin,
  upLabel,
  deptLabel,
  periodLabel,
  approvingId,
  canApprove = true,
  canReject = true,
  canEdit = true,
  canDelete = true,
  userRole = '',
  currentUsername = null,
  currentUserId = null,
  onApprove,
  onReject,
  onOpenMail,
  onEdit,
  onDelete,
  onOpen,
}: Readonly<BesoinCardProps>) {
  const id = besoin.idBesoinFormation ?? besoin.idBesionFormation ?? besoin.id;
  const priorite = besoin.priorite || 'BASSE';
  const demandeurName = besoin.username || '—';
  const title = besoin.titre || besoin.objectifFormation || 'Sans titre';
  const desc = besoin.titre && besoin.objectifFormation ? besoin.objectifFormation : null;
  const typeTone = TYPE_TONES[besoin.typeBesoin ?? ''] || 'info';
  const typeLabel = TYPE_LABELS[besoin.typeBesoin ?? ''] || besoin.typeBesoin?.replaceAll('_', ' ');
  const recent = isRecent(besoin.dateCreation);

  // Règles d'affichage miroir du backend (le serveur refait tous les contrôles) :
  // étape ↔ rôle, statuts terminaux, créateur exclu.
  const decision = getDecisionState(besoin as unknown as BesoinFormation, {
    username: currentUsername,
    userId: currentUserId,
    role: userRole,
  });
  const showApprove = canApprove && decision.canApprove;
  const showReject = canReject && decision.canReject;
  const stepChip = !decision.isTerminal && decision.step ? stepLabel(decision.step) : null;

  const bRecord = besoin as unknown as Record<string, unknown>;
  const stopProp = (fn: () => void) => (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    fn();
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen?.();
    }
  };

  const metaItems = [
    { key: 'domaine', label: 'Domaine', value: besoin.theme, icon: <ReadOutlined /> },
    {
      key: 'up',
      label: 'UP',
      value: upLabel && upLabel !== '—' ? upLabel : null,
      icon: <ApartmentOutlined />,
    },
    {
      key: 'dept',
      label: 'Département',
      value: deptLabel && deptLabel !== '—' ? deptLabel : null,
      icon: <EnvironmentOutlined />,
    },
    { key: 'period', label: 'Période', value: periodLabel, icon: <CalendarOutlined /> },
  ];

  return (
    <div className={`bf-card bf-card--prio-${priorite}${recent ? ' bf-card--is-new' : ''}`}>
      <button
        type="button"
        className="bf-card__body"
        onClick={onOpen}
        onKeyDown={handleKeyDown}
        aria-label={`Besoin : ${title}`}
      >
        <div className="bf-card__rail" aria-hidden="true" />

        {recent && (
          <span className="bf-card__new-badge" aria-label="Nouveau besoin">
            Nouveau
          </span>
        )}

        {/* Top : badges */}
        <header className="bf-card__top">
          <BesoinPriorityBadge value={priorite} />
          <BesoinStatusBadge approved={!!besoin.approuveAdmin} status={besoin.status} />
        </header>
        {stepChip && (
          <div style={{ marginBottom: 4 }}>
            <Tag color="default" className="bf-step-chip">
              <ClockCircleOutlined /> {stepChip}
            </Tag>
          </div>
        )}
        {besoin.status === 'REJECTED' && besoin.rejectionReason && (
          <p className="bf-card__reject-reason">
            <strong>Motif du refus{besoin.rejectedBy ? ` (${besoin.rejectedBy})` : ''} : </strong>
            {besoin.rejectionReason}
          </p>
        )}

        {/* Title */}
        <h3 className="bf-card__title" title={title}>
          {title}
        </h3>
        {desc && <p className="bf-card__desc">{desc}</p>}

        {/* Demandeur inline */}
        <div className="bf-card__requester">
          <Avatar
            size={32}
            style={{ background: colorOfName(demandeurName), fontWeight: 600, fontSize: 12 }}
          >
            {initialsOf(demandeurName)}
          </Avatar>
          <div className="bf-card__requester-body">
            <div className="bf-card__requester-name">{demandeurName}</div>
            <div className="bf-card__requester-sub">
              {formatDate(besoin.dateCreation) || 'Date inconnue'}
              {besoin.propositionAnimateur && (
                <>
                  <span className="bf-card__sep" aria-hidden="true">
                    •
                  </span>
                  <UserOutlined style={{ marginRight: 4 }} />
                  {besoin.propositionAnimateur}
                </>
              )}
            </div>
          </div>
          {typeLabel && (
            <span className={`bf-type-pill bf-type-pill--${typeTone}`}>{typeLabel}</span>
          )}
        </div>

        {/* Horaire souhaité (si renseigné) */}
        {besoin.horaireSouhaite && (
          <div className="bf-card__schedule">
            <ClockCircleOutlined />
            <span>
              Souhaité : <strong>{besoin.horaireSouhaite}</strong>
            </span>
          </div>
        )}

        {/* Meta chips */}
        <BesoinCardMeta items={metaItems} />

        {/* Divider */}
        <div className="bf-card__divider" aria-hidden="true" />
      </button>

      {/* Actions */}
      <div className="bf-card__actions">
        {showApprove && (
          <Popconfirm
            title="Approuver ce besoin ?"
            description="Cela lance la création de la formation associée."
            onConfirm={stopProp(() => onApprove(bRecord))}
            onCancel={(e) => e?.stopPropagation()}
            okText="Approuver"
            cancelText="Annuler"
            okButtonProps={{ className: 'bf-btn bf-btn--success' }}
          >
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              loading={approvingId === id}
              className="bf-btn bf-btn--success bf-card__cta"
              onClick={(e) => e.stopPropagation()}
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
              className="bf-card__cta"
              onClick={stopProp(() => onReject(bRecord))}
              aria-label="Refuser"
            >
              Refuser
            </Button>
          </Tooltip>
        )}
        <Tooltip title="Demander des informations au CUP">
          <Button
            size="small"
            icon={<MailOutlined />}
            onClick={stopProp(() => onOpenMail(bRecord))}
            className="bf-iconbtn bf-iconbtn--mail"
            aria-label="Email CUP"
          />
        </Tooltip>
        {canEdit && (
          <Tooltip title="Modifier">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={stopProp(() => onEdit(bRecord))}
              className="bf-iconbtn"
              aria-label="Modifier"
            />
          </Tooltip>
        )}
        {canDelete && (
          <Popconfirm
            title="Supprimer ce besoin ?"
            description="Cette action est irréversible."
            onConfirm={stopProp(() => {
              if (id != null) onDelete(id);
            })}
            onCancel={(e) => e?.stopPropagation()}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              className="bf-iconbtn bf-iconbtn--danger"
              onClick={(e) => e.stopPropagation()}
              aria-label="Supprimer"
            />
          </Popconfirm>
        )}
      </div>
    </div>
  );
}
