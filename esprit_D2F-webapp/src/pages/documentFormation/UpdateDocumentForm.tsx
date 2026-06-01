import { useState, useEffect } from "react";
import { Form, Input, Select, Checkbox, Upload, Button, Typography } from "antd";
import type { UploadFile } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import "antd/dist/reset.css";
import { useUpdateDocument, useDeleteDocument } from "@/hooks/document/useDocument";
import type { FormationDocument } from "@/models/document";

const { Option } = Select;
const PATH_OPTIONS = [
  { value: "PAYEMENT", label: "PAYEMENT" },
  { value: "CNFCPP",   label: "CNFCPP" },
  { value: "DOCUMENT", label: "Autre dossier…" },
];

interface UpdateDocumentFormProps {
  documentData: FormationDocument;
  onUpdated: (doc: FormationDocument | null) => void;
}

interface DocFormValues {
  pathType: string;
  nomDocument: string;
  obligation: boolean;
  file?: UploadFile[];
}

export default function UpdateDocumentForm({ documentData, onUpdated }: Readonly<UpdateDocumentFormProps>) {
  const { message } = useAppNotification();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const { mutateAsync: updateDoc } = useUpdateDocument();
  const { mutateAsync: deleteDoc } = useDeleteDocument();

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
    onChange: ({ fileList }: { fileList: UploadFile[] }) => setFileList(fileList.slice(-1)),
    fileList,
  };

  const onFinish = async (values: DocFormValues) => {
    setLoading(true);
    try {
      const payload = {
        pathType:    values.pathType,
        nomDocument: values.nomDocument,
        obligation:  String(values.obligation),
        file:        values.file?.[0]?.originFileObj as File | undefined,
      };
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
                await deleteDoc(documentData.idDocument);
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




