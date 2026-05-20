import "@ant-design/v5-patch-for-react-19";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp, ConfigProvider, theme } from "antd";
import frFR from "antd/locale/fr_FR";
import axios from "axios";
import { navigate } from "@/utils/helpers/navigation";
import AppComponent from "@/App";
import NotificationBridge from "@/components/feedback/NotificationBridge";
import { antdThemeToken, antdComponentTokens } from "@/styles/themes/tokens";

import "@/styles/globals.css";
import "@/utils/helpers/chartSetup";

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
      try {
        window.dispatchEvent(new Event("auth:loggedOut"));
      } catch { /* ignore */ }
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
      locale={frFR}
      theme={{
        algorithm: defaultAlgorithm,
        token: antdThemeToken,
        components: antdComponentTokens,
      }}
    >
      <AntdApp>
        <NotificationBridge />
        <AppComponent />
      </AntdApp>
    </ConfigProvider>
  </QueryClientProvider>
);




