// src/components/EditProfile.jsx
import { useEffect, useState } from "react";
import { Form, Input, Button, Typography, message, Card } from "antd";
import { getProfile, editProfile } from "../../services/accountService";

const { Title } = Typography;

export default function EditProfile() {
  const [form] = Form.useForm();
  const [msgApi, contextHolder] = message.useMessage();
  const [profile, setProfile] = useState(null);

  // Chargement initial
  useEffect(() => {
    (async () => {
      try {
        const data = await getProfile();
        setProfile(data);
        form.setFieldsValue({
          userName:    data.userName,
          role:        data.role,
          email:       data.email,
          phoneNumber: data.phoneNumber,
          firstName:   data.firsName,    // mapping existant
          lastName:    data.lastName,    // ajouté si présent côté back
        });
      } catch (err) {
        msgApi.error(err.response?.data?.message || "Impossible de charger votre profil");
      }
    })();
  }, [form, msgApi]);

  const onFinish = async (values) => {
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
      await editProfile(payload);
      msgApi.success("Profil mis à jour avec succès !");
    } catch (err) {
      console.error("editProfile error", {
        status:  err.response?.status,
        data:    err.response?.data,
        request: payload,
      });
      const backendMsg =
        err.response?.data?.message ||
        JSON.stringify(err.response?.data) ||
        err.message;
      msgApi.error(backendMsg);
    }
  };

  return (
    <Card style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      {contextHolder}

      <Title level={2} style={{ textAlign: "center" }}>
        Modifier mon profil
      </Title>

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
  );
}
