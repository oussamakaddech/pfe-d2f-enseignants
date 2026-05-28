import { memo, useMemo } from "react";
import { Menu, Avatar, Badge, Typography, Divider } from "antd";
import type { MenuProps } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/auth";
import { roleMenus, accountGroup, type MenuItem } from "./sideMenuData";
import "@/styles/components/sidemenu.css";

const { Text } = Typography;

const normalizeRole = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .replace(/^role_?/, "")
    .replaceAll(/[\s_-]+/g, "");

const ROLE_LABELS: Record<string, string> = {
  admin:              "Administrateur",
  cup:                "CUP",
  enseignant:         "Enseignant",
  formateur:          "Formateur",
  responsabledossier: "Responsable Dossier",
  chefdepartement:    "Chef de Département",
};

type AntdMenuItem = NonNullable<MenuProps["items"]>[number];

function processItems(items: MenuItem[]): AntdMenuItem[] {
  return items.map((item): AntdMenuItem => {
    if (item.type === "group") {
      return { type: "group", label: item.label, children: processItems(item.children ?? []) };
    }
    const Icon = item.icon;
    return {
      key: item.key ?? "",
      label: item.label,
      danger: item.danger,
      icon: Icon ? <Icon /> : null,
      ...(item.children ? { children: processItems(item.children) } : {}),
    };
  });
}

function getDefaultOpenKeys(pathname: string): string[] {
  if (pathname.startsWith("/home/besoins"))         return ["besoin_formation_menu"];
  if (pathname.startsWith("/home/rice"))            return ["rice_ia_group"];
  if (pathname.startsWith("/home/affectations") ||
      pathname.startsWith("/home/rice/matchmaking")) return ["gestion_affectation"];
  if (pathname.startsWith("/home/bureaux"))         return [];
  return [];
}

const SideMenu = memo(function SideMenu({ collapsed }: { collapsed?: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const roleKey = normalizeRole(user?.role);

  const items = useMemo(() => {
    if (!user) return [];
    const roleItems = roleMenus[roleKey] ?? [];
    return [...roleItems, ...accountGroup];
  }, [user, roleKey]);

  const onClick = ({ key }: { key: string }) => {
    if (key === "logout") {
      logout();
      navigate("/");
    } else if (typeof key === "string" && key.startsWith("/")) {
      navigate(key);
    }
  };

  const menuItems = useMemo(() => processItems(items), [items]);

  return (
    <div className="sidemenu-container">
      <div className="sidemenu-user-card">
        <div className="user-card-content">
          <Badge dot color="#52c41a" offset={[-4, 34]}>
            <Avatar
              size={40}
              icon={<UserOutlined />}
              src={typeof user?.avatar === "string" ? user.avatar : undefined}
              className="user-avatar"
              style={{ background: "#B51200", color: "#fff" }}
            />
          </Badge>
          <div className="user-info">
            <Text className="user-name">{user?.username}</Text>
            <Text className="user-role">{ROLE_LABELS[roleKey] ?? user?.role}</Text>
          </div>
        </div>
      </div>

      <Divider style={{ margin: "6px 0", opacity: 0.35 }} />

      <div className="sidemenu-nav-section">
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          defaultOpenKeys={getDefaultOpenKeys(pathname)}
          onClick={onClick}
          items={menuItems}
          className="custom-sidemenu"
        />
      </div>
    </div>
  );
});

export default SideMenu;
