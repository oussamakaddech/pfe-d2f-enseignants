import { Input, Modal, Space, Typography } from "antd";
import { UserAddOutlined } from "@ant-design/icons";

interface CreateEnseignantModalProps {
  open: boolean;
  data: { nom: string; prenom: string; mail: string };
  saving: boolean;
  onChangeData: (data: { nom: string; prenom: string; mail: string }) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const { Text } = Typography;

export default function CreateEnseignantModal({
  open, data, saving, onChangeData, onConfirm, onCancel,
}: Readonly<CreateEnseignantModalProps>) {
  return (
    <Modal
      title={<Space><UserAddOutlined /> Créer un nouvel enseignant</Space>}
      open={open}
      onCancel={onCancel}
      onOk={onConfirm}
      okText="Créer et lier"
      cancelText="Annuler"
      confirmLoading={saving}
      destroyOnHidden
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div>
          <Text strong>Prénom</Text>
          <Input
            value={data.prenom}
            onChange={(e) => onChangeData({ ...data, prenom: e.target.value })}
            placeholder="Prénom"
            style={{ marginTop: 4 }}
          />
        </div>
        <div>
          <Text strong>Nom</Text>
          <Input
            value={data.nom}
            onChange={(e) => onChangeData({ ...data, nom: e.target.value })}
            placeholder="Nom de famille"
            style={{ marginTop: 4 }}
          />
        </div>
        <div>
          <Text strong>Email</Text>
          <Input
            value={data.mail}
            onChange={(e) => onChangeData({ ...data, mail: e.target.value })}
            placeholder="email@esprit.tn"
            style={{ marginTop: 4 }}
          />
        </div>
      </Space>
    </Modal>
  );
}
