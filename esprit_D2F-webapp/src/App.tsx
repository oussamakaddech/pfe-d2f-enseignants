import AppRoutes from "./routes/AppRoutes";
import ErrorBoundary from "./components/ErrorBoundary";

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
