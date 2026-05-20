import AppRoutes from "@/routes";
import ErrorBoundary from "@/components/feedback/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <a href="#main-content" className="skip-to-main">
        Aller au contenu principal
      </a>
      <AppRoutes />
    </ErrorBoundary>
  );
}

export default App;
