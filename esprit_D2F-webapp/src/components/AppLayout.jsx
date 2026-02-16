// src/layouts/AppLayout.jsx
import { useState, useContext } from "react";
import { Layout, Dropdown, Avatar, Space, Button, Breadcrumb } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import SideMenu from "./SideMenu";
import { AuthContext } from "../context/AuthContext";

const { Header, Sider, Content, Footer } = Layout;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const headerHeight = 64;
  const footerHeight = 48;
  const siderWidth = collapsed ? 80 : 200;

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ✅ CORRIGÉ: Utiliser le format 'items' pour Breadcrumb
  const crumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((_, i, arr) => {
      const path = "/" + arr.slice(0, i + 1).join("/");
      return {
        title: (
          <Link to={path} style={{ color: "#999" }}>
            {arr[i]}
          </Link>
        ),
      };
    });

  const avatarMenu = [
    { key: "profile", label: "Mon profil", onClick: () => navigate("/home/profile") },
    {
      key: "logout",
      label: (
        <span onClick={() => { logout(); navigate("/"); }}>
          <LogoutOutlined /> Déconnexion
        </span>
      ),
    },
  ];

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      {/* Header */}
      <Header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: headerHeight,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          background: "linear-gradient(90deg, #8b0000, #B51200)",
          boxShadow: "0 2px 8px rgba(255,255,255,0.5)",
          zIndex: 1000,
        }}
      >
        {collapsed ? (
          <MenuUnfoldOutlined
            onClick={() => setCollapsed(false)}
            style={{ fontSize: 20, color: "#fff", cursor: "pointer" }}
          />
        ) : (
          <MenuFoldOutlined
            onClick={() => setCollapsed(true)}
            style={{ fontSize: 20, color: "#fff", cursor: "pointer" }}
          />
        )}

        <Link to="/home" style={{ margin: "0 24px" }}>
          <img
            src="/assets/img/logo/esprit.png"
            alt="Esprit"
            style={{
              height: 50,
              boxShadow: "0 0 10px 2px rgba(255,255,255,0.8)",
              background: "#fff",
              borderRadius: 4,
            }}
          />
        </Link>

        <div
          className="blink-date"
          style={{
            flex: 1,
            textAlign: "center",
            color: "#fff",
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          {today}
        </div>

        <Dropdown menu={{ items: avatarMenu }} placement="bottomRight">
          <Space style={{ cursor: "pointer" }}>
            <Avatar
              icon={<UserOutlined />}
              style={{ background: "#fff", color: "#B51200" }}
            />
            <span style={{ color: "#fff" }}>{user?.name || "Utilisateur"}</span>
          </Space>
        </Dropdown>
      </Header>

      <Layout style={{ paddingTop: headerHeight }}>
        {/* Sidebar */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="light"
          width={siderWidth}
          style={{
            position: "fixed",
            top: headerHeight,
            bottom: 0,
            left: 0,
            overflow: "auto",
          }}
        >
          <SideMenu />
        </Sider>

        {/* Main */}
        <Layout
          style={{
            marginLeft: siderWidth,
            height: `calc(100vh - ${headerHeight}px)`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Content style={{ flex: "1 1 auto", overflow: "hidden" }}>
            {/* Barre sticky */}
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                background: "#fafafa",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                padding: "16px 24px",
              }}
            >
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                style={{ marginRight: 16 }}
              >
                Retour
              </Button>
              <HomeOutlined style={{ marginRight: 8, color: "#999" }} />

              {/* ✅ CORRIGÉ: Utiliser prop 'items' au lieu de children */}
              <Breadcrumb items={crumbs} />
            </div>

            {/* Outlet pour vos pages */}
            <div
              style={{
                height: `calc(100% - 64px)`,
                overflow: "auto",
                padding: 24,
                background: "#fff",
              }}
            >
              <Outlet />
            </div>
          </Content>

          <Footer
            style={{
              height: footerHeight,
              textAlign: "center",
              background: "#fff",
            }}
          >
            © {new Date().getFullYear()} Esprit – Tous droits réservés
          </Footer>
        </Layout>
      </Layout>
    </Layout>
  );
}
