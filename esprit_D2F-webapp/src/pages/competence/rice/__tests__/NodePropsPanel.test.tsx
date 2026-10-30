import { render, screen, fireEvent } from '@testing-library/react';
import { Form } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import NodePropsPanel from '../review/NodePropsPanel';
import type { SelectedNode } from '../review/TreeBrowser';

vi.mock('@/hooks/formation/useUpCrud', () => ({ useAllUps: () => ({ data: [] }) }));
vi.mock('@/hooks/formation/useDeptCrud', () => ({ useAllDepts: () => ({ data: [] }) }));
vi.mock('@/services/competence/CompetenceService', () => ({
  default: {
    domaine: {
      getAll: vi.fn().mockResolvedValue([
        {
          id: 12,
          code: 'INFO',
          nom: 'Informatique',
          description: 'Domaine du référentiel',
        },
      ]),
    },
  },
}));

const domaineNode: SelectedNode = {
  type: 'domaine',
  path: [0],
  data: { code: 'MT-34', nom: 'Web Sémantique', description: '' },
};

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function Harness({
  selectedNode,
  onField,
  onFields,
  setSelectedNode,
}: Readonly<{
  selectedNode: SelectedNode;
  onField: (field: string, value: unknown) => void;
  onFields: (fields: Record<string, unknown>) => void;
  setSelectedNode: (node: SelectedNode) => void;
}>) {
  const [propsForm] = Form.useForm();
  return (
    <QueryClientProvider client={queryClient}>
      <NodePropsPanel
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        propsForm={propsForm}
        mergedEnseignants={[]}
        scOptions={[]}
        handleUpdateField={onField}
        handleUpdateFields={onFields}
        handleRemoveEnseignant={vi.fn()}
        handleMoveSavoir={vi.fn()}
        deleteNode={vi.fn()}
      />
    </QueryClientProvider>
  );
}

describe('NodePropsPanel — édition du nœud Domaine', () => {
  it('affiche le code et le nom du domaine dans des champs éditables', () => {
    render(
      <Harness
        selectedNode={domaineNode}
        onField={vi.fn()}
        onFields={vi.fn()}
        setSelectedNode={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('MT-34')).toBeEnabled();
    expect(screen.getByDisplayValue('Web Sémantique')).toBeEnabled();
  });

  it('remonte chaque frappe (code, nom, description) vers l’arbre', () => {
    const onField = vi.fn();
    const { container } = render(
      <Harness
        selectedNode={domaineNode}
        onField={onField}
        onFields={vi.fn()}
        setSelectedNode={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('MT-34'), { target: { value: 'MT-35' } });
    fireEvent.change(screen.getByDisplayValue('Web Sémantique'), {
      target: { value: 'Web Sémantique et graphes' },
    });
    const description = container.querySelector('textarea');
    expect(description).not.toBeNull();
    fireEvent.change(description as HTMLTextAreaElement, {
      target: { value: 'Description modifiée' },
    });

    expect(onField).toHaveBeenCalledWith('code', 'MT-35');
    expect(onField).toHaveBeenCalledWith('nom', 'Web Sémantique et graphes');
    expect(onField).toHaveBeenCalledWith('description', 'Description modifiée');
  });

  it('propose les domaines du référentiel pour un nœud Domaine', async () => {
    const { container } = render(
      <Harness
        selectedNode={domaineNode}
        onField={vi.fn()}
        onFields={vi.fn()}
        setSelectedNode={vi.fn()}
      />,
    );

    fireEvent.mouseDown(container.querySelector('.ant-select-selector') as Element);

    expect(await screen.findByTitle('[INFO] Informatique')).toBeInTheDocument();
  });
});
