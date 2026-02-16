// src/components/DocumentCreateForm.jsx
import { useState } from "react";
import PropTypes from "prop-types";
import { Form, Input, Select, Checkbox, Upload, Button, Typography, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import "antd/dist/reset.css";
import DocumentService from "../../services/DocumentService";

const { Option } = Select;
const PATH_OPTIONS = [
  { value: "PAYEMENT", label: "PAYEMENT" },
  { value: "CNFCPP",   label: "CNFCPP" },
  { value: "DOCUMENT", label: "Autre dossier…" },
];

export default function DocumentCreateForm({ formationId, onDocumentCreated, onCancel }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);

  const uploadProps = {
    beforeUpload: () => false,
    onChange: ({ fileList }) => setFileList(fileList.slice(-1)),
    fileList,
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        formationId,
        pathType:    values.pathType,
        nomDocument: values.nomDocument,
        obligation:  values.obligation,
        file:        values.file[0].originFileObj,
      };
      const newDoc = await DocumentService.createDocument(payload);
      message.success("Document créé avec succès");
      form.resetFields();
      setFileList([]);
      onDocumentCreated(newDoc);
    } catch (err) {
      console.error(err);
      message.error("🚫 Erreur lors de la création du document.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{ pathType: "PAYEMENT", nomDocument: "", obligation: false }}
      style={{ margin: 16, padding: 16, border: "1px solid #ddd", borderRadius: 8, background: "#fafafa" }}
    >
      <Typography.Title level={5}>Ajouter un nouveau document</Typography.Title>

      <Form.Item name="pathType" label="Dossier cible" rules={[{ required: true }]}>
        <Select getPopupContainer={trigger => trigger.parentNode}>
          {PATH_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
        </Select>
      </Form.Item>

      <Form.Item name="nomDocument" label="Nom du document" rules={[{ required: true }]}>
        <Input />
      </Form.Item>

      <Form.Item name="obligation" valuePropName="checked">
        <Checkbox>Document obligatoire</Checkbox>
      </Form.Item>

      <Form.Item
        name="file"
        label="Fichier"
        valuePropName="fileList"
        getValueFromEvent={e => e && e.fileList}
        rules={[{ required: true }]}
      >
        <Upload {...uploadProps} maxCount={1}>
          <Button icon={<UploadOutlined />}>Sélectionner fichier</Button>
        </Upload>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          {loading ? "Création…" : "Ajouter"}
        </Button>
        <Button style={{ marginLeft: 8 }} onClick={() => { form.resetFields(); setFileList([]); onCancel(); }}>
          Annuler
        </Button>
      </Form.Item>
    </Form>
  );
}

DocumentCreateForm.propTypes = {
  formationId:       PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  onDocumentCreated: PropTypes.func.isRequired,
  onCancel:          PropTypes.func.isRequired,
};
