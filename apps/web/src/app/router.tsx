import { createBrowserRouter } from 'react-router-dom';
import { AuthGate } from '../auth/auth-gate.tsx';
import { DashboardPage } from '../dashboard/dashboard-page.tsx';
import { DemoPage } from '../demo/demo-page.tsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <DemoPage />,
  },
  {
    path: '/demo',
    element: <DemoPage />,
  },
  {
    path: '/demo/:view',
    element: <DemoPage />,
  },
  {
    path: '/app',
    element: (
      <AuthGate>
        <DashboardPage />
      </AuthGate>
    ),
  },
]);
