// src/components/EnseignantRegister.jsx
import  { useEffect, useState } from 'react';
import { Card, Form, Input, Select, Button, Typography } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, InfoCircleOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import { signup } from '../../services/authService';

const { Title } = Typography;
const { Option } = Select;

export default function EnseignantRegister({ initialValues = {}, onSuccess, onError }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      id: initialValues.id || '',
      username: initialValues.username || '',
      firstName: initialValues.firstName || '',
      lastName: initialValues.lastName || '',
      email: initialValues.email || '',
      role: initialValues.role || 'Formateur',
      phoneNumber: initialValues.phoneNumber || '',
    });
  }, [initialValues, form]);

  const onFinish = async values => {
    setLoading(true);
    try {
      await signup(values);
      onSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de l'inscription.";
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card bordered={false} style={{ width: '100%' }}>
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

EnseignantRegister.propTypes = {
  initialValues: PropTypes.shape({
    id:          PropTypes.string,
    username:    PropTypes.string,
    firstName:   PropTypes.string,
    lastName:    PropTypes.string,
    email:       PropTypes.string,
    role:        PropTypes.string,
    phoneNumber: PropTypes.string,
  }),
  onSuccess: PropTypes.func,
  onError:   PropTypes.func,
};
