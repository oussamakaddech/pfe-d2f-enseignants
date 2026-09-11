/* ─────────────────────────────────────────────────────────────────────────
 * BesoinInfoStep — Step 0: Contexte (UP, département, type, participants)
 * ─────────────────────────────────────────────────────────────────────── */

import { Form, Select, Button, Tag, Input } from 'antd';
import {
  ApartmentOutlined,
  BookOutlined,
  TeamOutlined,
  UserOutlined,
  UploadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import SectionLabel from '@/components/besoin/SectionLabel';
import ChoiceCardGroup from '@/components/besoin/ChoiceCardGroup';
import type { LookupItem } from '@/models/common';

const { Option } = Select;
const { TextArea } = Input;

const typeOptions = [
  {
    value: 'INDIVIDUEL',
    label: 'Individuel',
    description: 'Une seule personne concernée par cette formation',
    icon: <UserOutlined />,
    accent: '#2563eb',
    accentBg: '#eff6ff',
  },
  {
    value: 'COLLECTIF',
    label: 'Collectif',
    description: 'Plusieurs participants regroupés sur une même session',
    icon: <TeamOutlined />,
    accent: '#7c3aed',
    accentBg: '#f5f3ff',
  },
];

interface BesoinInfoStepProps {
  ups: LookupItem[];
  departements: LookupItem[];
  canManageParticipants: boolean;
  participantsCount: number;
  lastImportCount: number;
  participantsFileInputRef: React.RefObject<HTMLInputElement | null>;
  onImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearParticipants: () => void;
  /** Verrous workflow : type / UP / département imposés par le rôle + périmètre. */
  lockedType?: string | null;
  lockedUp?: string | null;
  lockedDepartement?: string | null;
  /** Bandeau affiché quand le périmètre validateur est absent (création 403). */
  scopeMissing?: boolean;
}

const LOCKED_TYPE_LABELS: Record<string, string> = {
  INDIVIDUEL: 'Individuel (verrouillé : enseignant)',
  COLLECTIF: 'Collectif (verrouillé : validateur)',
};

export default function BesoinInfoStep({
  ups,
  departements,
  canManageParticipants,
  participantsCount,
  lastImportCount,
  participantsFileInputRef,
  onImportExcel,
  onClearParticipants,
  lockedType = null,
  lockedUp = null,
  lockedDepartement = null,
  scopeMissing = false,
}: Readonly<BesoinInfoStepProps>) {
  return (
    <div className="bf-step">
      <SectionLabel
        icon={<ApartmentOutlined />}
        title="Identification de la demande"
        hint="Précisez l'unité pédagogique et le département concernés"
      />
      {scopeMissing && (
        <div style={{ marginBottom: 16 }}>
          <Tag color="warning">
            Périmètre validateur non configuré — contactez l&apos;administrateur avant de créer un
            besoin collectif.
          </Tag>
        </div>
      )}
      <div className="ant-row" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 45%' }}>
          <Form.Item
            label="Unité Pédagogique (UP)"
            name="up"
            rules={[{ required: true, message: "Sélectionnez l'UP" }]}
          >
            <Select
              placeholder={lockedUp ? `UP verrouillée : ${lockedUp}` : "Sélectionner l'UP"}
              size="large"
              showSearch
              optionFilterProp="children"
              disabled={!!lockedUp}
            >
              {ups.map((u) => (
                <Option key={u.id} value={String(u.id)}>
                  {u.name || u.libelle}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>
        <div style={{ flex: '1 1 45%' }}>
          <Form.Item
            label="Département"
            name="departement"
            rules={[{ required: true, message: 'Sélectionnez le département' }]}
          >
            <Select
              placeholder={
                lockedDepartement
                  ? `Département verrouillé : ${lockedDepartement}`
                  : 'Sélectionner le département'
              }
              size="large"
              showSearch
              optionFilterProp="children"
              disabled={!!lockedDepartement}
            >
              {departements.map((d) => (
                <Option key={d.id} value={String(d.id)}>
                  {d.name || d.libelle}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>
      </div>

      <SectionLabel
        icon={<BookOutlined />}
        title="Nature du besoin"
        hint="Une formation pour un enseignant ou un groupe ?"
      />
      {lockedType ? (
        <>
          <Form.Item name="typeBesoin" hidden rules={[{ required: true }]}>
            <Input type="hidden" />
          </Form.Item>
          <Tag color="blue" style={{ fontSize: 13, padding: '6px 12px' }}>
            {LOCKED_TYPE_LABELS[lockedType] ?? lockedType}
          </Tag>
        </>
      ) : (
        <Form.Item
          name="typeBesoin"
          rules={[{ required: true, message: 'Sélectionnez le type de besoin' }]}
        >
          <Form.Item noStyle shouldUpdate={(p, c) => p.typeBesoin !== c.typeBesoin}>
            {({ getFieldValue, setFieldsValue }) => (
              <ChoiceCardGroup
                variant="type"
                options={typeOptions}
                value={getFieldValue('typeBesoin')}
                onChange={(v) => setFieldsValue({ typeBesoin: v })}
              />
            )}
          </Form.Item>
        </Form.Item>
      )}

      <Form.Item noStyle shouldUpdate={(p, c) => p.typeBesoin !== c.typeBesoin}>
        {({ getFieldValue }) => {
          const typeBesoin = getFieldValue('typeBesoin');
          const isIndividuel = typeBesoin === 'INDIVIDUEL';
          const isCollectif = typeBesoin === 'COLLECTIF';
          const showSection = canManageParticipants || isIndividuel || isCollectif;
          if (!showSection) return null;

          let sectionTitle: string;
          let sectionHint: string;
          if (canManageParticipants) {
            sectionTitle = 'Liste des participants';
            sectionHint =
              'Optionnel — vous pouvez importer un fichier Excel ou saisir manuellement';
          } else if (isCollectif) {
            sectionTitle = 'Liste des enseignants participants';
            sectionHint = 'Ajoutez les enseignants qui participeront à cette formation collective';
          } else {
            sectionTitle = 'Autres enseignants participants';
            sectionHint = 'Optionnel — ajoutez les enseignants qui participeront avec vous';
          }

          return (
            <>
              <SectionLabel icon={<TeamOutlined />} title={sectionTitle} hint={sectionHint} />
              <Form.Item name="publicCible">
                <div className="bf-import-box">
                  <div className="bf-import-box__toolbar">
                    <Button
                      icon={<UploadOutlined />}
                      onClick={() => participantsFileInputRef.current?.click()}
                      className="bf-btn bf-btn--ghost"
                    >
                      Importer Excel
                    </Button>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={onClearParticipants}
                      disabled={participantsCount === 0}
                      className="bf-btn bf-btn--ghost"
                    >
                      Vider la liste
                    </Button>
                    <div className="bf-import-box__stats">
                      <Tag color="blue" className="bf-import-tag">
                        {participantsCount} participant{participantsCount > 1 ? 's' : ''}
                      </Tag>
                      {lastImportCount > 0 && (
                        <Tag color="green" className="bf-import-tag">
                          +{lastImportCount} importé{lastImportCount > 1 ? 's' : ''}
                        </Tag>
                      )}
                    </div>
                  </div>
                  <input
                    ref={participantsFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={onImportExcel}
                  />
                  <TextArea
                    rows={5}
                    placeholder="Un participant par ligne — format : Nom Prénom <email>"
                    showCount
                    maxLength={2000}
                    className="bf-import-textarea"
                  />
                  <div className="bf-import-box__hint">
                    Format attendu : <code>Nom Prénom &lt;email@esprit.tn&gt;</code>
                  </div>
                </div>
              </Form.Item>
            </>
          );
        }}
      </Form.Item>
    </div>
  );
}
