import React from "react";
import { Button, Drawer, Select, DatePicker, Space, Table } from "antd";
import type { Dayjs } from "dayjs";

import type { EnseignantRef } from "../CompletedFormations";

const { Option } = Select;
const { RangePicker } = DatePicker;

interface CertificateGeneratorProps {
  drawerVisible: boolean;
  onCloseDrawer: () => void;
  pdfUrl: string | null;
  enseignants: EnseignantRef[];
  loadingEns: boolean;
  selectedEns: EnseignantRef | null;
  onSelectEns: (ens: EnseignantRef | null) => void;
  attType: string;
  onAttTypeChange: (value: string) => void;
  period: Dayjs[];
  onPeriodChange: (dates: Dayjs[]) => void;
  onGeneratePdf: () => void;
  newCertDrawerVisible: boolean;
  onCloseNewCertDrawer: () => void;
  newCertEnseignants: EnseignantRef[];
  loadingNewCertEns: boolean;
  selectedNewCertEns: EnseignantRef | null;
  onSelectNewCertEns: (ens: EnseignantRef | null) => void;
  onCreateCertificate: () => void;
}

export function CertificateGenerator({
  drawerVisible,
  onCloseDrawer,
  pdfUrl,
  enseignants,
  loadingEns,
  selectedEns,
  onSelectEns,
  attType,
  onAttTypeChange,
  period,
  onPeriodChange,
  onGeneratePdf,
  newCertDrawerVisible,
  onCloseNewCertDrawer,
  newCertEnseignants,
  loadingNewCertEns,
  selectedNewCertEns,
  onSelectNewCertEns,
  onCreateCertificate,
}: Readonly<CertificateGeneratorProps>) {
  const ensColumns = [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Nom", dataIndex: "nom", key: "nom" },
    { title: "Prénom", dataIndex: "prenom", key: "prenom" },
    { title: "Email", dataIndex: "mail", key: "mail" },
  ];

  return (
    <>
      <Drawer
        title={<span style={{ fontWeight: 600 }}>Tableau PDF</span>}
        width={pdfUrl ? 800 : 600}
        open={drawerVisible}
        onClose={onCloseDrawer}
        footer={
          !pdfUrl && (
            <div className="completed-drawer-footer">
              <Button onClick={onCloseDrawer}>Annuler</Button>
              <Button
                type="primary"
                disabled={!selectedEns || period.length !== 2}
                onClick={onGeneratePdf}
              >
                Générer PDF
              </Button>
            </div>
          )
        }
      >
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            title="PDF Tableau"
            style={{ width: "100%", height: "80vh", border: "none" }}
          />
        ) : (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Table
              title={() => "Sélectionnez le formateur"}
              dataSource={enseignants}
              columns={ensColumns}
              rowSelection={{
                type: "radio",
                selectedRowKeys: selectedEns ? [selectedEns.id as React.Key] : [],
                onChange: (_: React.Key[], rows: EnseignantRef[]) => onSelectEns(rows[0] ?? null),
              }}
              loading={loadingEns}
              pagination={{ pageSize: 5 }}
              rowKey="id"
              size="small"
            />
            <Space>
              <span>Type :</span>
              <Select value={attType} onChange={onAttTypeChange} style={{ width: 180 }}>
                <Option value="PARTICIPATION">Participation</Option>
                <Option value="ANIMATION">Animation</Option>
              </Select>
            </Space>
            <Space>
              <span>Période :</span>
              <RangePicker onChange={(dates) => onPeriodChange(dates?.filter((d): d is Dayjs => d !== null) ?? [])} />
            </Space>
          </Space>
        )}
      </Drawer>

      <Drawer
        title={<span style={{ fontWeight: 600 }}>Ajouter un Certificat</span>}
        width={400}
        open={newCertDrawerVisible}
        onClose={onCloseNewCertDrawer}
        footer={
          <div className="completed-drawer-footer">
            <Button onClick={onCloseNewCertDrawer}>Annuler</Button>
            <Button
              type="primary"
              disabled={!selectedNewCertEns}
              onClick={onCreateCertificate}
            >
              Créer certificat
            </Button>
          </div>
        }
      >
        <Table
          title={() => "Sélectionnez l'enseignant"}
          dataSource={newCertEnseignants}
          columns={ensColumns}
          rowSelection={{
            type: "radio",
            selectedRowKeys: selectedNewCertEns ? [selectedNewCertEns.id as React.Key] : [],
            onChange: (_: React.Key[], rows: EnseignantRef[]) => onSelectNewCertEns(rows[0] ?? null),
          }}
          loading={loadingNewCertEns}
          pagination={{ pageSize: 5 }}
          rowKey="id"
          size="small"
        />
      </Drawer>
    </>
  );
}
