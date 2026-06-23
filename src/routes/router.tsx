import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import {
  LoginPage,
  CompaniesPage,
  CompanyDetailPage,
  CompanyCreatePage,
  ParameterImportPage,
  CsvImportPage,
  CustomizationGroupsPage,
  DashboardPage,
  BillingPage,
  PlansConfigPage,
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
        element: <DashboardPage />,
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
      {
        path: 'importar-csv',
        element: <CsvImportPage />,
      },
      {
        path: 'importar-inventario-csv',
        element: <Navigate to="/importar-csv" state={{ importType: 'inventory' }} replace />,
      },
      {
        path: 'empresas/:id/sucursales/:salePointId/grupos',
        element: <CustomizationGroupsPage />,
      },
      {
        path: 'suscripciones',
        element: <BillingPage />,
      },
      {
        path: 'configuracion/planes',
        element: <PlansConfigPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/empresas" replace />,
  },
]);
