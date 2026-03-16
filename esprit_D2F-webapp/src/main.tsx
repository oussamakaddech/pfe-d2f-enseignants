import "@ant-design/v5-patch-for-react-19";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import { App as AntdApp, ConfigProvider, theme } from "antd";
import axios from "axios";
import AppComponent from "./App";

const { defaultAlgorithm } = theme;

// ── Global 401 interceptor ────────────────────────────────────────────
// Clears the stale token and redirects to /login on any 401 response so
// the user is never silently stuck with an expired session.
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      const isAlreadyOnLogin =
        window.location.pathname.startsWith("/login") ||
        window.location.pathname.startsWith("/auth");
      if (!isAlreadyOnLogin) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

createRoot(document.getElementById("root") as HTMLElement).render(
  <ConfigProvider
    theme={{
      algorithm: defaultAlgorithm,
      token: {
        colorPrimary: "#B51200",
      },
    }}
  >
    {/* AntdApp provides context for message/notification/modal hooks */}
    <AntdApp>
      <AppComponent />
    </AntdApp>
  </ConfigProvider>
);
