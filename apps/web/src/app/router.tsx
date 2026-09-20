import { createBrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../dashboard/dashboard-page.tsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardPage />,
  },
]);
