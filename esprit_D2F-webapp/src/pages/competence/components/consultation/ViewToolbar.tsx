import { AppstoreOutlined, BarsOutlined } from "@ant-design/icons";
import { Segmented } from "antd";
import ExportMenu from "./ExportMenu";

interface ViewToolbarProps {
  displayMode: string;
  setDisplayMode: (mode: string) => void;
  handleExportExcel: () => void;
  crud: Record<string, unknown>;
  structure: Record<string, unknown>;
  stats: Record<string, number> | undefined;
}

export default function ViewToolbar({ displayMode, setDisplayMode, handleExportExcel, crud, structure, stats }: Readonly<ViewToolbarProps>) {
  return (
    <div className="ctp-toolbar ctp-section">
      <Segmented
        value={displayMode}
        onChange={setDisplayMode}
        options={[
          { value: "cards", label: <span><AppstoreOutlined /> Par competence</span> },
          { value: "list", label: <span><BarsOutlined /> Liste</span> },
        ]}
      />

      <div className="ctp-toolbar__right">
        <ExportMenu
          crud={crud}
          structure={structure}
          stats={stats}
          handleExportExcel={handleExportExcel}
        />
      </div>
    </div>
  );
}






