import { useState } from "react";
import { Form, Input, Button, Card } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useUpdatePassword } from "@/hooks/auth/useAuthService";
import { AppPageHeader, shadow, radius } from "@/components/common";
import useAppNotification from "@/hooks/ui/useAppNotification";

export default function UpdatePassword() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { message } = useAppNotification();
  const { mutateAsync: updatePwd } = useUpdatePassword();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await updatePwd(values);
      message.success("Mot de passe mis à jour avec succès !");
      form.resetFields();
    } catch (error: unknown) {
      message.error(error?.response?.data?.message || "Erreur lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <AppPageHeader
        icon={<LockOutlined />}
        title="Modifier le Mot de Passe"
        subtitle="Mettre à jour votre mot de passe de connexion"
      />

      <Card style={{ borderRadius: radius.lg, boxShadow: shadow.sm, border: "1px solid rgba(0,0,0,0.07)" }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="oldPassword"
            label="Ancien mot de passe"
            rules={[{ required: true, message: "L'ancien mot de passe est requis" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Ancien mot de passe" />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Nouveau mot de passe"
            rules={[
              { required: true, message: "Le nouveau mot de passe est requis" },
              { min: 6, message: "Au moins 6 caractères" },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Nouveau mot de passe" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirmer le mot de passe"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Veuillez confirmer le mot de passe" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Les mots de passe ne correspondent pas"));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirmer le mot de passe" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Mettre à jour
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}




