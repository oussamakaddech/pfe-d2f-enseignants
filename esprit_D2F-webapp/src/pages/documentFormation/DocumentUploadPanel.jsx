// src/components/DocumentUploadPanel.jsx
import  { useState } from "react";
import PropTypes from "prop-types";
import {
  Form,
  Input,
  Select,
  Checkbox,
  Upload,
  Button,
  message,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import DocumentService from "../../services/DocumentService";

const { Option } = Select;
const PATH_OPTIONS = [
  { value: "PAYEMENT", label: "PAYEMENT" },
  { value: "CNFCPP",   label: "CNFCPP" },
  { value: "DOCUMENT", label: "Autre dossier…" },
];

export default function DocumentUploadPanel({
  formationId,
  onDocumentAdded,
  onClose,
}) {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);

  const uploadProps = {
    beforeUpload: () => false,
    onChange: ({ fileList }) => setFileList(fileList.slice(-1)),
    fileList,
  };

  const onFinish = async (values) => {
    if (!fileList.length) {
      return message.error("Veuillez sélectionner un fichier.");
    }
    setLoading(true);
    try {
      const payload = {
        formationId,
        pathType:    values.pathType,
        nomDocument: values.nomDocument,
        obligation:  values.obligation,
        file:        fileList[0].originFileObj,
      };
      const newDoc = await DocumentService.createDocument(payload);
      message.success("Document ajouté avec succès");
      form.resetFields();
      setFileList([]);
      onDocumentAdded(newDoc);
      onClose();
    } catch (err) {
      console.error(err);
      message.error("🚫 Erreur lors de l’ajout du document.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        pathType:   "PAYEMENT",
        nomDocument: "",
        obligation: false,
      }}
    >
      <Form.Item
        name="pathType"
        label="Dossier cible"
        rules={[{ required: true, message: "Sélectionnez un dossier cible" }]}
      >
        <Select>
          {PATH_OPTIONS.map((o) => (
            <Option key={o.value} value={o.value}>
              {o.label}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="nomDocument"
        label="Nom du document"
        rules={[{ required: true, message: "Saisissez le nom du document" }]}
      >
        <Input placeholder="Ex : Plan de cours, Présentation…" />
      </Form.Item>

      <Form.Item name="obligation" valuePropName="checked">
        <Checkbox>Document obligatoire</Checkbox>
      </Form.Item>

      <Form.Item
        name="file"
        label="Fichier"
        valuePropName="fileList"
        getValueFromEvent={(e) => e && e.fileList}
        rules={[{ required: true, message: "Veuillez sélectionner un fichier." }]}
      >
        <Upload {...uploadProps} maxCount={1}>
          <Button icon={<UploadOutlined />}>Sélectionnez le fichier</Button>
        </Upload>
      </Form.Item>

      <Form.Item style={{ textAlign: "right" }}>
        <Button onClick={onClose} style={{ marginRight: 8 }}>
          Annuler
        </Button>
        <Button type="primary" htmlType="submit" loading={loading}>
          {loading ? "Envoi…" : "Envoyer"}
        </Button>
      </Form.Item>
    </Form>
  );
}

DocumentUploadPanel.propTypes = {
  formationId:     PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  onDocumentAdded: PropTypes.func.isRequired,
  onClose:         PropTypes.func.isRequired,
};
