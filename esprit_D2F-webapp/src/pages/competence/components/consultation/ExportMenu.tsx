import { useCallback, useMemo, useState } from 'react';
import { DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { Button, Dropdown, Tag } from 'antd';
import type { MenuProps } from 'antd';
import useAppNotification from '@/hooks/ui/useAppNotification';
import {
  doExportSavoirsExcel,
  doExportStructureExcel,
  doExportSynthesisExcel,
} from '@/utils/helpers/exportUtils';
import { getFilteredCrud } from '@/utils/helpers/consultationViewUtils';
import { useAllUps } from '@/hooks/formation/useUpCrud';
import { useAllDepts } from '@/hooks/formation/useDeptCrud';
import type { TreeNode } from '@/models/competence';

type CrudParam = Parameters<typeof getFilteredCrud>[0];

interface StructureState {
  selectedDomaine?: unknown;
  structure?: TreeNode[];
}

interface ExportMenuProps {
  crud: CrudParam;
  structure: StructureState;
  stats: Record<string, number> | undefined;
  handleExportExcel: () => void;
}

export default function ExportMenu({
  crud,
  structure,
  stats,
  handleExportExcel,
}: Readonly<ExportMenuProps>) {
  const [loading, setLoading] = useState(false);
  const { message: messageApi } = useAppNotification();
  // Mêmes clés react-query que la page : aucun appel réseau supplémentaire.
  const { data: ups = [] } = useAllUps();
  const { data: depts = [] } = useAllDepts();
  const lookups = useMemo(() => ({ ups, depts }), [ups, depts]);

  const domaineId = structure.selectedDomaine;
  const domaineName = useMemo(
    () =>
      domaineId ? structure.structure?.find((d) => String(d.id) === String(domaineId))?.nom : null,
    [domaineId, structure.structure],
  );

  const exportStats = useMemo(() => {
    const f = getFilteredCrud(crud, domaineId);
    return {
      domaines: f.domaines.length,
      competences: f.competences.length,
      savoirs: f.savoirs.length,
    };
  }, [crud, domaineId]);

  const run = useCallback(
    async (key: string) => {
      setLoading(true);
      try {
        localStorage.setItem('ctp-export-format', key);
        if (key === 'excel-full') doExportStructureExcel(crud, domaineId, lookups);
        else if (key === 'excel-savoirs') doExportSavoirsExcel(crud, domaineId, lookups);
        else if (key === 'excel-synthesis') doExportSynthesisExcel(crud, stats);
        else if (key === 'excel-matrix') handleExportExcel();
        messageApi.success('Export genere');
      } catch (err: unknown) {
        const e = err as { message?: string };
        messageApi.error(`Erreur export : ${e?.message || 'inconnue'}`);
      } finally {
        setLoading(false);
      }
    },
    [crud, domaineId, handleExportExcel, lookups, messageApi, stats],
  );

  const filterSuffix = domaineName ? ` — ${domaineName}` : '';

  const menuItems: MenuProps['items'] = [
    {
      type: 'group',
      label: (
        <span className="ctp-export-group-label">
          <FileExcelOutlined /> Excel
        </span>
      ),
      children: [
        {
          key: 'excel-full',
          label: (
            <span className="ctp-export-menu-item">
              <span>Structure complete{filterSuffix}</span>
              <span className="ctp-export-badge ctp-export-badge--xlsx">xlsx</span>
            </span>
          ),
        },
        {
          key: 'excel-savoirs',
          label: (
            <span className="ctp-export-menu-item">
              <span>Savoirs uniquement{filterSuffix}</span>
              <span className="ctp-export-badge ctp-export-badge--xlsx">xlsx</span>
            </span>
          ),
        },
        {
          key: 'excel-synthesis',
          label: (
            <span className="ctp-export-menu-item">
              <span>Synthese rapide</span>
              <span className="ctp-export-badge ctp-export-badge--xlsx">xlsx</span>
            </span>
          ),
        },
        {
          key: 'excel-matrix',
          label: (
            <span className="ctp-export-menu-item">
              <span>Matrice niveaux</span>
              <span className="ctp-export-badge ctp-export-badge--xlsx">xlsx</span>
            </span>
          ),
        },
      ],
    },
    { type: 'divider' },
    {
      key: '__stats__',
      disabled: true,
      label: (
        <div className="ctp-export-stats" aria-label="Donnees a exporter">
          <span>{exportStats.domaines} dom.</span>
          <span className="ctp-export-stats__sep">·</span>
          <span>{exportStats.competences} comp.</span>
          <span className="ctp-export-stats__sep">·</span>
          <span>
            {exportStats.savoirs} savoir{exportStats.savoirs === 1 ? '' : 's'}
          </span>
          {domaineName && (
            <Tag color="blue" style={{ marginLeft: 8, fontSize: 11 }}>
              filtre actif
            </Tag>
          )}
        </div>
      ),
    },
  ];

  return (
    <Dropdown
      menu={{
        items: menuItems,
        onClick: ({ key }) => {
          if (key !== '__stats__') run(key);
        },
      }}
      trigger={['click']}
      placement="bottomRight"
      aria-label="Menu d'export"
    >
      <Button icon={<DownloadOutlined />} size="middle" loading={loading}>
        Exporter <span className="ctp-export-caret">▾</span>
      </Button>
    </Dropdown>
  );
}
