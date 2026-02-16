// src/components/NonAffectedGrid.jsx
import { useState, useEffect } from 'react';
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
import KPIService from '../../services/KPIService';
import DeptService from '../../services/DeptService';
import UpService from '../../services/upService';
import '../../Style/ChartScroll.css';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

export default function NonAffectedGrid() {
  const [allStats, setAllStats]     = useState([]);
  const [stats, setStats]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [range, setRange]           = useState([
    dayjs().startOf('year'),
    dayjs().endOf('year')
  ]);
  const [ups, setUps]               = useState([]);
  const [depts, setDepts]           = useState([]);
  const [selectedUp, setSelectedUp] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);

  // Charger UPs & Depts une seule fois
  useEffect(() => {
    (async () => {
      setUps(await UpService.getAllUps());
      setDepts(await DeptService.getAllDepts());
    })();
  }, []);

  // Charger toutes les stats à chaque changement de date
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [start, end] = range;
      try {
        const data = await KPIService.getEnseignantsNonAffectes(
          start.format('YYYY-MM-DD'),
          end.format('YYYY-MM-DD')
        );
        setAllStats(data);
      } catch {
        setAllStats([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [range]);

  // Filtrer côté client dès que UP ou Dept évoluent
  useEffect(() => {
    setStats(
      allStats.filter(item =>
        (!selectedUp   || item.upId   === selectedUp) &&
        (!selectedDept || item.deptId === selectedDept)
      )
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
      {loading ? (
        <Spin tip="Chargement..." style={{ width: '100%', padding: 50 }} />
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
                  bodyStyle={{ padding: 16 }}
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
