import React, { useRef, useState } from 'react';
import { Button, Input, Space, Tooltip, Popconfirm } from 'antd';
import type { InputRef } from 'antd';
import { SearchOutlined, EditOutlined, DeleteOutlined, MailOutlined } from '@ant-design/icons';

// ─── Helper renderers ────────────────────────────────────────────────────────

// Normalise le code `type` issu des fiches (import Excel = valeur brute,
// casse/accents/libellés complets possibles) vers le canonique P/V/C.
// Retourne null si la valeur est inconnue — l'appelant affiche alors la
// valeur brute dans un tag neutre au lieu d'inventer un libellé.
export function normalizeTeacherType(type: unknown): 'P' | 'V' | 'C' | null {
  const v = String(type ?? '')
    .trim()
    .toUpperCase();
  if (v === 'P' || v === 'PERMANENT' || v === 'PERMANENTE') return 'P';
  if (v === 'V' || v === 'VACATAIRE') return 'V';
  if (v === 'C' || v === 'CONTRACTUEL' || v === 'CONTRACTUELLE' || v === 'CONTRACTOR') return 'C';
  return null;
}

export const TEACHER_TYPE_LABELS: Record<'P' | 'V' | 'C', string> = {
  P: 'Permanent',
  V: 'Vacataire',
  C: 'Contractuel',
};

export const getAvatarClass = (type: string): string => {
  const norm = normalizeTeacherType(type);
  if (norm === 'P') return 'teachers-avatar teachers-avatar--perm';
  if (norm === 'V') return 'teachers-avatar teachers-avatar--vac';
  if (norm === 'C') return 'teachers-avatar teachers-avatar--cont';
  return 'teachers-avatar teachers-avatar--other';
};

export const getInitials = (nom: string, prenom: string): string => {
  const n = (nom || '').charAt(0).toUpperCase();
  const p = (prenom || '').charAt(0).toUpperCase();
  return p + n || '?';
};

export const getTypeTag = (type: string) => {
  const norm = normalizeTeacherType(type);
  if (norm === 'P')
    return (
      <span className="teachers-type-tag teachers-type-tag--perm">
        <span className="teachers-type-dot teachers-type-dot--perm" /> Permanent
      </span>
    );
  if (norm === 'V')
    return (
      <span className="teachers-type-tag teachers-type-tag--vac">
        <span className="teachers-type-dot teachers-type-dot--vac" /> Vacataire
      </span>
    );
  if (norm === 'C')
    return (
      <span className="teachers-type-tag teachers-type-tag--cont">
        <span className="teachers-type-dot teachers-type-dot--cont" /> Contractuel
      </span>
    );
  // Valeur non canonique (ex. 'T', 'A' issus d'un import) : affichée telle
  // quelle dans un tag neutre — pas de libellé inventé.
  const raw = String(type ?? '').trim();
  return (
    <span
      className="teachers-type-tag teachers-type-tag--other"
      title={`Type non référencé : ${raw || 'vide'}`}
    >
      <span className="teachers-type-dot teachers-type-dot--other" />
      {raw || '—'}
    </span>
  );
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface UseColumnsProps {
  onEdit: (record: Record<string, unknown>) => void;
  onDelete: (record: Record<string, unknown>) => void;
}

// ─── Hook: builds Ant Design column definitions ──────────────────────────────

export function useTeachersColumns({ onEdit, onDelete }: UseColumnsProps) {
  const searchInput = useRef<InputRef>(null);
  const [searchedColumn, setSearchedColumn] = useState('');

  const handleSearch = (selectedKeys: string[], confirm: () => void, dataIndex: string) => {
    confirm();
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
  };

  const getColumnSearchProps = (dataIndex: string, placeholder: string) => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }: {
      setSelectedKeys: (keys: string[]) => void;
      selectedKeys: string[];
      confirm: () => void;
      clearFilters: () => void;
    }) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInput}
          placeholder={`Rechercher ${placeholder}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Button
          type="primary"
          onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
          icon={<SearchOutlined />}
          size="small"
          style={{ width: 90, marginRight: 8 }}
        >
          OK
        </Button>
        <Button onClick={() => handleReset(clearFilters)} size="small" style={{ width: 90 }}>
          Réinitialiser
        </Button>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value: unknown, record: Record<string, unknown>) =>
      record[dataIndex]?.toString().toLowerCase().includes(String(value).toLowerCase()),
    filterDropdownProps: {
      onOpenChange: (visible: boolean) => {
        if (visible) {
          setTimeout(() => searchInput.current?.select(), 100);
        }
      },
    },
    render: (text: string) =>
      searchedColumn === dataIndex ? (
        <span style={{ backgroundColor: '#ffc069', padding: 0 }}>{text}</span>
      ) : (
        text
      ),
  });

  const columns = [
    {
      title: 'Enseignant',
      key: 'enseignant',
      sorter: (a: Record<string, string>, b: Record<string, string>) => a.nom.localeCompare(b.nom),
      sortDirections: ['ascend', 'descend'] as const,
      ...getColumnSearchProps('nom', 'Nom'),
      render: (_: unknown, record: Record<string, string>) => (
        <div className="teachers-name-cell">
          <div className={getAvatarClass(record.type)}>
            {getInitials(record.nom, record.prenom)}
          </div>
          <div>
            <div className="teachers-name-primary">
              {record.nom} {record.prenom}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
              {(record.cup === 'O' || record.cup === 'Y' || record.cup === '1') && (
                <span className="teachers-badge teachers-badge--cup">CUP</span>
              )}
              {(record.chefDepartement === 'O' ||
                record.chefDepartement === 'Y' ||
                record.chefDepartement === '1') && (
                <span className="teachers-badge teachers-badge--chef">Chef</span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      sorter: (a: Record<string, string>, b: Record<string, string>) =>
        (a.type || '').localeCompare(b.type || ''),
      sortDirections: ['ascend', 'descend'] as const,
      ...getColumnSearchProps('type', 'Type'),
      render: (type: string) => getTypeTag(type),
    },
    {
      title: 'Email',
      dataIndex: 'mail',
      key: 'mail',
      sorter: (a: Record<string, string>, b: Record<string, string>) =>
        (a.mail || '').localeCompare(b.mail || ''),
      sortDirections: ['ascend', 'descend'] as const,
      ...getColumnSearchProps('mail', 'Email'),
      render: (mail: string) =>
        mail ? (
          <span className="teachers-email">
            <MailOutlined className="teachers-email-icon" />
            {mail}
          </span>
        ) : (
          <span style={{ color: '#cbd5e0' }}>—</span>
        ),
    },
    {
      title: 'UP',
      dataIndex: 'upLibelle',
      key: 'upLibelle',
      sorter: (a: Record<string, string>, b: Record<string, string>) =>
        (a.upLibelle || '').localeCompare(b.upLibelle || ''),
      sortDirections: ['ascend', 'descend'] as const,
      ...getColumnSearchProps('upLibelle', 'UP'),
      render: (up: string) => up || <span style={{ color: '#cbd5e0' }}>—</span>,
    },
    {
      title: 'Département',
      dataIndex: 'deptLibelle',
      key: 'deptLibelle',
      sorter: (a: Record<string, string>, b: Record<string, string>) =>
        (a.deptLibelle || '').localeCompare(b.deptLibelle || ''),
      sortDirections: ['ascend', 'descend'] as const,
      ...getColumnSearchProps('deptLibelle', 'Département'),
      render: (dept: string) => dept || <span style={{ color: '#cbd5e0' }}>—</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Space size="small">
          <Tooltip title="Modifier">
            <Button
              type="text"
              icon={<EditOutlined />}
              className="teachers-btn-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(record);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Supprimer cet enseignant ?"
            description={`${record.nom} ${record.prenom} sera définitivement supprimé.`}
            onConfirm={(e) => {
              e?.stopPropagation();
              onDelete(record);
            }}
            onCancel={(e) => e?.stopPropagation()}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Supprimer">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                className="teachers-btn-delete"
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return columns;
}
