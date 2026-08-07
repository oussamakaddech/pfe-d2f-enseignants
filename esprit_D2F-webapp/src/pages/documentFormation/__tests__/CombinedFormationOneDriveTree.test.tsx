import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CombinedFormationOneDriveTree from '../CombinedFormationOneDriveTree';
import { useFormationsWithDocuments } from '@/hooks/formation/useFormations';
import { useFormationHierarchy } from '@/hooks/api/useOneDrive';

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

vi.mock('antd', () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const Base = {
    Layout: passthrough,
    Row: passthrough,
    Col: passthrough,
    Space: passthrough,
    Card: passthrough,
    Statistic: passthrough,
    Empty: passthrough,
    Table: passthrough,
    Segmented: passthrough,
    Select: passthrough,
    Tag: passthrough,
    Tooltip: passthrough,
    Drawer: passthrough,
    Form: Object.assign(passthrough, {
      useForm: () => [
        {
          validateFields: vi.fn().mockResolvedValue({}),
          resetFields: vi.fn(),
          setFieldsValue: vi.fn(),
        },
      ],
      Item: passthrough,
    }),
    Switch: passthrough,
    Upload: Object.assign(passthrough, { Dragger: passthrough, Button: passthrough }),
    Popconfirm: passthrough,
    Progress: passthrough,
    Checkbox: passthrough,
    Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <button {...props}>{children}</button>
    ),
    Typography: {
      Title: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
      Paragraph: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
      Text: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
    },
    Input: Object.assign(
      ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
        <input {...props}>{children}</input>
      ),
      {
        Search: ({
          placeholder,
          value,
          onChange,
          onSearch,
        }: {
          placeholder?: string;
          value?: string;
          onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
          onSearch?: (v: string) => void;
        }) => (
          <input
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Enter') {
                onSearch?.((event.target as HTMLInputElement).value);
              }
            }}
          />
        ),
      },
    ),
    DatePicker: {
      RangePicker: () => <div data-testid="range-picker" />,
    },
    Modal: ({ open, children }: { open?: boolean; children?: React.ReactNode }) =>
      open ? <div>{children}</div> : null,
    notification: { success: vi.fn(), error: vi.fn() },
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  };
  return Base;
});

vi.mock('@/hooks/formation/useFormations', () => ({
  useFormationsWithDocuments: vi.fn(),
}));

vi.mock('@/hooks/api/useOneDrive', () => ({
  useFormationHierarchy: vi.fn(),
}));

vi.mock('@/hooks/ui/useAppNotification', () => ({
  default: () => ({
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
    notification: { success: vi.fn(), error: vi.fn() },
    modal: { confirm: vi.fn() },
  }),
}));

vi.mock('../components/FormationListPanel', () => ({
  FormationListPanel: ({
    formations,
    onSelect,
  }: {
    formations: Array<{ idFormation: number; titreFormation: string }>;
    onSelect: (f: { idFormation: number; titreFormation: string }) => void;
  }) => (
    <div data-testid="formation-list">
      {formations.map((formation) => (
        <button key={formation.idFormation} type="button" onClick={() => onSelect(formation)}>
          {formation.titreFormation}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../components/OneDriveTreePanel', () => ({
  OneDriveTreePanel: ({
    selectedFormation,
    treeData,
    onSelectTree,
  }: {
    selectedFormation?: { titreFormation: string };
    treeData: Array<{
      key: string;
      title: string;
      raw: unknown;
      children?: Array<{ key: string; title: string; raw: unknown }>;
    }>;
    onSelectTree: (p: unknown, n: { node: { isLeaf: boolean; raw: unknown } }) => void;
  }) => (
    <div data-testid="tree-panel">
      <div>{selectedFormation ? selectedFormation.titreFormation : 'no-formation'}</div>
      {treeData.flatMap((node) =>
        (node.children ?? []).map((child) => (
          <button
            key={child.key}
            type="button"
            onClick={() => onSelectTree([], { node: { isLeaf: true, raw: child.raw } })}
          >
            {child.title}
          </button>
        )),
      )}
    </div>
  ),
}));

vi.mock('../components/FilePreviewPanel', () => ({
  FilePreviewPanel: ({
    selectedFile,
  }: {
    selectedFile?: { name: string; downloadUrl: string };
  }) => (
    <div data-testid="preview-panel">
      {selectedFile ? `${selectedFile.name}:${selectedFile.downloadUrl}` : 'empty-preview'}
    </div>
  ),
}));

vi.mock('../DocumentListModal', () => ({
  default: ({ open }: { open?: boolean }) =>
    open ? <div data-testid="documents-modal">documents-modal</div> : null,
}));

vi.mock('../DocumentUploadPanel', () => ({
  default: () => <div data-testid="upload-panel">upload-panel</div>,
}));

const formations = [
  {
    idFormation: 1,
    titreFormation: 'React Avancé',
    dateDebut: '2026-04-10T00:00:00',
    up1: { libelle: 'UP Informatique' },
    departement1: { libelle: 'Département IT' },
    documents: [{ id: 1 }, { id: 2 }],
  },
  {
    idFormation: 2,
    titreFormation: 'Gestion RH',
    dateDebut: '2026-05-20T00:00:00',
    up1: { libelle: 'UP Admin' },
    departement1: { libelle: 'Département RH' },
    documents: [],
  },
];

describe('CombinedFormationOneDriveTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useFormationsWithDocuments as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: formations,
      isLoading: false,
    });
  });

  it("monte sans lever d'erreur", () => {
    const { container } = render(<CombinedFormationOneDriveTree />, { wrapper });
    expect(container).toBeTruthy();
  });
});
