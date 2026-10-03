// TreeBrowser — renders the full competence tree (domaines → compétences → sous-comps → savoirs)
// Extracted from ReviewStep.tsx for DSI 200-line compliance.

import type { ComponentProps } from 'react';
import { Button, Input, Space, Tag, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import SavoirCard from '../SavoirCard';
import { cloneDeep } from '../constants';
import type { EnseignantId, RiceEditingNom } from '@/models/competence';

type SavoirCardProps = ComponentProps<typeof SavoirCard>;

const { Text } = Typography;

export type EnseignantRef = { id?: unknown; nom?: string; prenom?: string; [key: string]: unknown };
export type SavoirNode = {
  tmpId?: string;
  code?: string;
  nom?: string;
  niveau?: string;
  type?: string;
  enseignantsSuggeres?: EnseignantId[];
  [key: string]: unknown;
};
export type SousCompNode = { code?: string; nom?: string; savoirs?: SavoirNode[] };
export type CompNode = {
  code?: string;
  nom?: string;
  savoirs?: SavoirNode[];
  sousCompetences?: SousCompNode[];
};
export type DomaineNode = { code?: string; nom?: string; competences?: CompNode[] };

export type SelectedNode = {
  type: 'domaine' | 'competence' | 'sousComp' | 'savoir';
  path: number[];
  data: Record<string, unknown>;
} | null;

export interface TreeCtx {
  treeFilteredIndices?: Record<string, Set<string>>;
  expandedDomainKeys: string[];
  setExpandedDomainKeys: React.Dispatch<React.SetStateAction<string[]>>;
  expandedCompKeys: string[];
  setExpandedCompKeys: React.Dispatch<React.SetStateAction<string[]>>;
  isEditingPath: (path: number[]) => boolean;
  markMatch: (value: string | undefined) => React.ReactNode;
  selectedNode: SelectedNode;
  setSelectedNode: (node: SelectedNode) => void;
  editingNom: RiceEditingNom | null;
  setEditingNom: React.Dispatch<React.SetStateAction<RiceEditingNom | null>>;
  commitRename: () => void;
  startRename: (path: number[], nom: string) => void;
  toggleType: SavoirCardProps['toggleType'];
  setNiveau: SavoirCardProps['setNiveau'];
  setEnseignants: SavoirCardProps['setEnseignants'];
  deleteSavoir: (...args: number[]) => void;
  openMerge: SavoirCardProps['openMerge'];
  setMergeModal: SavoirCardProps['setMergeModal'];
  onSavoirDragStart: SavoirCardProps['onSavoirDragStart'];
  onSavoirDragEnd: (e: React.DragEvent) => void;
  mergedEnseignants: EnseignantRef[];
  showInlineHint: boolean;
}

interface TreeBrowserProps {
  tree: DomaineNode[];
  ctx: TreeCtx;
}

function renderSavoirItem(
  savoir: SavoirNode,
  di: number,
  ci: number,
  sci: number,
  si: number,
  ctx: TreeCtx,
) {
  const {
    setSelectedNode,
    editingNom,
    setEditingNom,
    commitRename,
    startRename,
    toggleType,
    setNiveau,
    setEnseignants,
    deleteSavoir,
    openMerge,
    setMergeModal,
    onSavoirDragStart,
    onSavoirDragEnd,
    mergedEnseignants,
    showInlineHint,
    selectedNode,
  } = ctx;
  const isSelected =
    selectedNode?.type === 'savoir' &&
    selectedNode.path?.[0] === di &&
    selectedNode.path?.[1] === ci &&
    selectedNode.path?.[2] === sci &&
    selectedNode.path?.[3] === si;
  const savoirCardProps: SavoirCardProps = {
    // Les nœuds de revue ont code/type optionnels ; SavoirCard les affiche tels quels.
    savoir: savoir as SavoirCardProps['savoir'],
    di,
    ci,
    sci,
    si,
    editingNom,
    setEditingNom,
    commitRename,
    startRename,
    toggleType,
    setNiveau,
    setEnseignants,
    deleteSavoir,
    openMerge,
    setMergeModal,
    onSavoirDragStart,
    onSavoirDragEnd,
    isBeingDragged: false,
    allEnseignants: mergedEnseignants,
    inlineHint: showInlineHint && (savoir.enseignantsSuggeres ?? []).length === 0,
  };
  return (
    <div
      key={savoir.tmpId ?? `${di}-${ci}-${sci}-${si}`}
      role="treeitem"
      aria-selected={isSelected}
      tabIndex={0}
      className={`tree-node-row${isSelected ? ' selected' : ''}`}
      onClick={() =>
        setSelectedNode({
          type: 'savoir',
          path: [di, ci, sci, si],
          data: cloneDeep(savoir) as Record<string, unknown>,
        })
      }
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          setSelectedNode({
            type: 'savoir',
            path: [di, ci, sci, si],
            data: cloneDeep(savoir) as Record<string, unknown>,
          });
        }
      }}
    >
      <SavoirCard {...savoirCardProps} />
    </div>
  );
}

function renderSavoirsList(
  list: SavoirNode[] | undefined,
  di: number,
  ci: number,
  sci: number,
  ctx: TreeCtx,
) {
  return (
    <div className="tree-savoirs">
      {(list ?? []).map((savoir, si) => renderSavoirItem(savoir, di, ci, sci, si, ctx))}
    </div>
  );
}

function renderSousCompBlock(sc: SousCompNode, di: number, ci: number, sci: number, ctx: TreeCtx) {
  const {
    treeFilteredIndices,
    isEditingPath,
    markMatch,
    setSelectedNode,
    editingNom,
    setEditingNom,
    commitRename,
    selectedNode,
  } = ctx;
  if (treeFilteredIndices && !treeFilteredIndices.visibleSci?.has(`${di}-${ci}-${sci}`))
    return null;
  const isSelected =
    selectedNode?.type === 'sousComp' &&
    selectedNode.path?.[0] === di &&
    selectedNode.path?.[1] === ci &&
    selectedNode.path?.[2] === sci;
  return (
    <div className="tree-sous-comp" key={`sc-${di}-${ci}-${sci}`}>
      <div
        role="treeitem"
        aria-selected={isSelected}
        tabIndex={0}
        className={`tree-node-row${isSelected ? ' selected' : ''}`}
        onClick={() =>
          setSelectedNode({
            type: 'sousComp',
            path: [di, ci, sci],
            data: cloneDeep(sc) as Record<string, unknown>,
          })
        }
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setSelectedNode({
              type: 'sousComp',
              path: [di, ci, sci],
              data: cloneDeep(sc) as Record<string, unknown>,
            });
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <Space>
          <Tag color="cyan">{sc.code}</Tag>
          {isEditingPath([di, ci, sci]) ? (
            <Input
              size="small"
              value={editingNom?.value}
              onChange={(e) =>
                editingNom && setEditingNom({ ...editingNom, value: e.target.value })
              }
              onPressEnter={commitRename}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === 'Escape' && setEditingNom(null)}
              autoFocus
              style={{ width: 240 }}
            />
          ) : (
            <Text>{markMatch(sc.nom)}</Text>
          )}
          <Tag>{(sc.savoirs ?? []).length} savoirs</Tag>
        </Space>
        <Button
          size="small"
          type="text"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNode({
              type: 'sousComp',
              path: [di, ci, sci],
              data: cloneDeep(sc) as Record<string, unknown>,
            });
          }}
          icon={<EditOutlined />}
        />
      </div>
      {renderSavoirsList(sc.savoirs, di, ci, sci, ctx)}
    </div>
  );
}

function renderCompetenceBlock(comp: CompNode, di: number, ci: number, ctx: TreeCtx) {
  const {
    treeFilteredIndices,
    expandedCompKeys,
    setExpandedCompKeys,
    isEditingPath,
    markMatch,
    setSelectedNode,
    editingNom,
    setEditingNom,
    commitRename,
    selectedNode,
  } = ctx;
  if (treeFilteredIndices && !treeFilteredIndices.visibleCi?.has(`${di}-${ci}`)) return null;
  const cKey = `d-${di}-c-${ci}`;
  const cOpen = expandedCompKeys.includes(cKey);
  const isSelected =
    selectedNode?.type === 'competence' &&
    selectedNode.path?.[0] === di &&
    selectedNode.path?.[1] === ci;
  return (
    <div className="tree-competence" key={cKey}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Tag color="purple">{comp.code}</Tag>
          {isEditingPath([di, ci]) ? (
            <Input
              size="small"
              value={editingNom?.value}
              onChange={(e) =>
                editingNom && setEditingNom({ ...editingNom, value: e.target.value })
              }
              onPressEnter={commitRename}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === 'Escape' && setEditingNom(null)}
              autoFocus
              style={{ width: 260 }}
            />
          ) : (
            <Text>{markMatch(comp.nom)}</Text>
          )}
        </Space>
        <Space>
          <Tag>{(comp.sousCompetences ?? []).length} SC</Tag>
          <Tag color="geekblue">{(comp.savoirs ?? []).length} savoirs</Tag>
          <Button
            size="small"
            type="text"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedCompKeys((prev) =>
                prev.includes(cKey) ? prev.filter((k) => k !== cKey) : [...prev, cKey],
              );
            }}
          >
            {cOpen ? '▾' : '▸'}
          </Button>
          <Button
            size="small"
            type="text"
            className={isSelected ? 'selected' : ''}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedNode({
                type: 'competence',
                path: [di, ci],
                data: cloneDeep(comp) as Record<string, unknown>,
              });
            }}
            icon={<EditOutlined />}
          />
        </Space>
      </div>
      {cOpen && (
        <div className="tree-sous-comp">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
            <Space>
              <Text>Savoirs de la compétence</Text>
              <Tag>{(comp.savoirs ?? []).length} savoirs</Tag>
            </Space>
          </div>
          {renderSavoirsList(comp.savoirs, di, ci, -1, ctx)}
        </div>
      )}
      {cOpen &&
        (comp.sousCompetences ?? []).map((sc, sci) => renderSousCompBlock(sc, di, ci, sci, ctx))}
    </div>
  );
}

function renderDomainBlock(domaine: DomaineNode, di: number, ctx: TreeCtx) {
  const {
    treeFilteredIndices,
    expandedDomainKeys,
    setExpandedDomainKeys,
    isEditingPath,
    markMatch,
    setSelectedNode,
    editingNom,
    setEditingNom,
    commitRename,
    selectedNode,
  } = ctx;
  if (treeFilteredIndices && !treeFilteredIndices.visibleDi?.has(String(di))) return null;
  const dKey = `d-${di}`;
  const dOpen = expandedDomainKeys.includes(dKey);
  const isSelected = selectedNode?.type === 'domaine' && selectedNode.path?.[0] === di;
  return (
    <div key={dKey} className="tree-domaine">
      <div
        role="treeitem"
        aria-selected={isSelected}
        tabIndex={0}
        className={`tree-node-row${isSelected ? ' selected' : ''}`}
        onClick={() =>
          setSelectedNode({
            type: 'domaine',
            path: [di],
            data: cloneDeep(domaine) as Record<string, unknown>,
          })
        }
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setSelectedNode({
              type: 'domaine',
              path: [di],
              data: cloneDeep(domaine) as Record<string, unknown>,
            });
          }
        }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Space>
          <Tag color="blue">{domaine.code}</Tag>
          {isEditingPath([di]) ? (
            <Input
              size="small"
              value={editingNom?.value}
              onChange={(e) =>
                editingNom && setEditingNom({ ...editingNom, value: e.target.value })
              }
              onPressEnter={commitRename}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === 'Escape' && setEditingNom(null)}
              autoFocus
              style={{ width: 260 }}
            />
          ) : (
            <Text strong>{markMatch(domaine.nom)}</Text>
          )}
        </Space>
        <Space>
          <Tag>{(domaine.competences ?? []).length} comp</Tag>
          <Button
            size="small"
            type="text"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedDomainKeys((prev) =>
                prev.includes(dKey) ? prev.filter((k) => k !== dKey) : [...prev, dKey],
              );
            }}
          >
            {dOpen ? '▾' : '▸'}
          </Button>
          <Button
            size="small"
            type="text"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedNode({
                type: 'domaine',
                path: [di],
                data: cloneDeep(domaine) as Record<string, unknown>,
              });
            }}
            icon={<EditOutlined />}
          />
        </Space>
      </div>
      {dOpen &&
        (domaine.competences ?? []).map((comp, ci) => renderCompetenceBlock(comp, di, ci, ctx))}
    </div>
  );
}

export default function TreeBrowser({ tree, ctx }: Readonly<TreeBrowserProps>) {
  // Arbre navigable : chaque ligne sélectionnable est un `treeitem` (rôle
  // interactif) ; elle contient des champs, elle ne peut donc pas être un <button>.
  return (
    <div role="tree" aria-label="Arbre des compétences extraites">
      {(tree ?? []).map((domaine, di) => renderDomainBlock(domaine, di, ctx))}
    </div>
  );
}
