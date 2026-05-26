import { useState, useMemo } from 'react';
import {
  Card,
  DatePicker,
  Spin,
  List,
  Select,
  Row,
  Col,
  Avatar,
  Typography,
  Space
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  ApartmentOutlined,
  ClusterOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useEnseignantsNonAffectes } from "@/hooks/kpi/useKpi";
import { useDepartements } from "@/hooks/formation/useFormations";
import { useUps } from "@/hooks/formation/useFormations";
import "@/styles/components/chart-scroll.css";

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

export default function NonAffectedGrid() {
  const { data: upsData } = useUps();
  const { data: deptsData } = useDepartements();
  const ups = upsData ?? [];
  const depts = deptsData ?? [];

  const [range, setRange] = useState([
    dayjs().startOf('year'),
    dayjs().endOf('year')
  ]);
  const [selectedUp, setSelectedUp] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);

  const [start, end] = range;
  const { data: allStats, isLoading } = useEnseignantsNonAffectes(
    start.format('YYYY-MM-DD'),
    end.format('YYYY-MM-DD')
  );

  const stats = useMemo(() => {
    const source = Array.isArray(allStats) ? allStats : [];
    return source.filter(item =>
      (!selectedUp   || item.upId   === selectedUp) &&
      (!selectedDept || item.deptId === selectedDept)
    );
  }, [allStats, selectedUp, selectedDept]);

  return (
    <Card title="Enseignants Non Affectés" style={{ margin: 20 }}>
      
      {/* ---- FILTRES ---- */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <RangePicker
            value={range}
            format="YYYY-MM-DD"
            onChange={r => setRange(r)}
            style={{ width: '100%' }}
          />
        </Col>
        <Col xs={12} md={6}>
          <Select
            placeholder="Filtrer par UP"
            allowClear
            value={selectedUp}
            onChange={setSelectedUp}
            style={{ width: '100%' }}
          >
            {ups.map(up => (
              <Option key={up.id} value={up.id}>{up.libelle}</Option>
            ))}
          </Select>
        </Col>
        <Col xs={12} md={6}>
          <Select
            placeholder="Filtrer par Département"
            allowClear
            value={selectedDept}
            onChange={setSelectedDept}
            style={{ width: '100%' }}
          >
            {depts.map(dept => (
              <Option key={dept.id} value={dept.id}>{dept.libelle}</Option>
            ))}
          </Select>
        </Col>
      </Row>

      {/* ---- AFFICHAGE ---- */}
      {isLoading ? (
        <div style={{ width: '100%', padding: 50, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : (
        <div
          style={{
            maxHeight: 400,          // hauteur fixe : ajuste selon ton besoin
            overflowY: 'auto',
            paddingRight: 16         // pour éviter que le scroll chevauche le contenu
          }}
        >
          <List
            grid={{
              gutter: 24,
              xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 6
            }}
            dataSource={stats}
            locale={{ emptyText: <span style={{ color: '#999' }}>Aucune donnée</span> }}
            renderItem={item => (
              <List.Item>
                <Card
                  hoverable
                  style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  styles={{ body: { padding: 16 } }}
                >
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Space align="center" style={{ marginBottom: 8 }}>
                      <Avatar
                        size={48}
                        icon={<UserOutlined />}
                        style={{ backgroundColor: '#1890ff' }}
                      />
                      <Title level={5} style={{ margin: 0 }}>
                        {item.nom} {item.prenom}
                      </Title>
                    </Space>

                    <Space direction="vertical" size={4}>
                      <Text>
                        <MailOutlined style={{ marginRight: 6, color: '#52c41a' }} />
                        {item.mail}
                      </Text>
                      <Text>
                        <ApartmentOutlined style={{ marginRight: 6, color: '#fa8c16' }} />
                        {item.deptLibelle || '–'}
                      </Text>
                      <Text>
                        <ClusterOutlined style={{ marginRight: 6, color: '#722ed1' }} />
                        {item.upLibelle   || '–'}
                      </Text>
                    </Space>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        </div>
      )}
    </Card>
  );
}




