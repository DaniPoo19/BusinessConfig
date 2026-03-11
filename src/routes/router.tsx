import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import {
  LoginPage,
  CompaniesPage,
  CompanyDetailPage,
  CompanyCreatePage,
  ParameterImportPage,
} from '../pages';
import { ProtectedRoute, GuestRoute } from './guards';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/empresas" replace />,
      },
      {
        path: 'empresas',
        element: <CompaniesPage />,
      },
      {
        path: 'empresas/nueva',
        element: <CompanyCreatePage />,
      },
      {
        path: 'empresas/:id',
        element: <CompanyDetailPage />,
      },
      {
        path: 'importar-parametros',
        element: <ParameterImportPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/empresas" replace />,
  },
]);
