/* eslint-disable react/prop-types */
import { AppstoreOutlined, BarsOutlined } from "@ant-design/icons";
import { Segmented } from "antd";
import ExportMenu from "./ExportMenu";

export default function ViewToolbar({ displayMode, setDisplayMode, handleExportExcel, crud, structure, stats }) {
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
