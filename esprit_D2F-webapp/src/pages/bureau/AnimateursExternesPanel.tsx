import { useState } from 'react';
import { Table, Button, Input, Modal, Form, Popconfirm, Space, Tooltip, Empty } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
  UserOutlined,
} from '@ant-design/icons';
import useAppNotification from '@/hooks/ui/useAppNotification';
import {
  useAnimateursExternes,
  useCreateAnimateurExterne,
  useUpdateAnimateurExterne,
  useDeleteAnimateurExterne,
} from '@/hooks/bureau/useAnimateursExternes';
import type { AnimateurExterne } from '@/models/bureau';

type Props = Readonly<{ bureauId: number; bureauNom: string }>;

export default function AnimateursExternesPanel({ bureauId, bureauNom }: Props) {
  const { message: msgApi } = useAppNotification();
  const { data: animateurs = [], isLoading } = useAnimateursExternes(bureauId);
  const createMut = useCreateAnimateurExterne();
  const updateMut = useUpdateAnimateurExterne();
  const deleteMut = useDeleteAnimateurExterne();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AnimateurExterne | null>(null);
  const [form] = Form.useForm();

  const saveLoading = createMut.isPending || updateMut.isPending;

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: AnimateurExterne) => {
    setEditing(record);
    form.setFieldsValue({ nom: record.nom, prenom: record.prenom, email: record.email });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await updateMut.mutateAsync({ bureauId, id: editing.id, data: values });
        msgApi.success('Animateur modifié');
      } else {
        await createMut.mutateAsync({ bureauId, data: values });
        msgApi.success('Animateur ajouté');
      }
      setModalOpen(false);
      form.resetFields();
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown; response?: { data?: { message?: string } } };
      if (e?.errorFields) return;
      msgApi.error(e?.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (record: AnimateurExterne) => {
    try {
      await deleteMut.mutateAsync({ bureauId, id: record.id });
      msgApi.success(`Animateur "${record.prenom} ${record.nom}" supprimé`);
    } catch (err: unknown) {
      msgApi.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Erreur lors de la suppression',
      );
    }
  };

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'nom',
      key: 'nom',
      render: (_: unknown, r: AnimateurExterne) => (
        <span>
          <UserOutlined style={{ marginRight: 6, color: '#a0aec0' }} />
          {r.prenom} {r.nom}
        </span>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) =>
        email ? (
          <span>
            <MailOutlined style={{ marginRight: 6, color: '#a0aec0' }} />
            {email}
          </span>
        ) : (
          <span style={{ color: '#cbd5e0' }}>—</span>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      render: (_: unknown, record: AnimateurExterne) => (
        <Space size="small">
          <Tooltip title="Modifier">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Supprimer cet animateur ?"
            description={`"${record.prenom} ${record.nom}" sera supprimé.`}
            onConfirm={() => handleDelete(record)}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Supprimer">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '8px 12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <strong style={{ fontSize: '0.9rem' }}>Animateurs externes — {bureauNom}</strong>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreate}>
          Ajouter un animateur
        </Button>
      </div>
      <Table
        size="small"
        dataSource={animateurs}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Aucun animateur pour ce bureau"
            />
          ),
        }}
      />

      <Modal
        title={editing ? "Modifier l'animateur" : 'Nouvel animateur externe'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={handleSave}
        confirmLoading={saveLoading}
        okText={editing ? 'Enregistrer' : 'Ajouter'}
        cancelText="Annuler"
        destroyOnHidden
        width={440}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="nom"
            label="Nom"
            rules={[{ required: true, message: 'Le nom est requis' }]}
          >
            <Input placeholder="Nom" />
          </Form.Item>
          <Form.Item
            name="prenom"
            label="Prénom"
            rules={[{ required: true, message: 'Le prénom est requis' }]}
          >
            <Input placeholder="Prénom" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: 'email', message: 'Email invalide' }]}
          >
            <Input
              placeholder="email@organisme.com"
              prefix={<MailOutlined style={{ color: '#cbd5e0' }} />}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
