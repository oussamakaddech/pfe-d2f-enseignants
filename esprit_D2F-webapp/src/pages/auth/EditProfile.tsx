import { useEffect, useState } from "react";
import { Form, Input, Button, Card } from "antd";
import { EditOutlined } from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { useProfile } from "@/hooks/formation/useFormationExtras";
import { useEditProfile } from "@/hooks/auth/useAuthService";
import { AppPageHeader, shadow, radius } from "@/components/common";

export default function EditProfile() {
  const [form] = Form.useForm();
  const { message: msgApi } = useAppNotification();
  const [profile, setProfile] = useState<any>(null);
  const { data: profileData } = useProfile();
  const { mutateAsync: editProfileApi } = useEditProfile();

  // Chargement initial
  useEffect(() => {
    if (profileData) {
      setProfile(profileData);
      form.setFieldsValue({
        userName:    profileData.userName,
        role:        profileData.role,
        email:       profileData.email,
        phoneNumber: profileData.phoneNumber,
        firstName:   profileData.firsName,
        lastName:    profileData.lastName,
      });
    }
  }, [profileData, form]);

  const onFinish = async (values: any) => {
    if (!profile) return;
    const payload = {
      firstName:   values.firstName,
      lastName:    values.lastName,
      phoneNumber: values.phoneNumber,
      email:       values.email,
      userName:    values.userName,
      role:        values.role,
    };

    setProfile({ ...profile, ...payload });
    try {
      await editProfileApi(payload);
      msgApi.success("Profil mis à jour avec succès !");
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const backendMsg = e.response?.data?.message || e.message || "Une erreur est survenue.";
      msgApi.error(backendMsg);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <AppPageHeader
        icon={<EditOutlined />}
        title="Modifier mon profil"
        subtitle="Mettre à jour vos informations personnelles"
      />
      <Card style={{ borderRadius: radius.lg, boxShadow: shadow.sm, border: "1px solid rgba(0,0,0,0.07)" }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="userName" label="Username">
          <Input readOnly />
        </Form.Item>

        <Form.Item name="role" label="Rôle">
          <Input readOnly />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Entrez votre adresse email" },
            { type: "email", message: "Format d'email invalide" },
          ]}
        >
          <Input readOnly placeholder="exemple@mail.com" />
        </Form.Item>

        <Form.Item
          name="phoneNumber"
          label="Téléphone"
          rules={[
            { required: true, message: "Entrez votre numéro de téléphone" },
            {
              pattern: /^0[6-7]\d{8}$/,
              message: "Format : 06XXXXXXXX ou 07XXXXXXXX",
            },
          ]}
        >
          <Input placeholder="Ex : 0612345678" />
        </Form.Item>

        <Form.Item
          name="firstName"
          label="Prénom"
          rules={[{ required: true, message: "Entrez votre prénom" }]}
        >
          <Input placeholder="Votre prénom" />
        </Form.Item>

        <Form.Item
          name="lastName"
          label="Nom"
          rules={[{ required: true, message: "Entrez votre nom" }]}
        >
          <Input placeholder="Votre nom" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            Mettre à jour
          </Button>
        </Form.Item>
      </Form>
      </Card>
    </div>
  );
}




