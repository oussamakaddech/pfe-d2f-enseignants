import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, App as AntApp } from "antd";
import frFR from "antd/locale/fr_FR";
import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { setApiRole } from "./api/client";
import { AppLayout } from "./components/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { GapAnalysisPage } from "./pages/GapAnalysisPage";
import { LearningPathPage } from "./pages/LearningPathPage";
import { MlPredictionsPage } from "./pages/MlPredictionsPage";
import { RecommendationPage } from "./pages/RecommendationPage";
import { TeacherAnalyticsPage } from "./pages/TeacherAnalyticsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  const [role, setRole] = useState("ADMIN");

  const handleRoleChange = (nextRole: string) => {
    setRole(nextRole);
    setApiRole(nextRole);
    queryClient.clear();
  };

  return (
    <ConfigProvider locale={frFR}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout role={role} onRoleChange={handleRoleChange} />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/teacher" element={<TeacherAnalyticsPage />} />
                <Route path="/gaps" element={<GapAnalysisPage />} />
                <Route path="/recommendations" element={<RecommendationPage />} />
                <Route path="/learning-path" element={<LearningPathPage />} />
                <Route path="/ml" element={<MlPredictionsPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}
