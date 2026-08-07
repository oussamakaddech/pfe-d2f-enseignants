import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Table,
  Input,
  Button,
  Space,
  Tag,
  Tooltip,
  Select,
  Breadcrumb,
  Skeleton,
  Result,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  FileTextOutlined,
  FilterOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { AppPageHeader, EmptyState } from '@/components/common';
import { DocFileIcon } from '@/pages/documentFormation/components/DocFileIcon';
import type { FormationDocument } from '@/models/document';
import { useFormationsWithDocuments } from '@/hooks/formation';
import { useDownloadDocument } from '@/hooks/document';
import useAppNotification from '@/hooks/ui/useAppNotification';
import '@/styles/pages/documents-page.css';

const { Option } = Select;

function fileLabel(doc: FormationDocument): string {
  if (doc.originalFileName) return doc.originalFileName;
  if (doc.filePath) {
    const parts = doc.filePath.split(/[/\\]/);
    const last = parts.at(-1);
    if (last) return last;
  }
  return doc.nomDocument || 'Document';
}

export default function DocumentsPage() {
  const navigate = useNavigate();
  const { formationId } = useParams<{ formationId: string }>();
  const { message: msgApi } = useAppNotification();

  const { data: formationsWithDocs = [], isLoading } = useFormationsWithDocuments();
  const download = useDownloadDocument();

  const formation = useMemo(() => {
    if (!formationId) return null;
    return formationsWithDocs.find((f) => String(f.idFormation) === String(formationId)) ?? null;
  }, [formationsWithDocs, formationId]);

  const documents = useMemo<FormationDocument[]>(() => formation?.documents ?? [], [formation]);

  const [search, setSearch] = useState('');
  const [pathTypeFilter, setPathTypeFilter] = useState<string | undefined>();
  const [obligationFilter, setObligationFilter] = useState<string | undefined>();

  const pathTypeOptions = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => d.pathType && set.add(d.pathType));
    return Array.from(set);
  }, [documents]);

  const filtered = useMemo(() => {
    let res = [...documents];
    if (search) {
      const q = search.toLowerCase();
      res = res.filter((d) => {
        const label = (d.nomDocument || fileLabel(d) || '').toLowerCase();
        return label.includes(q);
      });
    }
    if (pathTypeFilter) res = res.filter((d) => d.pathType === pathTypeFilter);
    if (obligationFilter === 'oui') res = res.filter((d) => d.obligation === true);
    if (obligationFilter === 'non') res = res.filter((d) => !d.obligation);
    return res;
  }, [documents, search, pathTypeFilter, obligationFilter]);

  const totalCount = documents.length;
  const obligCount = documents.filter((d) => d.obligation).length;
  const docPlural = totalCount === 1 ? '' : 's';
  const obligPlural = obligCount === 1 ? '' : 's';

  const handleDownload = async (doc: FormationDocument) => {
    try {
      await download.mutateAsync(doc.idDocument);
      msgApi.success('Téléchargement lancé');
    } catch {
      msgApi.error('Échec du téléchargement du document');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setPathTypeFilter(undefined);
    setObligationFilter(undefined);
  };

  const hasActiveFilters = !!search || !!pathTypeFilter || !!obligationFilter;

  const columns: TableColumnsType<FormationDocument> = [
    {
      title: 'Document',
      key: 'name',
      render: (_, d) => {
        const label = d.nomDocument || fileLabel(d);
        return (
          <div className="documents-page-cell-name">
            <span className="documents-page-cell-icon">
              <DocFileIcon name={label} />
            </span>
            <div className="documents-page-cell-text">
              <div className="documents-page-cell-title">{label}</div>
              {d.originalFileName && d.nomDocument && d.originalFileName !== d.nomDocument && (
                <div className="documents-page-cell-subtitle">{d.originalFileName}</div>
              )}
            </div>
          </div>
        );
      },
      sorter: (a, b) =>
        (a.nomDocument || fileLabel(a)).localeCompare(b.nomDocument || fileLabel(b)),
    },
    {
      title: 'Type',
      dataIndex: 'pathType',
      key: 'pathType',
      width: 140,
      render: (t?: string) =>
        t ? <Tag className="documents-page-pathtype-tag">{t}</Tag> : <Tag>—</Tag>,
      sorter: (a, b) => (a.pathType || '').localeCompare(b.pathType || ''),
    },
    {
      title: 'Obligatoire',
      dataIndex: 'obligation',
      key: 'obligation',
      width: 130,
      align: 'center' as const,
      render: (v?: boolean) =>
        v ? (
          <Tag color="red" className="documents-page-oblig-tag">
            Obligatoire
          </Tag>
        ) : (
          <Tag className="documents-page-optional-tag">Optionnel</Tag>
        ),
      sorter: (a, b) => Number(!!a.obligation) - Number(!!b.obligation),
    },
    {
      title: "Date d'ajout",
      dataIndex: 'date',
      key: 'date',
      width: 150,
      render: (v?: string) => (
        <span className="documents-page-date-cell">{v ? dayjs(v).format('DD/MM/YYYY') : '—'}</span>
      ),
      sorter: (a, b) => dayjs(a.date || 0).valueOf() - dayjs(b.date || 0).valueOf(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      align: 'center' as const,
      render: (_, d) => (
        <Space size={4}>
          <Tooltip title="Télécharger">
            <Button
              type="text"
              shape="circle"
              icon={<DownloadOutlined />}
              loading={download.isPending && download.variables === d.idDocument}
              onClick={() => void handleDownload(d)}
              className="documents-page-btn-download"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (!formationId) {
    return (
      <Result
        status="404"
        title="Formation introuvable"
        subTitle="Aucun identifiant de formation fourni."
        extra={
          <Button type="primary" onClick={() => navigate('/home/Formation/Consulter')}>
            Retour au catalogue
          </Button>
        }
      />
    );
  }

  return (
    <div className="documents-page">
      <Breadcrumb
        className="documents-page-breadcrumb"
        items={[
          { title: <Link to="/home/Formation/Consulter">Catalogue des formations</Link> },
          {
            title: formation?.titreFormation || `Formation #${formationId}`,
          },
          { title: 'Documents' },
        ]}
      />

      <AppPageHeader
        icon={<FolderOpenOutlined />}
        title={formation?.titreFormation || `Documents — Formation #${formationId}`}
        subtitle={
          isLoading
            ? 'Chargement...'
            : `${totalCount} document${docPlural} · ${obligCount} obligatoire${obligPlural}`
        }
        actions={
          <Space size={8}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/home/Formation/Consulter')}
              className="documents-page-btn-back"
            >
              Retour
            </Button>
          </Space>
        }
      />

      {(() => {
        if (isLoading)
          return (
            <div className="documents-page-skeleton">
              <Skeleton active paragraph={{ rows: 8 }} />
            </div>
          );
        if (!formation)
          return (
            <EmptyState
              icon={<FileTextOutlined />}
              title="Formation introuvable"
              description="Cette formation n'existe pas ou n'est pas accessible."
              action={{
                label: 'Retour au catalogue',
                onClick: () => {
                  navigate('/home/Formation/Consulter');
                },
              }}
            />
          );
        return (
          <>
            <div className="documents-page-filter-bar">
              <div className="documents-page-filter-header">
                <div className="documents-page-filter-title">
                  <FilterOutlined />
                  Filtres
                  {hasActiveFilters && <span className="documents-page-filter-active-dot" />}
                </div>
                {hasActiveFilters && (
                  <Button
                    type="link"
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={resetFilters}
                    style={{ fontSize: 12, padding: '0 4px' }}
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>

              <div className="documents-page-filter-row">
                <Input
                  prefix={<SearchOutlined style={{ color: '#a0aec0' }} />}
                  placeholder="Rechercher un document..."
                  allowClear
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 260 }}
                />
                <Select
                  placeholder="Type de chemin"
                  allowClear
                  value={pathTypeFilter}
                  onChange={setPathTypeFilter}
                  style={{ width: 180 }}
                >
                  {pathTypeOptions.map((p) => (
                    <Option key={p} value={p}>
                      {p}
                    </Option>
                  ))}
                </Select>
                <Select
                  placeholder="Obligation"
                  allowClear
                  value={obligationFilter}
                  onChange={setObligationFilter}
                  style={{ width: 160 }}
                >
                  <Option value="oui">Obligatoire</Option>
                  <Option value="non">Optionnel</Option>
                </Select>
              </div>
            </div>

            <div className="documents-page-table-wrapper">
              <Table<FormationDocument>
                dataSource={filtered}
                columns={columns}
                rowKey="idDocument"
                size="middle"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (t) => `${t} document${t === 1 ? '' : 's'}`,
                }}
                locale={{
                  emptyText: (
                    <EmptyState
                      icon={<FileTextOutlined />}
                      title="Aucun document"
                      description={
                        hasActiveFilters
                          ? 'Aucun résultat ne correspond aux filtres appliqués.'
                          : 'Cette formation ne contient aucun document.'
                      }
                      action={
                        hasActiveFilters
                          ? { label: 'Effacer les filtres', onClick: resetFilters }
                          : undefined
                      }
                      compact
                    />
                  ),
                }}
              />
            </div>
          </>
        );
      })()}
    </div>
  );
}
