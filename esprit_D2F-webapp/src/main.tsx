import '@ant-design/v5-patch-for-react-19';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider, theme } from 'antd';
import frFR from 'antd/locale/fr_FR';

import AppComponent from '@/App';
import { antdThemeToken, antdComponentTokens } from '@/styles/themes/tokens';

// Police Inter servie depuis node_modules (contrainte DSI : pas de CDN Google).
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import '@/styles/globals.css';
import '@/utils/helpers/chartSetup';

const { defaultAlgorithm } = theme;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — les référentiels changent peu
      gcTime: 10 * 60 * 1000, // 10 min avant éviction du cache
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root') as HTMLElement).render(
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
        <AppComponent />
      </AntdApp>
    </ConfigProvider>
  </QueryClientProvider>,
);
