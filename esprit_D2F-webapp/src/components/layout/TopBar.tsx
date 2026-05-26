import { memo } from "react";
import { Breadcrumb, Dropdown, Avatar, Space } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/auth";

const TopBar = memo(function TopBar() {
  const { user, logout } = useAuth();
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
      label: <span><LogoutOutlined /> Déconnexion</span>,
      onClick: () => { logout(); navigate("/"); },
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
          {user?.username || user?.userName || "Utilisateur"}
        </Space>
      </Dropdown>
    </div>
  );
});

export default TopBar;




