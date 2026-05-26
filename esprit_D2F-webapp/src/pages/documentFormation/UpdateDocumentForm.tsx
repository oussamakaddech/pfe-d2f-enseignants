import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Form, Input, Select, Checkbox, Upload, Button, Typography } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import "antd/dist/reset.css";
import { useUpdateDocument } from "@/hooks/document/useDocument";

const { Option } = Select;
const PATH_OPTIONS = [
  { value: "PAYEMENT", label: "PAYEMENT" },
  { value: "CNFCPP",   label: "CNFCPP" },
  { value: "DOCUMENT", label: "Autre dossier…" },
];

export default function UpdateDocumentForm({ documentData, onUpdated }) {
  const { message } = useAppNotification();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);

  useEffect(() => {
    form.setFieldsValue({
      pathType:    documentData.pathType,
      nomDocument: documentData.nomDocument,
      obligation:  documentData.obligation,
      file:        [],          // on vide l'upload existant
    });
    setFileList([]);
  }, [documentData, form]);

  const uploadProps = {
    beforeUpload: () => false,
    onChange: ({ fileList }) => setFileList(fileList.slice(-1)),
    fileList,
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        pathType:    values.pathType,
        nomDocument: values.nomDocument,
        obligation:  values.obligation,
        file:        values.file?.[0]?.originFileObj,
      };
      const { mutateAsync: updateDoc } = useUpdateDocument();
      const updatedDoc = await updateDoc({ id: documentData.idDocument, ...payload });
      message.success("Document mis à jour avec succès");
      form.resetFields();
      setFileList([]);
      onUpdated(updatedDoc);
    } catch {
      message.error("🚫 Erreur lors de la mise à jour du document.");
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
        pathType:    documentData.pathType,
        nomDocument: documentData.nomDocument,
        obligation:  documentData.obligation,
      }}
      style={{ margin: 16, padding: 16, border: "1px solid #ddd", borderRadius: 8, background: "#fafafa" }}
    >
      <Typography.Title level={5}>Modifier le document</Typography.Title>

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
        label="Nouveau fichier (optionnel)"
        valuePropName="fileList"
        getValueFromEvent={e => e?.fileList}
      >
        <Upload {...uploadProps} maxCount={1}>
          <Button icon={<UploadOutlined />}>Sélectionner fichier</Button>
        </Upload>
      </Form.Item>

      <Form.Item style={{ display: 'flex', gap: '8px' }}>
        <Button type="primary" htmlType="submit" loading={loading}>
          {loading ? "Mise à jour…" : "Sauvegarder"}
        </Button>
        <Button 
          danger 
          onClick={async () => {
            if (globalThis.confirm("Voulez-vous vraiment supprimer ce document ?")) {
              setLoading(true);
              try {
                await DocumentService.deleteDocument(documentData.idDocument);
                message.success("Document supprimé");
                onUpdated(null); // signal deletion
              } catch {
                message.error("Erreur suppression");
              } finally {
                setLoading(false);
              }
            }
          }}
        >
          Supprimer
        </Button>
      </Form.Item>
    </Form>
  );
}

UpdateDocumentForm.propTypes = {
  documentData: PropTypes.shape({
    idDocument:  PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    pathType:    PropTypes.string.isRequired,
    nomDocument: PropTypes.string.isRequired,
    obligation:  PropTypes.bool.isRequired,
  }).isRequired,
  onUpdated: PropTypes.func.isRequired,
};




