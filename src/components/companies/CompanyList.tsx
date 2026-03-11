import { useState } from 'react';
import {
  Building2,
  Plus,
  Mail,
  Phone,
  Search,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardHeader, Button, EmptyState, Spinner } from '../ui';
import { useCompanies } from '../../hooks';
import type { Company } from '../../types/company';

export function CompanyList() {
  const { companies, isLoading, error, refetch } = useCompanies();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="secondary" onClick={refetch}>
            Reintentar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Empresas"
        description={`${companies.length} empresa${companies.length !== 1 ? 's' : ''} registrada${companies.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={refetch}>
              Actualizar
            </Button>
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/empresas/nueva')}>
              Nueva Empresa
            </Button>
          </div>
        }
      />

      {/* Search */}
      {companies.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa por nombre o email..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      )}

      {companies.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="Sin empresas"
          description="Aún no tienes empresas registradas."
          action={
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/empresas/nueva')}>
              Crear Primera Empresa
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-8">
          No se encontraron empresas con "{search}"
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <CompanyRow key={c.id} company={c} onClick={() => navigate(`/empresas/${c.id}`)} />
          ))}
        </div>
      )}
    </Card>
  );
}

// ============================================
// Company Row
// ============================================

function CompanyRow({ company, onClick }: { company: Company; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:shadow-md hover:border-primary-200 transition-all text-left bg-white"
    >
      <div className="p-2.5 bg-primary-50 rounded-lg">
        <Building2 className="h-5 w-5 text-primary-600" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{company.name}</h3>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              company.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {company.is_active ? 'Activa' : 'Inactiva'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" /> {company.email}
          </span>
          {company.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> {company.phone}
            </span>
          )}
          <span>
            Creada {format(parseISO(company.created_at), "d MMM yyyy", { locale: es })}
          </span>
        </div>
      </div>

      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
    </button>
  );
}
