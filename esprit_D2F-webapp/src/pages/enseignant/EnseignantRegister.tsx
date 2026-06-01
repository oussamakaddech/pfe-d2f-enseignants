import  { useEffect, useState } from 'react';
import { Card, Form, Input, Select, Button, Typography } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useRegister } from "@/hooks/auth/useRegister";
import type { RegisterFormValues } from "@/hooks/auth/useRegister";

const { Title } = Typography;
const { Option } = Select;

interface EnseignantRegisterProps {
  initialValues?: {
    id?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    phoneNumber?: string;
  };
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export default function EnseignantRegister({ initialValues = {}, onSuccess, onError }: Readonly<EnseignantRegisterProps>) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { register } = useRegister();

  const id = initialValues.id || '';
  const username = initialValues.username || '';
  const firstName = initialValues.firstName || '';
  const lastName = initialValues.lastName || '';
  const email = initialValues.email || '';
  const role = initialValues.role || 'Formateur';
  const phoneNumber = initialValues.phoneNumber || '';

  useEffect(() => {
    form.setFieldsValue({
      id,
      username,
      firstName,
      lastName,
      email,
      role,
      phoneNumber,
    });
  }, [form, id, username, firstName, lastName, email, role, phoneNumber]);

  const onFinish = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      await register(values);
      onSuccess?.();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message || "Erreur lors de l'inscription.";
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="borderless" style={{ width: '100%' }}>
      <Title level={4}>Inscription Enseignant</Title>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>

        <Form.Item label="Prénom" name="firstName">
          <Input disabled />
        </Form.Item>
        <Form.Item label="Nom" name="lastName">
          <Input disabled />
        </Form.Item>
        <Form.Item label="Email" name="email">
          <Input disabled prefix={<MailOutlined />} />
        </Form.Item>

        <Form.Item
          name="username"
          label={<><UserOutlined /> Nom d'utilisateur</>}
          rules={[{ required: true, message: "Entrez un nom d'utilisateur" }]}
        >
          <Input placeholder="Username" />
        </Form.Item>

        <Form.Item
          name="password"
          label={<><LockOutlined /> Mot de passe</>}
          rules={[{ required: true, message: "Entrez un mot de passe" }]}
        >
          <Input.Password placeholder="••••••••" />
        </Form.Item>

        <Form.Item
          name="phoneNumber"
          label={<><PhoneOutlined /> Téléphone</>}
          rules={[{ required: true, message: "Entrez un numéro de téléphone" }]}
        >
          <Input placeholder="06XXXXXXXX" />
        </Form.Item>

        <Form.Item
          name="role"
          label={<><InfoCircleOutlined /> Rôle</>}
          rules={[{ required: true, message: "Sélectionnez un rôle" }]}
        >
          <Select>
            <Option value="admin">Admin</Option>
            <Option value="D2F">D2F</Option>
            <Option value="CUP">CUP</Option>
            <Option value="Formateur">Formateur</Option>
            <Option value="CHEF_DEPARTEMENT">Chef Département</Option>
            <Option value="RESPONSABLE_DOSSIER">Responsable Dossier</Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%' }}>
            Créer le compte
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}









