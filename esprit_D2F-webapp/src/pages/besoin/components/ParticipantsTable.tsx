/* ─────────────────────────────────────────────────────────────────────────
 * ParticipantsTable — Tableau CRUD de la liste des participants
 * (`publicCible`) : Nom complet, Email, Téléphone + ajout/édition/suppression.
 * ─────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import { Button, Input, Table, Tooltip, Popconfirm, Form } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  UserOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import {
  formatParticipantLine,
  isValidEmail,
  isValidPhone,
  normalizePhone,
  parseParticipantsText,
  participantFullName,
  type Participant,
} from '@/utils/besoin/participants';

interface ParticipantsTableProps {
  readonly value: string | null | undefined;
  readonly onAdd: (line: string) => void;
  readonly onEdit: (index: number, line: string) => void;
  readonly onRemove: (index: number) => void;
}

interface ParticipantRow extends Participant {
  readonly key: number;
}

function toRows(value: string | null | undefined): ParticipantRow[] {
  return parseParticipantsText(value).map((p, i) => ({ ...p, key: i }));
}

export default function ParticipantsTable({
  value,
  onAdd,
  onEdit,
  onRemove,
}: ParticipantsTableProps) {
  const rows = toRows(value);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const [editForm] = Form.useForm();
  const [addForm] = Form.useForm();

  const isEditing = (record: ParticipantRow) => record.key === editingKey;

  const buildNomPrenom = (fullName: string): { nom: string; prenom: string } => {
    const trimmed = fullName.trim().replace(/\s+/g, ' ');
    const [nom = '', ...rest] = trimmed.split(' ');
    return { nom, prenom: rest.join(' ').trim() };
  };

  const edit = (record: ParticipantRow) => {
    editForm.setFieldsValue({
      nomComplet: participantFullName(record),
      email: record.email,
      telephone: record.telephone,
    });
    setEditingKey(record.key);
  };

  const cancelEdit = () => setEditingKey(null);

  const saveEdit = async (key: number) => {
    try {
      const row = await editForm.validateFields();
      const idx = rows.findIndex((r) => r.key === key);
      if (idx === -1) return;
      const { nom, prenom } = buildNomPrenom(row.nomComplet || '');
      const line = formatParticipantLine({
        nom,
        prenom,
        email: row.email?.trim() || '',
        telephone: normalizePhone(row.telephone || ''),
      });
      if (line) onEdit(idx, line);
      setEditingKey(null);
    } catch {
      /* validation error */
    }
  };

  const handleAdd = async () => {
    try {
      const row = await addForm.validateFields();
      const { nom, prenom } = buildNomPrenom(row.nomComplet || '');
      const line = formatParticipantLine({
        nom,
        prenom,
        email: row.email?.trim() || '',
        telephone: normalizePhone(row.telephone || ''),
      });
      if (line) onAdd(line);
      addForm.resetFields();
      setAdding(false);
    } catch {
      /* validation error */
    }
  };

  const columns = [
    {
      title: (
        <span>
          <UserOutlined style={{ marginRight: 6 }} />
          Nom complet
        </span>
      ),
      dataIndex: 'nomComplet',
      key: 'nomComplet',
      width: 250,
      render: (_: unknown, record: ParticipantRow) => {
        if (isEditing(record)) {
          return (
            <Form form={editForm} component={false} initialValues={record}>
              <Form.Item
                name="nomComplet"
                rules={[{ required: true, message: 'Nom requis' }]}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Nom Prénom" size="small" />
              </Form.Item>
            </Form>
          );
        }
        return participantFullName(record) || '—';
      },
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
      width: 220,
      ellipsis: true,
      render: (email: string, record: ParticipantRow) => {
        if (isEditing(record)) {
          return (
            <Form.Item
              name="email"
              rules={[
                {
                  validator: (_, v) =>
                    isValidEmail(v || '')
                      ? Promise.resolve()
                      : Promise.reject(new Error('Email invalide')),
                },
              ]}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="email@esprit.tn" size="small" />
            </Form.Item>
          );
        }
        return email ? (
          <a href={`mailto:${email}`}>{email}</a>
        ) : (
          <span style={{ color: '#bfbfbf' }}>—</span>
        );
      },
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
      render: (telephone: string, record: ParticipantRow) => {
        if (isEditing(record)) {
          return (
            <Form.Item
              name="telephone"
              rules={[
                {
                  validator: (_, v) =>
                    isValidPhone(v || '')
                      ? Promise.resolve()
                      : Promise.reject(new Error('Tél. invalide')),
                },
              ]}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="+216 20 123 456" size="small" />
            </Form.Item>
          );
        }
        return telephone ? (
          <a href={`tel:${telephone.replace(/\s/g, '')}`}>{telephone}</a>
        ) : (
          <span style={{ color: '#bfbfbf' }}>—</span>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: ParticipantRow) => {
        const editable = isEditing(record);
        return editable ? (
          <span>
            <Tooltip title="Enregistrer">
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => saveEdit(record.key)}
                style={{ color: '#52c41a' }}
              />
            </Tooltip>
            <Tooltip title="Annuler">
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={cancelEdit}
                style={{ color: '#ff4d4f' }}
              />
            </Tooltip>
          </span>
        ) : (
          <span>
            <Tooltip title="Modifier">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => edit(record)}
                disabled={editingKey !== null}
              />
            </Tooltip>
            <Popconfirm
              title="Retirer ce participant ?"
              onConfirm={() => onRemove(record.key)}
              okText="Retirer"
              cancelText="Annuler"
            >
              <Tooltip title="Retirer ce participant">
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  disabled={editingKey !== null}
                />
              </Tooltip>
            </Popconfirm>
          </span>
        );
      },
    },
  ];

  return (
    <div className="bf-participants-table" style={{ marginTop: 12 }}>
      {adding ? (
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            marginBottom: 12,
            padding: 12,
            background: '#fafafa',
            borderRadius: 8,
            border: '1px dashed #d9d9d9',
          }}
        >
          <Form form={addForm} layout="inline" style={{ flex: 1, gap: 4, flexWrap: 'wrap' }}>
            <Form.Item
              name="nomComplet"
              rules={[{ required: true, message: 'Nom requis' }]}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Nom Prénom" style={{ width: 200 }} />
            </Form.Item>
            <Form.Item
              name="email"
              rules={[
                {
                  validator: (_, v) =>
                    isValidEmail(v || '')
                      ? Promise.resolve()
                      : Promise.reject(new Error('Email invalide')),
                },
              ]}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="email@esprit.tn" style={{ width: 200 }} />
            </Form.Item>
            <Form.Item
              name="telephone"
              rules={[
                {
                  validator: (_, v) =>
                    isValidPhone(v || '')
                      ? Promise.resolve()
                      : Promise.reject(new Error('Tél. invalide')),
                },
              ]}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="+216 20 123 456" style={{ width: 160 }} />
            </Form.Item>
          </Form>
          <span style={{ display: 'inline-flex', gap: 4 }}>
            <Tooltip title="Enregistrer">
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={handleAdd}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              />
            </Tooltip>
            <Tooltip title="Annuler">
              <Button
                size="small"
                icon={<CloseOutlined />}
                onClick={() => {
                  setAdding(false);
                  addForm.resetFields();
                }}
              />
            </Tooltip>
          </span>
        </div>
      ) : (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setAdding(true)}
          disabled={editingKey !== null}
          style={{ marginBottom: 12 }}
        >
          Ajouter un participant
        </Button>
      )}

      <Table<ParticipantRow>
        size="small"
        pagination={rows.length > 8 ? { pageSize: 8, showSizeChanger: false } : false}
        dataSource={rows}
        rowKey="key"
        locale={{ emptyText: 'Aucun participant — cliquez sur "Ajouter" ci-dessus' }}
        columns={columns}
      />
    </div>
  );
}
