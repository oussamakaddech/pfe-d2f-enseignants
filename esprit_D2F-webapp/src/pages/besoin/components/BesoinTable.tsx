/* ─────────────────────────────────────────────────────────────────────────
 * BesoinTable — Ant Design Table with columns for the list view
 * ─────────────────────────────────────────────────────────────────────── */
import { Table, Tag, Button, Tooltip, Popconfirm, Space } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MailOutlined,
} from '@ant-design/icons';
import BesoinPriorityBadge from './BesoinPriorityBadge';
import BesoinStatusBadge from './BesoinStatusBadge';
import { getDecisionState } from '@/utils/besoin/workflow';
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
}: Readonly<BesoinTableProps>) {
  const columns = [
    {
      title: 'Formation',
      key: 'formation',
      render: (_: unknown, r: Record<string, unknown>) => (
        <div>
          <div className="bf-table__title">{String(r.titre || r.objectifFormation || '—')}</div>
          {!!r.theme && <div className="bf-table__sub">{String(r.theme)}</div>}
        </div>
      ),
      sorter: (a: Record<string, unknown>, b: Record<string, unknown>) =>
        String(a.titre || '').localeCompare(String(b.titre || '')),
    },
    {
      title: 'Demandeur',
      dataIndex: 'username',
      width: 140,
    },
    {
      title: 'Type',
      dataIndex: 'typeBesoin',
      width: 110,
      render: (t: string) => (t ? <Tag>{t}</Tag> : '—'),
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
      title: 'Date',
      dataIndex: 'dateCreation',
      width: 120,
      render: (d: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—'),
    },
    {
      title: 'Statut',
      key: 'statut',
      width: 140,
      render: (_: unknown, r: Record<string, unknown>) => (
        <BesoinStatusBadge
          approved={!!r.approuveAdmin}
          status={typeof r.status === 'string' ? r.status : null}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 230,
      fixed: 'right' as const,
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
          <Space size={4}>
            {showApprove && (
              <Popconfirm
                title="Approuver ce besoin ?"
                onConfirm={() => onApprove(r)}
                okText="Oui"
                cancelText="Non"
              >
                <Tooltip title="Approuver">
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    loading={approvingId === id}
                    className="bf-btn bf-btn--success"
                  />
                </Tooltip>
              </Popconfirm>
            )}
            {showReject && (
              <Tooltip title="Refuser (motif obligatoire)">
                <Button
                  danger
                  size="small"
                  icon={<CloseCircleOutlined />}
                  loading={approvingId === id}
                  onClick={() => onReject(r)}
                />
              </Tooltip>
            )}
            <Tooltip title="Email CUP">
              <Button
                size="small"
                icon={<MailOutlined />}
                onClick={() => onOpenMail(r)}
                className="bf-iconbtn bf-iconbtn--mail"
              />
            </Tooltip>
            {canEdit && (
              <Tooltip title="Modifier">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(r)}
                  className="bf-iconbtn"
                />
              </Tooltip>
            )}
            {canDelete && (
              <Popconfirm
                title="Supprimer ?"
                onConfirm={() => onDelete(id)}
                okText="Oui"
                cancelText="Non"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Supprimer">
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    className="bf-iconbtn bf-iconbtn--danger"
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
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
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 1100 }}
        size="middle"
        loading={loading}
        className="bf-table"
      />
    </div>
  );
}
