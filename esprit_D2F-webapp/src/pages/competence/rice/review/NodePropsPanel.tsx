// NodePropsPanel — right-side properties panel for selected tree node in ReviewStep.
// Extracted from ReviewStep.tsx for DSI 200-line compliance.

import { Button, Form, Input, Popconfirm, Select, Segmented, Tag, Typography } from 'antd';
import { DeleteOutlined, UserOutlined, ApartmentOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useAllUps } from '@/hooks/formation/useUpCrud';
import { useAllDepts } from '@/hooks/formation/useDeptCrud';
import CompetenceService from '@/services/competence/CompetenceService';
import type { LookupItem } from '@/models/common';
import type { Domaine } from '@/models/competence';
import type { EnseignantRef, SelectedNode } from './TreeBrowser';
import { champsDepuisDomaine } from './domaineReferentiel';
import { TYPE_LABEL } from '../constants';

const NODE_TYPE_LABEL: Record<NonNullable<SelectedNode>['type'], string> = {
  domaine: 'Domaine',
  competence: 'Compétence',
  sousComp: 'Sous-compétence',
  savoir: 'Savoir',
};

const { Text } = Typography;

function toOptions(items: LookupItem[]) {
  return (items ?? []).map((item) => ({
    value: String(item.id),
    label: item.name ?? item.libelle ?? String(item.id),
  }));
}

interface NodePropsPanelProps {
  selectedNode: SelectedNode;
  setSelectedNode: (node: SelectedNode) => void;
  propsForm: FormInstance;
  mergedEnseignants: EnseignantRef[];
  scOptions: { label: string; value: string }[];
  handleUpdateField: (field: string, value: unknown) => void;
  /** Met à jour plusieurs champs du nœud en une fois (import d'un domaine du référentiel). */
  handleUpdateFields: (fields: Record<string, unknown>) => void;
  handleRemoveEnseignant: (id: unknown) => void;
  handleMoveSavoir: (targetPath: number[]) => void;
  deleteNode: (node: SelectedNode) => void;
  setCreateEnsTarget?: (v: { path: number[] } | null) => void;
  setCreateEnsData?: (v: { nom: string; prenom: string; mail: string } | null) => void;
  setCreateEnsModal?: (v: boolean) => void;
}

export default function NodePropsPanel({
  selectedNode,
  setSelectedNode,
  propsForm,
  mergedEnseignants,
  scOptions,
  handleUpdateField,
  handleUpdateFields,
  handleRemoveEnseignant,
  handleMoveSavoir,
  deleteNode,
  setCreateEnsTarget,
  setCreateEnsData,
  setCreateEnsModal,
}: Readonly<NodePropsPanelProps>) {
  const { data: ups = [] } = useAllUps();
  const { data: departments = [] } = useAllDepts();
  const { data: referentielDomaines, isLoading: domainesLoading } = useQuery({
    queryKey: ['rice', 'domaines-rattachement'],
    queryFn: () => CompetenceService.domaine.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  const domaines = (referentielDomaines ?? []) as Domaine[];

  // Choisir un domaine du référentiel remplit Code / Nom / Description depuis
  // ce domaine et retient le rattachement de l'import sur ce nœud.
  const handlePickDomaine = (value?: string) => {
    if (!selectedNode) return;
    if (!value) {
      handleUpdateFields({ domaineExistantId: null });
      return;
    }
    const domaine = domaines.find((d) => String(d.id) === value);
    if (!domaine) return;
    handleUpdateFields(champsDepuisDomaine(domaine, (selectedNode.data?.code as string) ?? ''));
  };

  if (!selectedNode) {
    return (
      <div className="props-panel-empty">
        <ApartmentOutlined style={{ fontSize: 64, color: 'var(--color-text-tertiary)' }} />
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <Text style={{ opacity: 0.85 }}>
            Sélectionnez un élément dans l&apos;arbre pour modifier ses propriétés
          </Text>
        </div>
      </div>
    );
  }

  const typeLabel = NODE_TYPE_LABEL[selectedNode.type];
  const title = [selectedNode.data?.code, selectedNode.data?.nom]
    .filter((v) => typeof v === 'string' && v.trim())
    .join(' · ');

  return (
    <div className="props-panel-inner">
      <div className="props-panel-head">
        <Text type="secondary" className="props-panel-kind">
          {typeLabel}
        </Text>
        <Text strong className="props-panel-title" title={title}>
          {title || 'Sans nom'}
        </Text>
      </div>

      <Form form={propsForm} layout="vertical">
        {selectedNode.type === 'domaine' && (
          <>
            <Form.Item
              label="Domaine du référentiel"
              extra="Reprend le code, le nom et la description du domaine choisi (page Référentiel des Compétences)."
            >
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                loading={domainesLoading}
                placeholder="Choisir un domaine existant"
                value={(selectedNode.data?.domaineExistantId as string) ?? undefined}
                onChange={(value) => handlePickDomaine(value)}
                options={domaines
                  .filter((d) => d.id != null)
                  .map((d) => ({
                    value: String(d.id),
                    label: `${d.code ? `[${d.code}] ` : ''}${d.nom ?? ''}`.trim(),
                  }))}
              />
            </Form.Item>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
              À l&apos;import, ce domaine RICE devient une compétence du domaine choisi : son nom
              devient le nom de la compétence, ses compétences deviennent des sous-compétences. Sans
              domaine choisi, un domaine est créé.
            </Text>
          </>
        )}

        <Form.Item
          label="Code"
          rules={[
            {
              required: true,
              min: 2,
              pattern: /^[A-Za-z0-9-]+$/,
              message: 'Code : min 2 caractères, lettres/chiffres/tirets',
            },
          ]}
        >
          <Input
            value={(selectedNode.data?.code as string) ?? ''}
            onChange={(e) => handleUpdateField('code', e.target.value)}
          />
        </Form.Item>
        <Form.Item label="Nom" rules={[{ required: true, message: 'Nom requis' }]}>
          <Input
            value={(selectedNode.data?.nom as string) ?? ''}
            onChange={(e) => handleUpdateField('nom', e.target.value)}
          />
        </Form.Item>
        <Form.Item label="Description">
          <Input.TextArea
            rows={3}
            value={(selectedNode.data?.description as string) ?? ''}
            onChange={(e) => handleUpdateField('description', e.target.value)}
          />
        </Form.Item>

        {selectedNode.type === 'savoir' && (
          <>
            <Button
              block
              type="primary"
              icon={<UserOutlined />}
              style={{ marginBottom: 12 }}
              onClick={() => {
                setCreateEnsTarget?.({ path: selectedNode.path });
                setCreateEnsData?.({ nom: '', prenom: '', mail: '' });
                setCreateEnsModal?.(true);
              }}
            >
              Créer et lier à ce savoir
            </Button>
            <Form.Item label="Type">
              <Segmented
                options={['THEORIQUE', 'PRATIQUE'].map((value) => ({
                  label: TYPE_LABEL[value],
                  value,
                }))}
                value={(selectedNode.data?.type as string) ?? 'THEORIQUE'}
                onChange={(v) => handleUpdateField('type', v)}
              />
            </Form.Item>
            <Form.Item label="Niveau">
              <Select
                value={selectedNode.data?.niveau as string}
                onChange={(v) => handleUpdateField('niveau', v)}
                options={[
                  { value: 'N1_DEBUTANT', label: 'Niveau 1' },
                  { value: 'N2_ELEMENTAIRE', label: 'Niveau 2' },
                  { value: 'N3_INTERMEDIAIRE', label: 'Niveau 3' },
                  { value: 'N4_AVANCE', label: 'Niveau 4' },
                  { value: 'N5_EXPERT', label: 'Niveau 5' },
                ]}
              />
            </Form.Item>
            <Form.Item label="Enseignants affectés">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {((selectedNode.data?.enseignantsSuggeres as unknown[]) ?? []).map((id) => {
                  const e = mergedEnseignants.find(
                    (m) => String(m.id ?? m.enseignantId) === String(id),
                  );
                  const label = e ? `${e.prenom ?? ''} ${e.nom ?? ''}`.trim() : String(id);
                  return (
                    <Tag key={String(id)} closable onClose={() => handleRemoveEnseignant(id)}>
                      {label}
                    </Tag>
                  );
                })}
              </div>
              <Select
                mode="multiple"
                placeholder="Ajouter un enseignant"
                value={(selectedNode.data?.enseignantsSuggeres as string[]) ?? []}
                onChange={(val) => handleUpdateField('enseignantsSuggeres', val)}
                options={mergedEnseignants.map((m) => ({
                  value: String(m.id ?? m.enseignantId),
                  label: `${m.prenom ?? ''} ${m.nom ?? ''}`,
                }))}
              />
            </Form.Item>
            <Form.Item label="Déplacer vers">
              <Select
                placeholder="Déplacer ce savoir vers une autre sous-compétence"
                onChange={(v) => handleMoveSavoir(JSON.parse(v) as number[])}
                options={scOptions}
              />
            </Form.Item>
          </>
        )}

        {selectedNode.type === 'competence' && (
          <>
            <Form.Item
              label="UP concernées"
              extra="Facultatif — plusieurs UP peuvent être sélectionnées."
            >
              <Select
                mode="multiple"
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Sélectionner une ou plusieurs UP"
                value={(selectedNode.data?.upIds as string[]) ?? []}
                onChange={(values) => handleUpdateField('upIds', values)}
                options={toOptions(ups)}
              />
            </Form.Item>
            <Form.Item
              label="Départements concernés"
              extra="Facultatif — plusieurs départements peuvent être sélectionnés."
            >
              <Select
                mode="multiple"
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Sélectionner un ou plusieurs départements"
                value={(selectedNode.data?.departementIds as string[]) ?? []}
                onChange={(values) => handleUpdateField('departementIds', values)}
                options={toOptions(departments)}
              />
            </Form.Item>
          </>
        )}

        {(selectedNode.type === 'competence' || selectedNode.type === 'sousComp') && (
          <Form.Item label="Codes référentiels (refCodes)">
            <Select
              mode="tags"
              tokenSeparators={[',', ' ']}
              value={(selectedNode.data?.refCodes as string[]) ?? []}
              onChange={(v) => handleUpdateField('refCodes', v)}
            />
          </Form.Item>
        )}
      </Form>

      <div className="props-panel-actions">
        <Popconfirm
          title="Supprimer ce nœud ?"
          description="Cette action supprimera aussi tous ses enfants."
          okText="Supprimer"
          cancelText="Annuler"
          okButtonProps={{ danger: true }}
          onConfirm={() => {
            deleteNode(selectedNode);
            setSelectedNode(null);
          }}
        >
          <Button danger block icon={<DeleteOutlined />}>
            Supprimer {typeLabel.toLowerCase()}
          </Button>
        </Popconfirm>
      </div>
    </div>
  );
}
