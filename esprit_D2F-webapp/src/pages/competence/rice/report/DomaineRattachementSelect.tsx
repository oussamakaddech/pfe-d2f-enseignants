// DomaineRattachementSelect — choix du domaine de l'application qui recevra
// l'import RICE. Avec un domaine choisi, chaque domaine RICE devient une
// COMPÉTENCE de ce domaine (son nom devient le nom de la compétence) et ses
// compétences deviennent des sous-compétences. Sans choix, un domaine est créé
// par domaine RICE (comportement historique).

import { useQuery } from '@tanstack/react-query';
import { Select, Typography } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import CompetenceService from '@/services/competence/CompetenceService';
import type { Domaine } from '@/models/competence';

const { Text } = Typography;

interface DomaineRattachementSelectProps {
  value?: string | null;
  onChange: (value: string | null) => void;
}

function toOptions(domaines: Domaine[]) {
  return domaines
    .filter((d) => d.id != null)
    .map((d) => ({
      value: String(d.id),
      label: `${d.code ? `[${d.code}] ` : ''}${d.nom ?? ''}`.trim(),
    }));
}

export default function DomaineRattachementSelect({
  value,
  onChange,
}: Readonly<DomaineRattachementSelectProps>) {
  const { data, isLoading } = useQuery({
    queryKey: ['rice', 'domaines-rattachement'],
    queryFn: () => CompetenceService.domaine.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        padding: '12px 16px',
        marginBottom: 12,
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
      }}
    >
      <Text strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <ApartmentOutlined /> Domaine de rattachement
      </Text>
      <Select
        allowClear
        showSearch
        optionFilterProp="label"
        value={value ?? undefined}
        onChange={(v) => onChange(v ?? null)}
        loading={isLoading}
        placeholder="Créer les domaines RICE (aucun rattachement)"
        options={toOptions((data ?? []) as Domaine[])}
        style={{ minWidth: 340 }}
      />
      <Text type="secondary" style={{ fontSize: 12, flex: '1 1 320px' }}>
        Avec un domaine de rattachement, chaque domaine RICE devient une compétence de ce domaine
        (le nom du domaine devient le nom de la compétence) et ses compétences deviennent des
        sous-compétences.
      </Text>
    </div>
  );
}
