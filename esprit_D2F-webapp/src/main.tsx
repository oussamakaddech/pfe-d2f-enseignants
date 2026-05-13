import "@ant-design/v5-patch-for-react-19";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp, ConfigProvider, theme } from "antd";
import axios from "axios";
import { navigate } from "./utils/navigation";
import AppComponent from "./App";

import "./utils/chartSetup";

const { defaultAlgorithm } = theme;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      const isAlreadyOnLogin =
        window.location.pathname === "/" ||
        window.location.pathname.startsWith("/login") ||
        window.location.pathname.startsWith("/auth");
      if (!isAlreadyOnLogin) {
        navigate("/", { replace: true });
      }
    }
    return Promise.reject(error);
  }
);

createRoot(document.getElementById("root") as HTMLElement).render(
  <QueryClientProvider client={queryClient}>
  <ConfigProvider
    theme={{
      algorithm: defaultAlgorithm,
      token: {
        colorPrimary: "#B51200",
        colorPrimaryHover: "#8b0000",
        borderRadius: 10,
        borderRadiusLG: 14,
        borderRadiusSM: 6,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        colorBgContainer: "#ffffff",
        colorBgLayout: "#f7fafc",
        colorBgElevated: "#ffffff",
        colorTextBase: "#2d3748",
        colorTextSecondary: "#718096",
        colorBorder: "rgba(0,0,0,0.08)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)",
        boxShadowSecondary: "0 4px 12px rgba(0,0,0,0.08)",
        motion: true,
        motionDurationMid: "0.2s",
        motionDurationSlow: "0.3s",
      },
      components: {
        Card: {
          borderRadiusLG: 16,
          boxShadowTertiary: "0 2px 8px rgba(0,0,0,0.06)",
        },
        Button: {
          borderRadius: 10,
          fontWeight: 500,
        },
        Table: {
          borderRadius: 12,
          headerBg: "#fafafa",
        },
        Menu: {
          borderRadius: 10,
        },
        Input: {
          borderRadius: 10,
        },
        Select: {
          borderRadius: 10,
        },
        Modal: {
          borderRadiusLG: 16,
        },
        Drawer: {
          borderRadius: 16,
        },
        Tag: {
          borderRadius: 20,
        },
      },
    }}
  >
    <AntdApp>
      <AppComponent />
    </AntdApp>
  </ConfigProvider>
  </QueryClientProvider>
);
