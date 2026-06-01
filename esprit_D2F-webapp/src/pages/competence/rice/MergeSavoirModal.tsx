import { Alert, Modal, Select, Space, Typography } from "antd";
import { MergeCellsOutlined } from "@ant-design/icons";

interface SavoirCoords { di: number; ci: number; sci: number; si: number; }
interface SavoirFlat extends SavoirCoords { nom?: string; label?: string; }

interface MergeSavoirModalProps {
  open: boolean;
  mergeSrc: SavoirCoords | null;
  mergeDst: SavoirCoords | null;
  allSavoirsFlat: SavoirFlat[];
  onConfirm: () => void;
  onCancel: () => void;
  onSelectDst: (coords: SavoirCoords) => void;
}

const { Text } = Typography;
const { Option } = Select;

export default function MergeSavoirModal({
  open, mergeSrc, mergeDst, allSavoirsFlat, onConfirm, onCancel, onSelectDst,
}: Readonly<MergeSavoirModalProps>) {
  return (
    <Modal
      title={<Space><MergeCellsOutlined /> Fusionner deux savoirs</Space>}
      open={open}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="Fusionner"
      cancelText="Annuler"
      okButtonProps={{ disabled: !mergeDst }}
      destroyOnHidden
    >
      <Alert
        type="warning"
        message="Le savoir source sera supprimé et ses enseignants fusionnés vers le savoir cible."
        style={{ marginBottom: 16, borderRadius: 8 }}
        showIcon
      />
      {mergeSrc && (
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ marginRight: 8 }}>Source :</Text>
          <span style={{ color: "#cf1322" }}>
            {allSavoirsFlat.find(
              (s) => s.di === mergeSrc.di && s.ci === mergeSrc.ci && s.sci === mergeSrc.sci && s.si === mergeSrc.si,
            )?.nom ?? "?"}
          </span>
        </div>
      )}
      <div>
        <Text strong>Cible :</Text>
        <Select
          showSearch
          optionFilterProp="children"
          placeholder="Rechercher et sélectionner le savoir cible..."
          style={{ width: "100%", marginTop: 8 }}
          onChange={(key: string) => {
            const [di, ci, sci, si] = key.split("|").map(Number);
            onSelectDst({ di, ci, sci, si });
          }}
        >
          {allSavoirsFlat
            .filter((s) => !(
              s.di === mergeSrc?.di && s.ci === mergeSrc?.ci &&
              s.sci === mergeSrc?.sci && s.si === mergeSrc?.si))
            .map((s) => (
              <Option key={`${s.di}|${s.ci}|${s.sci}|${s.si}`} value={`${s.di}|${s.ci}|${s.sci}|${s.si}`}>
                {s.label}
              </Option>
            ))}
        </Select>
      </div>
    </Modal>
  );
}
