import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginForm } from './components/LoginForm';
import { DashboardPage } from './pages/DashboardPage';

function AppBody() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="screen-center">Loading your workspace...</div>;
  }

  return user ? <DashboardPage /> : <LoginForm />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppBody />
    </AuthProvider>
  );
}
