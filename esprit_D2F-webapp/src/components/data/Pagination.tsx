import { memo } from 'react';
import { Pagination as AntPagination } from 'antd';

interface PaginationProps {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly onChange: (page: number, pageSize: number) => void;
  readonly loading?: boolean;
  readonly pageSizeOptions?: number[];
}

/**
 * Pagination standard D2F : « Affichage X–Y sur Z résultats », sélecteur de
 * taille (10/25/50/100), navigation première/dernière page, saut direct
 * (quick jumper) pour les gros volumes. Désactivée pendant le chargement.
 */
const Pagination = memo(function Pagination({
  page,
  pageSize,
  total,
  onChange,
  loading = false,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: 'var(--space-3) 0',
      }}
    >
      <AntPagination
        current={page}
        pageSize={pageSize}
        total={total}
        onChange={onChange}
        disabled={loading}
        showSizeChanger
        pageSizeOptions={pageSizeOptions}
        showQuickJumper={total > pageSize * 10}
        showTotal={(t, range) =>
          t === 0
            ? 'Aucun résultat'
            : `Affichage ${range[0]}–${range[1]} sur ${t.toLocaleString('fr-FR')} résultats`
        }
        locale={{ jump_to: 'Aller à', page: '' }}
      />
    </div>
  );
});

export default Pagination;
