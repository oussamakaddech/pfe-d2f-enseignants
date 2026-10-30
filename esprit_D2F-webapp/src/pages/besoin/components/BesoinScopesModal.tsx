import { useEffect, useMemo, useState } from 'react';
import { Modal, Table, Button, Form, Input, Select, Space, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import useAppNotification from '@/hooks/ui/useAppNotification';
import {
  useReviewerScopes,
  useUpsertReviewerScope,
  useDeleteReviewerScope,
} from '@/hooks/besoin/useBesoins';
import type { ReviewerScope } from '@/models/besoin';

interface NamedItem {
  id: string | number;
  name?: string;
  libelle?: string;
}

interface BesoinScopesModalProps {
  open: boolean;
  ups: NamedItem[];
  departements: NamedItem[];
  onClose: () => void;
}

/**
 * Administration des périmètres validateurs (ADMIN uniquement).
 * Assigne à chaque CUP son UP et à chaque chef son département — source
 * d'autorité serveur pour le filtrage « appartient à lui ».
 */
export default function BesoinScopesModal({
  open,
  ups,
  departements,
  onClose,
}: Readonly<BesoinScopesModalProps>) {
  const { message: msgApi } = useAppNotification();
  const { data: scopes = [], isLoading, refetch } = useReviewerScopes(open);
  const upsertMut = useUpsertReviewerScope();
  const deleteMut = useDeleteReviewerScope();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const role = Form.useWatch('role', form);

  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  const upOptions = useMemo(
    () =>
      (ups ?? []).map((u) => ({
        value: String(u.id),
        label: String(u.name ?? u.libelle ?? u.id),
      })),
    [ups],
  );
  const deptOptions = useMemo(
    () =>
      (departements ?? []).map((d) => ({
        value: String(d.id),
        label: String(d.name ?? d.libelle ?? d.id),
      })),
    [departements],
  );

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await upsertMut.mutateAsync({
        username: String(values.username).trim(),
        scope: {
          role: values.role,
          upCode: values.upCode || undefined,
          departmentCode: values.departmentCode || undefined,
        },
      });
      msgApi.success('Périmètre enregistré');
      form.resetFields();
    } catch (err: unknown) {
      if ((err as { errorFields?: unknown })?.errorFields) return;
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      msgApi.error(e?.response?.data?.message ?? e?.message ?? "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (username: string) => {
    try {
      await deleteMut.mutateAsync(username);
      msgApi.success('Périmètre supprimé');
    } catch {
      msgApi.error('Erreur lors de la suppression');
    }
  };

  return (
    <Modal
      title="Périmètres des validateurs (CUP / chefs)"
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
    >
      <Table<ReviewerScope>
        dataSource={[...scopes]}
        rowKey={(r) => String(r.username)}
        loading={isLoading}
        pagination={false}
        size="small"
        style={{ marginBottom: 16 }}
        columns={[
          { title: 'Utilisateur', dataIndex: 'username' },
          { title: 'Rôle', dataIndex: 'role' },
          { title: 'UP', dataIndex: 'upCode', render: (v: string) => v || '—' },
          {
            title: 'Département',
            dataIndex: 'departmentCode',
            render: (v: string) => v || '—',
          },
          {
            title: 'Actions',
            key: 'actions',
            width: 80,
            render: (_: unknown, r: ReviewerScope) => (
              <Popconfirm
                title="Supprimer ce périmètre ?"
                onConfirm={() => handleDelete(String(r.username))}
                okText="Oui"
                cancelText="Non"
              >
                <Button danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]}
      />
      <Form form={form} layout="vertical">
        <Space align="start" wrap>
          <Form.Item
            name="username"
            label="Utilisateur (username)"
            rules={[{ required: true, message: 'Requis' }]}
            style={{ minWidth: 160 }}
          >
            <Input placeholder="ex. sbenyoussef" />
          </Form.Item>
          <Form.Item name="role" label="Rôle" rules={[{ required: true, message: 'Requis' }]}>
            <Select
              style={{ minWidth: 170 }}
              placeholder="Rôle"
              options={[
                { value: 'CUP', label: 'CUP' },
                { value: 'CHEF_DEPARTEMENT', label: 'Chef de département' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="upCode"
            label="UP"
            rules={[{ required: role === 'CUP', message: 'UP obligatoire pour un CUP' }]}
          >
            <Select
              style={{ minWidth: 150 }}
              placeholder="UP"
              allowClear
              showSearch
              optionFilterProp="label"
              options={upOptions}
            />
          </Form.Item>
          <Form.Item
            name="departmentCode"
            label="Département"
            rules={[{ required: role === 'CHEF_DEPARTEMENT', message: 'Département obligatoire' }]}
          >
            <Select
              style={{ minWidth: 150 }}
              placeholder="Département"
              allowClear
              showSearch
              optionFilterProp="label"
              options={deptOptions}
            />
          </Form.Item>
        </Space>
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button type="primary" icon={<PlusOutlined />} loading={saving} onClick={handleSave}>
            Enregistrer le périmètre
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
