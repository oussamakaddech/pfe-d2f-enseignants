import { useState } from "react";
import { Form, Input, Select, Checkbox, Upload, Button, Typography } from "antd";
import type { UploadFile } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import "antd/dist/reset.css";
import { useCreateDocument } from "@/hooks/document/useDocument";
import type { Id } from "@/models/common";
import type { FormationDocument } from "@/models/document";

const { Option } = Select;
const PATH_OPTIONS = [
  { value: "PAYEMENT", label: "PAYEMENT" },
  { value: "CNFCPP",   label: "CNFCPP" },
  { value: "DOCUMENT", label: "Autre dossier…" },
];

interface DocumentCreateFormProps {
  formationId: Id;
  onDocumentCreated: (doc: FormationDocument) => void;
  onCancel: () => void;
}

interface DocFormValues {
  pathType: string;
  nomDocument: string;
  obligation: boolean;
  file?: UploadFile[];
}

export default function DocumentCreateForm({ formationId, onDocumentCreated, onCancel }: DocumentCreateFormProps) {
  const { message } = useAppNotification();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const { mutateAsync: createDoc } = useCreateDocument();

  const uploadProps = {
    beforeUpload: () => false,
    onChange: ({ fileList }: { fileList: UploadFile[] }) => setFileList(fileList.slice(-1)),
    fileList,
  };

  const onFinish = async (values: DocFormValues) => {
    setLoading(true);
    try {
      const payload = {
        formationId,
        pathType:    values.pathType,
        nomDocument: values.nomDocument,
        obligation:  String(values.obligation),
        file:        values.file?.[0]?.originFileObj as File,
      };
      const newDoc = await createDoc(payload);
      message.success("Document créé avec succès");
      form.resetFields();
      setFileList([]);
      onDocumentCreated(newDoc as FormationDocument);
    } catch {
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
        getValueFromEvent={e => e?.fileList}
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




