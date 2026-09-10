/* ─────────────────────────────────────────────────────────────────────────
 * BesoinDetailsStep — Step 2: Formateur, période, horaire & charge
 * ─────────────────────────────────────────────────────────────────────── */
import { Form, Input, Select, DatePicker, Row, Col } from 'antd';
import { UserOutlined, CalendarOutlined, TeamOutlined, SolutionOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import SectionLabel from '@/components/besoin/SectionLabel';

const { Option } = Select;

/**
 * Parité BesoinFormationRequest (@Future) : le backend refuse toute date de
 * début passée ou du jour (400 BESOIN_VALIDATION_ERROR) — le sélecteur doit
 * donc griller le passé et aujourd'hui.
 */
const disabledPastDates = (current?: Dayjs): boolean =>
  !!current && current.isBefore(dayjs().startOf('day'));

export interface ActeurOption {
  value: string;
  label: string;
}

interface BesoinDetailsStepProps {
  acteurOptions: ActeurOption[];
  acteursLoading?: boolean;
}

const PERIOD_OPTIONS = [
  { value: 'WINTER', label: 'Winter' },
  { value: 'SUMMER', label: 'Summer' },
  { value: 'SPRINT', label: 'Sprint' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'OTHER', label: 'Autre' },
];

export default function BesoinDetailsStep({
  acteurOptions,
  acteursLoading,
}: Readonly<BesoinDetailsStepProps>) {
  return (
    <div className="bf-step">
      <SectionLabel
        icon={<UserOutlined />}
        title="Formateur souhaité"
        hint="Optionnel — vous pouvez proposer un nom"
      />
      <Form.Item label="Proposition de formateur" name="propositionAnimateur">
        <Input
          placeholder="Nom du formateur proposé (optionnel)"
          size="large"
          prefix={<UserOutlined />}
        />
      </Form.Item>

      <SectionLabel
        icon={<SolutionOutlined />}
        title="Acteurs proposés"
        hint="Optionnel — sélectionnez les animateurs et enseignants depuis la base"
      />
      <Row gutter={[16, 12]}>
        <Col xs={24} md={12}>
          <Form.Item label="Animateurs proposés" name="animateurs">
            <Select
              mode="multiple"
              size="large"
              allowClear
              loading={acteursLoading}
              placeholder="Sélectionner les animateurs"
              optionFilterProp="label"
              options={acteurOptions}
              maxTagCount="responsive"
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Enseignants participants" name="enseignants">
            <Select
              mode="multiple"
              size="large"
              allowClear
              loading={acteursLoading}
              placeholder="Sélectionner les enseignants"
              optionFilterProp="label"
              options={acteurOptions}
              maxTagCount="responsive"
            />
          </Form.Item>
        </Col>
      </Row>

      <SectionLabel
        icon={<CalendarOutlined />}
        title="Période de formation"
        hint="Quand la formation devrait-elle se tenir ?"
      />
      <Row gutter={[16, 12]}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Période"
            name="periodCode"
            rules={[{ required: true, message: 'Choisissez une période' }]}
            initialValue="OTHER"
          >
            <Select placeholder="Choisir la période" size="large">
              {PERIOD_OPTIONS.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Date de début"
            name="dateDebut"
            rules={[
              { required: true, message: 'Précisez la date de début' },
              // Parité BesoinFormationRequest (@Future) : le backend refuse une
              // date passée ou du jour avec un 400 BESOIN_VALIDATION_ERROR.
              {
                validator: (_, value?: Dayjs) =>
                  value && value.isBefore(dayjs().startOf('day'))
                    ? Promise.reject(
                        new Error('La date de début doit être postérieure à aujourd\u2019hui'),
                      )
                    : Promise.resolve(),
              },
            ]}
          >
            <DatePicker
              format="YYYY-MM-DD"
              placeholder="Date de début"
              size="large"
              style={{ width: '100%' }}
              disabledDate={disabledPastDates}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Date de fin"
            name="dateFin"
            dependencies={['dateDebut']}
            rules={[
              { required: true, message: 'Précisez la date de fin' },
              // Parité @AssertTrue isDateFinAfterDateDebut (400 sinon).
              ({ getFieldValue }) => ({
                validator(_, value?: Dayjs) {
                  const debut = getFieldValue('dateDebut') as Dayjs | undefined;
                  if (!value || !debut || !value.isBefore(debut)) return Promise.resolve();
                  return Promise.reject(
                    new Error('La date de fin doit être postérieure ou égale à la date de début'),
                  );
                },
              }),
            ]}
          >
            <DatePicker
              format="YYYY-MM-DD"
              placeholder="Date de fin"
              size="large"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Form.Item noStyle shouldUpdate={(p, c) => p.periodCode !== c.periodCode}>
          {({ getFieldValue }) =>
            getFieldValue('periodCode') === 'OTHER' ? (
              <Col xs={24}>
                <Form.Item
                  label="Précisez la période"
                  name="customPeriodLabel"
                  rules={[{ required: true, message: 'Précisez la période' }]}
                >
                  <Input placeholder="Ex : Mai - Juin 2024" size="large" />
                </Form.Item>
              </Col>
            ) : null
          }
        </Form.Item>
      </Row>

      <SectionLabel
        icon={<TeamOutlined />}
        title="Charge horaire"
        hint="Durée et taille du groupe"
      />
      <Row gutter={[16, 12]}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Durée prévue (heures)"
            name="dureeFormation"
            // Parité @Min(1) BesoinFormationRequest (400 sinon).
            rules={[
              {
                validator: (_, v?: string | number) =>
                  v === undefined || v === '' || Number(v) >= 1
                    ? Promise.resolve()
                    : Promise.reject(new Error('La durée doit être d\u2019au moins 1 heure')),
              },
            ]}
          >
            <Input type="number" placeholder="Ex : 40" size="large" suffix="h" min={1} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Nombre participants"
            name="nbMaxParticipants"
            rules={[
              { required: true, message: 'Précisez le nombre de participants' },
              // Parité @Min(1) / @Max(500) BesoinFormationRequest (400 sinon).
              {
                validator: (_, v?: string | number) => {
                  if (v === undefined || v === '') return Promise.resolve();
                  const n = Number(v);
                  if (!Number.isFinite(n) || n < 1 || n > 500) {
                    return Promise.reject(
                      new Error('Le nombre de participants doit être entre 1 et 500'),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input type="number" placeholder="Ex : 20" size="large" min={1} max={500} />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}
