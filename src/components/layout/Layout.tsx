import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Building2,
  ArrowRightLeft,
  FileSpreadsheet,
  Package,
  LogOut,
  Menu,
  X,
  Settings,
  User,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../ui/Toast';

const navItems = [
  { to: '/empresas', label: 'Empresas', icon: Building2 },
  { to: '/importar-parametros', label: 'Importar Datos', icon: ArrowRightLeft },
  { to: '/importar-csv', label: 'Importar CSV', icon: FileSpreadsheet },
  { to: '/importar-inventario-csv', label: 'Importar Inventario', icon: Package },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Error al cerrar sesión');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Settings className="h-5 w-5 text-primary-700" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">ConfigManager</h1>
              <p className="text-xs text-gray-500">Panel de Administración</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto lg:hidden p-1 rounded hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* User Footer */}
          <div className="border-t border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gray-100 rounded-full">
                <User className="h-4 w-4 text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>

            <div className="hidden lg:block">
              <p className="text-sm text-gray-500">
                {user?.company_name || 'Mi Empresa'}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="px-2 py-1 bg-primary-50 text-primary-700 rounded-full font-medium capitalize">
                {user?.role || 'owner'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
