import { Form, Input, Modal, Switch } from 'antd';
import type { FormInstance } from 'antd';
import type useCompetenceCrud from '@/hooks/competence/useCompetenceCrud';

interface DomaineModalProps {
  crud: ReturnType<typeof useCompetenceCrud>;
  domaineForm: FormInstance;
}

export default function DomaineModal({ crud, domaineForm }: Readonly<DomaineModalProps>) {
  return (
    <Modal
      forceRender
      title={crud.editingDomaine ? 'Modifier le domaine' : 'Nouveau domaine'}
      open={crud.domaineModal}
      onOk={() => crud.handleDomaineSubmit(domaineForm)}
      onCancel={() => crud.setDomaineModal(false)}
      afterClose={() => {
        domaineForm.resetFields();
        crud.setEditingDomaine(null);
      }}
      okText="Enregistrer"
      cancelText="Annuler"
    >
      <Form form={domaineForm} layout="vertical">
        <Form.Item
          name="code"
          label="Code"
          rules={[{ required: true, message: 'Code obligatoire' }]}
        >
          <Input placeholder="ex: DOM-001" />
        </Form.Item>
        <Form.Item name="nom" label="Nom" rules={[{ required: true, message: 'Nom obligatoire' }]}>
          <Input placeholder="ex: Informatique" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} placeholder="Description du domaine" />
        </Form.Item>
        <Form.Item name="actif" label="Actif" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
