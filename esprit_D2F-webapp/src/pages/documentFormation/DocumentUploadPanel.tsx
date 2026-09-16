import  { useState } from "react";
import {
  Form,
  Input,
  Select,
  Checkbox,
  Upload,
  Button,
} from "antd";
import type { UploadFile } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { useCreateDocument } from "@/hooks/document/useDocument";
import type { Id } from "@/models/common";
import type { FormationDocument } from "@/models/document";

const { Option } = Select;
const PATH_OPTIONS = [
  { value: "PAYEMENT", label: "PAYEMENT" },
  { value: "CNFCPP",   label: "CNFCPP" },
  { value: "DOCUMENT", label: "Autre dossier…" },
];

interface DocumentUploadPanelProps {
  formationId: Id;
  onDocumentAdded: (doc: FormationDocument) => void;
  onClose: () => void;
}

interface DocFormValues {
  pathType: string;
  nomDocument: string;
  obligation: boolean;
  file?: UploadFile[];
}

export default function DocumentUploadPanel({
  formationId,
  onDocumentAdded,
  onClose,
}: Readonly<DocumentUploadPanelProps>) {
  const { message } = useAppNotification();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const { mutateAsync: createDoc } = useCreateDocument();

  const uploadProps = {
    beforeUpload: () => false,
    onChange: ({ fileList }: { fileList: UploadFile[] }) => setFileList(fileList.slice(-1)),
    fileList,
  };

  const onFinish = async (values: DocFormValues) => {
    if (!fileList.length) {
      return message.error("Veuillez sélectionner un fichier.");
    }
    setLoading(true);
    try {
      const payload = {
        formationId,
        pathType:    values.pathType,
        nomDocument: values.nomDocument,
        obligation:  String(values.obligation),
        file:        fileList[0]?.originFileObj as File,
      };
      const newDoc = await createDoc(payload);
      message.success("Document ajouté avec succès");
      form.resetFields();
      setFileList([]);
      onDocumentAdded(newDoc);
      onClose();
    } catch {
      message.error("🚫 Erreur lors de l'ajout du document.");
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
        getValueFromEvent={(e) => e?.fileList}
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




