import { Button, Form, Input, Select, Space } from "antd";
import PropTypes from "prop-types";

export default function EnseignantCreateForm({
  defaultPrenom,
  defaultNom,
  defaultDepartement,
  onSubmit,
  loading,
}) {
  const [form] = Form.useForm();

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        prenom: defaultPrenom || "",
        nom: defaultNom || "",
        email: "",
        departement: defaultDepartement || "gc",
      }}
      onFinish={onSubmit}
    >
      <Space wrap style={{ width: "100%" }}>
        <Form.Item
          name="prenom"
          label="Prénom"
          rules={[{ required: true, message: "Prénom obligatoire" }]}
          style={{ minWidth: 140, marginBottom: 8 }}
        >
          <Input size="small" />
        </Form.Item>

        <Form.Item
          name="nom"
          label="Nom"
          rules={[{ required: true, message: "Nom obligatoire" }]}
          style={{ minWidth: 140, marginBottom: 8 }}
        >
          <Input size="small" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          style={{ minWidth: 200, marginBottom: 8 }}
        >
          <Input size="small" />
        </Form.Item>

        <Form.Item
          name="departement"
          label="Département"
          style={{ minWidth: 130, marginBottom: 8 }}
        >
          <Select
            size="small"
            options={[
              { value: "gc", label: "GC" },
              { value: "info", label: "INFO" },
              { value: "ge", label: "GE" },
              { value: "telecom", label: "TELECOM" },
              { value: "meca", label: "MECA" },
            ]}
          />
        </Form.Item>
      </Space>

      <Button htmlType="submit" type="primary" size="small" loading={loading}>
        Créer
      </Button>
    </Form>
  );
}

EnseignantCreateForm.propTypes = {
  defaultPrenom: PropTypes.string,
  defaultNom: PropTypes.string,
  defaultDepartement: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};
