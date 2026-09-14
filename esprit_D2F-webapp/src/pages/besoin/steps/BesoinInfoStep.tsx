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
import ParticipantsTable from '@/pages/besoin/components/ParticipantsTable';
import { parseParticipantBlocks } from '@/utils/besoin/participants';
import type { LookupItem } from '@/models/common';

const { Option } = Select;

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

/** Aperçu tabulaire synchronisé avec le champ `publicCible` + CRUD complet. */
function ParticipantsPreview() {
  const form = Form.useFormInstance();
  const publicCible = Form.useWatch('publicCible', form) as string | undefined;

  const updatePublicCible = (newLines: string[]) => {
    form.setFieldsValue({ publicCible: newLines.filter(Boolean).join('\n') });
  };

  const handleAdd = (line: string) => {
    const current = String(publicCible || '').trim();
    updatePublicCible([current, line].filter(Boolean));
  };

  const handleEdit = (index: number, line: string) => {
    // Remplace le bloc ENTIER (1 ou 3 lignes) par la ligne canonique :
    // le format multi-lignes s'auto-normalise à la première édition.
    const lines = String(publicCible || '').split(/\r?\n/);
    const target = parseParticipantBlocks(publicCible)[index];
    if (target == null) return;
    updatePublicCible([...lines.slice(0, target.start), line, ...lines.slice(target.end)]);
  };

  const handleRemove = (index: number) => {
    // Supprime le bloc ENTIER (jamais de lignes email/téléphone orphelines).
    const lines = String(publicCible || '').split(/\r?\n/);
    const target = parseParticipantBlocks(publicCible)[index];
    if (target == null) return;
    updatePublicCible([...lines.slice(0, target.start), ...lines.slice(target.end)]);
  };

  return (
    <ParticipantsTable
      value={publicCible}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onRemove={handleRemove}
    />
  );
}

export default function BesoinInfoStep({
  ups,
  departements,
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

      <SectionLabel
        icon={<TeamOutlined />}
        title="Liste des participants"
        hint="Ajoutez les enseignants qui participeront à cette formation"
      />
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
        <ParticipantsPreview />
      </div>
    </div>
  );
}
