import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Typography, Card, Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import useAppNotification from '@/hooks/ui/useAppNotification';
import { useResetPassword } from '@/hooks/auth/useAuthService';

const { Title, Text } = Typography;

interface ResetPasswordFormValues {
  newPassword: string;
  confirmation: string;
}

/** Page publique de réinitialisation : ouverte depuis le lien direct du mail
 *  (/reset-password?token=...), valable 15 minutes. */
function ResetPasswordPage() {
  const { message } = useAppNotification();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [submitting, setSubmitting] = useState(false);
  const { mutateAsync: resetPwd } = useResetPassword();

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    setSubmitting(true);
    try {
      await resetPwd({ confirmationKey: token, newPassword: values.newPassword });
      message.success('Mot de passe réinitialisé, connectez-vous');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Lien invalide ou expiré, refaites une demande';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
      }}
    >
      <Card style={{ width: 420, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Title level={3} style={{ textAlign: 'center' }}>
          Nouveau mot de passe
        </Title>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
          Choisissez votre nouveau mot de passe
        </Text>
        {!token ? (
          <Alert
            type="error"
            showIcon
            message="Lien invalide"
            description="Ce lien ne contient aucun token, refaites une demande depuis la page de connexion."
          />
        ) : (
          <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
            <Form.Item
              name="newPassword"
              label="Nouveau mot de passe"
              rules={[
                { required: true, message: 'Le nouveau mot de passe est requis' },
                { min: 8, message: 'Au moins 8 caractères' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Nouveau mot de passe"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="confirmation"
              label="Confirmer le mot de passe"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Veuillez confirmer le mot de passe' },
                ({ getFieldValue }) => ({
                  validator(_: unknown, value: string) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Les mots de passe ne correspondent pas'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirmer le mot de passe"
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                danger
                htmlType="submit"
                loading={submitting}
                block
                size="large"
              >
                {submitting ? 'Enregistrement…' : 'Réinitialiser'}
              </Button>
            </Form.Item>
          </Form>
        )}
      </Card>
    </div>
  );
}

export default ResetPasswordPage;
