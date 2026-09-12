/* ─────────────────────────────────────────────────────────────────────────
 * ParticipantsTable — Aperçu tabulaire de la liste des participants
 * (`publicCible`) : Nom, Email, Téléphone + suppression par ligne.
 * ─────────────────────────────────────────────────────────────────────── */

import { Button, Empty, Table, Tooltip } from 'antd';
import { DeleteOutlined, MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
import {
  parseParticipantsText,
  participantFullName,
  type Participant,
} from '@/utils/besoin/participants';

interface ParticipantsTableProps {
  /** Contenu brut du champ `publicCible` (une ligne par participant). */
  readonly value: string | null | undefined;
  /** Retire la ligne d'index donné. */
  readonly onRemove: (index: number) => void;
}

interface ParticipantRow extends Participant {
  readonly key: number;
}

function toRows(value: string | null | undefined): ParticipantRow[] {
  return parseParticipantsText(value).map((p, i) => ({ ...p, key: i }));
}

export default function ParticipantsTable({ value, onRemove }: ParticipantsTableProps) {
  const rows = toRows(value);
  if (rows.length === 0) return null;

  return (
    <div className="bf-participants-table" style={{ marginTop: 12 }}>
      <Table<ParticipantRow>
        size="small"
        pagination={rows.length > 8 ? { pageSize: 8, showSizeChanger: false } : false}
        dataSource={rows}
        rowKey="key"
        locale={{ emptyText: <Empty description="Aucun participant" /> }}
        columns={[
          {
            title: (
              <span>
                <UserOutlined style={{ marginRight: 6 }} />
                Participant
              </span>
            ),
            dataIndex: 'nom',
            key: 'participant',
            ellipsis: true,
            render: (_, record) => participantFullName(record) || '—',
          },
          {
            title: (
              <span>
                <MailOutlined style={{ marginRight: 6 }} />
                Email
              </span>
            ),
            dataIndex: 'email',
            key: 'email',
            ellipsis: true,
            render: (email: string) =>
              email ? (
                <a href={`mailto:${email}`}>{email}</a>
              ) : (
                <span style={{ color: '#bfbfbf' }}>—</span>
              ),
          },
          {
            title: (
              <span>
                <PhoneOutlined style={{ marginRight: 6 }} />
                Téléphone
              </span>
            ),
            dataIndex: 'telephone',
            key: 'telephone',
            width: 160,
            render: (telephone: string) =>
              telephone ? (
                <a href={`tel:${telephone.replace(/\s/g, '')}`}>{telephone}</a>
              ) : (
                <span style={{ color: '#bfbfbf' }}>—</span>
              ),
          },
          {
            title: '',
            key: 'actions',
            width: 56,
            align: 'center',
            render: (_, record) => (
              <Tooltip title="Retirer ce participant">
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  aria-label={`Retirer ${participantFullName(record) || 'ce participant'}`}
                  onClick={() => onRemove(record.key)}
                />
              </Tooltip>
            ),
          },
        ]}
      />
    </div>
  );
}
