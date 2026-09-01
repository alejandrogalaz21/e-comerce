import { Navigate, useRoutes } from 'react-router-dom';

import { authRoutes } from './auth';
import { mainRoutes } from './main';
import { dashboardRoutes } from './dashboard';

export function Router() {
  return useRoutes([
    ...authRoutes,

    ...dashboardRoutes,

    ...mainRoutes,

    { path: '*', element: <Navigate to="/404" replace /> },
  ]);
}
