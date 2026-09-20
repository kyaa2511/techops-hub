import { createBrowserRouter } from 'react-router-dom';
import { AuthGate } from '../auth/auth-gate.tsx';
import { DashboardPage } from '../dashboard/dashboard-page.tsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AuthGate>
        <DashboardPage />
      </AuthGate>
    ),
  },
]);
