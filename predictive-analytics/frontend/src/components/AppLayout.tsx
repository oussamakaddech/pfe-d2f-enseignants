import {
  DashboardOutlined,
  ExceptionOutlined,
  GatewayOutlined,
  LineChartOutlined,
  RiseOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Segmented, Space, Typography } from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

const { Header, Sider, Content } = Layout;

const MENU_ITEMS = [
  { key: "/", icon: <DashboardOutlined />, label: <Link to="/">Pilotage</Link> },
  {
    key: "/teacher",
    icon: <UserOutlined />,
    label: <Link to="/teacher">Enseignant</Link>,
  },
  {
    key: "/gaps",
    icon: <ExceptionOutlined />,
    label: <Link to="/gaps">Gaps</Link>,
  },
  {
    key: "/recommendations",
    icon: <RiseOutlined />,
    label: <Link to="/recommendations">Recommandations</Link>,
  },
  {
    key: "/learning-path",
    icon: <GatewayOutlined />,
    label: <Link to="/learning-path">Parcours</Link>,
  },
  {
    key: "/ml",
    icon: <LineChartOutlined />,
    label: <Link to="/ml">Prédictions ML</Link>,
  },
];

interface Props {
  role: string;
  onRoleChange: (role: string) => void;
}

export function AppLayout({ role, onRoleChange }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const selected = location.pathname === "/" ? "/" : `/${location.pathname.split("/")[1]}`;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider theme="dark" breakpoint="lg" collapsedWidth={64}>
        <div style={{ height: 48, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
          D2F Analytics
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selected]}
          items={MENU_ITEMS}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingInline: 24,
          }}
        >
          <Typography.Text strong>Module d'analyse prédictive — Formation &amp; Développement</Typography.Text>
          <Space>
            <Typography.Text type="secondary">Rôle simulateur</Typography.Text>
            <Segmented
              size="small"
              value={role}
              onChange={(value) => onRoleChange(String(value))}
              options={["TEACHER", "DEPARTMENT_HEAD", "UP_HEAD", "ADMIN"]}
            />
          </Space>
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
