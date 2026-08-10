import AppRoutes from '@/routes';
import ErrorBoundary from '@/components/feedback/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
}

export default App;
