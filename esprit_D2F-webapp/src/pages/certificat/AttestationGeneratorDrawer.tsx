import { useMemo, useState } from 'react';
import { Button, DatePicker, Drawer, Empty, Segmented, Select, Space, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import useAppNotification from '@/hooks/ui/useAppNotification';
import { useFormationReportFetch } from '@/hooks/formation';
import type { Enseignant } from '@/hooks/enseignant';
import {
  ATTESTATION_HEADERS,
  attestationFileName,
  attestationTitle,
  buildAttestationPdf,
  teacherFullName,
  type AttestationRow,
  type AttestationType,
} from '@/utils/pdf/attestationPdf';

const { Text } = Typography;

export interface AttestationGeneratorDrawerProps {
  open: boolean;
  onClose: () => void;
  enseignants: Enseignant[];
  loadingEnseignants: boolean;
}

const TYPE_OPTIONS = [
  { label: 'Participation', value: 'PARTICIPATION' as AttestationType },
  { label: 'Animation', value: 'ANIMATION' as AttestationType },
];

export default function AttestationGeneratorDrawer({
  open,
  onClose,
  enseignants,
  loadingEnseignants,
}: Readonly<AttestationGeneratorDrawerProps>) {
  const { message } = useAppNotification();
  const reportFetch = useFormationReportFetch();
  const [type, setType] = useState<AttestationType>('PARTICIPATION');
  const [enseignantId, setEnseignantId] = useState<string | undefined>();
  const [period, setPeriod] = useState<Dayjs[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<{ save: (name: string) => void } | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => enseignants.find((e) => String(e.id) === String(enseignantId)),
    [enseignants, enseignantId],
  );

  const options = useMemo(
    () =>
      enseignants.map((e) => {
        const dept = (e.deptLibelle as string | undefined) ?? '';
        const label = `${teacherFullName({ nom: e.nom, prenom: e.prenom })}${dept ? ` — ${dept}` : ''}`;
        return { value: String(e.id), label };
      }),
    [enseignants],
  );

  const reset = () => {
    setPdfUrl(null);
    setLastDoc(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const generate = async () => {
    if (!selected || period.length !== 2) {
      message.warning('Sélectionnez un enseignant et une période.');
      return;
    }
    setBusy(true);
    try {
      const [start, end] = period.map((d) => d.format('YYYY-MM-DD'));
      const raw = await reportFetch.mutateAsync({
        role: type === 'ANIMATION' ? 'animateur' : 'participant',
        enseignantId: selected.id!,
        start,
        end,
      });
      const rows = (Array.isArray(raw) ? raw : []) as AttestationRow[];
      if (rows.length === 0) {
        message.warning(
          `Aucune formation ${type === 'ANIMATION' ? 'animée' : 'suivie'} sur cette période.`,
        );
        return;
      }
      const teacher = {
        nom: selected.nom,
        prenom: selected.prenom,
        departement: (selected.deptLibelle as string | undefined) ?? '',
      };
      const doc = buildAttestationPdf({ type, teacher, rows });
      setLastDoc(doc);
      setPdfUrl(doc.output('bloburl') as unknown as string);
    } catch {
      message.error("Échec de la génération de l'attestation.");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!lastDoc || !selected) return;
    lastDoc.save(
      attestationFileName(
        type,
        { nom: selected.nom, prenom: selected.prenom },
        new Date(),
      ),
    );
  };

  return (
    <Drawer
      title={<span style={{ fontWeight: 600 }}>{attestationTitle(type)}</span>}
      width={pdfUrl ? 820 : 520}
      open={open}
      onClose={close}
      footer={
        <div className="gcert-attestation-footer">
          <Button onClick={close}>Fermer</Button>
          {pdfUrl ? (
            <Space>
              <Button onClick={reset}>Nouvelle attestation</Button>
              <Button type="primary" onClick={download}>
                Télécharger
              </Button>
            </Space>
          ) : (
            <Button
              type="primary"
              loading={busy}
              disabled={!selected || period.length !== 2}
              onClick={generate}
            >
              Générer l'attestation
            </Button>
          )}
        </div>
      }
    >
      {pdfUrl ? (
        <iframe
          src={pdfUrl}
          title="Attestation PDF"
          style={{ width: '100%', height: '78vh', border: 'none' }}
        />
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>Modèle</Text>
            <Segmented
              block
              value={type}
              onChange={(v) => setType(v as AttestationType)}
              options={TYPE_OPTIONS}
              style={{ marginTop: 8 }}
            />
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              Colonnes du tableau : {ATTESTATION_HEADERS[type].join(' · ')}
            </Text>
          </div>

          <div>
            <Text strong>Enseignant</Text>
            <Select
              showSearch
              allowClear
              optionFilterProp="label"
              placeholder="Rechercher un enseignant…"
              style={{ width: '100%', marginTop: 8 }}
              loading={loadingEnseignants}
              value={enseignantId}
              onChange={setEnseignantId}
              options={options}
            />
          </div>

          <div>
            <Text strong>Période des formations</Text>
            <DatePicker.RangePicker
              style={{ width: '100%', marginTop: 8 }}
              format="DD/MM/YYYY"
              value={period.length === 2 ? (period as [Dayjs, Dayjs]) : null}
              onChange={(dates) =>
                setPeriod(((dates ?? []) as (Dayjs | null)[]).filter((d): d is Dayjs => d !== null))
              }
            />
          </div>

          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Sélectionnez un enseignant et une période pour prévisualiser l'attestation."
          />
        </Space>
      )}
    </Drawer>
  );
}
