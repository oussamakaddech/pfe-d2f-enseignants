// components/TopBar.jsx
import { Breadcrumb, Dropdown, Avatar, Space } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "@/components/common/AuthProvider";

export default function TopBar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const pathSnippets = pathname.split("/").filter(Boolean);
  const breadcrumbItems = pathSnippets.map((_, idx) => {
    const url = `/${pathSnippets.slice(0, idx + 1).join("/")}`;
    return { title: pathSnippets[idx], href: url };
  });

  const menu = [
    {
      key: "profile",
      label: "Mon profil",
      onClick: () => navigate("/home/profile"),
    },
    {
      key: "logout",
      label: (
        <span role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { logout(); navigate("/"); } }} onClick={() => { logout(); navigate("/"); }}>
          <LogoutOutlined /> Déconnexion
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0 16px" }}>
      <Breadcrumb
        items={[{ title: "Home", href: "/home" }, ...breadcrumbItems]}
      />
      <Dropdown menu={{ items: menu }} placement="bottomRight">
        <Space>
          <Avatar icon={<UserOutlined />} />
          {user?.name || "Utilisateur"}
        </Space>
      </Dropdown>
    </div>
  );
}




