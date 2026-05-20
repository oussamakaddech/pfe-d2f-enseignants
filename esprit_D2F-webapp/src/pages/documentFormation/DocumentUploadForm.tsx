// src/components/DocumentUploadForm.jsx
import { useState } from "react";
import PropTypes from "prop-types";
import { Form, Input, Select, Checkbox, Upload, Button } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import "antd/dist/reset.css";
import DocumentService from "@/services/formation/DocumentService";

const { Option } = Select;
const PATH_OPTIONS = [
  { value: "PAYEMENT", label: "PAYEMENT" },
  { value: "CNFCPP",   label: "CNFCPP" },
  { value: "DOCUMENT", label: "Autre dossier…" },
];

export default function DocumentUploadForm({ formationId, onClose, onDocumentAdded }) {
  const { message } = useAppNotification();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);

  const uploadProps = {
    beforeUpload: () => false,
    onChange: ({ fileList }) => setFileList(fileList.slice(-1)),
    fileList,
  };

  const onFinish = async (values) => {
    if (fileList.length === 0) {
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
      initialValues={{ pathType: "PAYEMENT", nomDocument: "", obligation: false }}
      style={{
        position:   "fixed",
        top:        80,
        left:       "50%",
        transform:  "translateX(-50%)",
        background: "#fff",
        padding:    24,
        border:     "1px solid #ccc",
        borderRadius: 10,
        zIndex:     1000,
      }}
    >
      <Form.Item name="pathType" label="Dossier cible" rules={[{ required: true }]}>
        <Select getPopupContainer={trigger => trigger.parentNode}>
          {PATH_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
        </Select>
      </Form.Item>

      <Form.Item name="nomDocument" label="Nom du document" rules={[{ required: true }]}>
        <Input placeholder="Ex : Plan de cours, Présentation…" />
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
          {loading ? "En cours…" : "Envoyer"}
        </Button>
        <Button style={{ marginLeft: 8 }} onClick={onClose}>
          Fermer
        </Button>
      </Form.Item>
    </Form>
  );
}

DocumentUploadForm.propTypes = {
  formationId:     PropTypes.number.isRequired,
  onClose:         PropTypes.func.isRequired,
  onDocumentAdded: PropTypes.func.isRequired,
};




