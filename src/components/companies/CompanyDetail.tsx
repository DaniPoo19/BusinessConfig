import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Plus,
  Store,
  RefreshCw,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardHeader, Button, Spinner, EmptyState } from '../ui';
import { SalePointCard } from './SalePointCard';
import { SalePointForm } from './SalePointForm';
import { CompanyForm } from './CompanyForm';
import { BusinessHoursView } from '../parameters/BusinessHoursView';
import { DeliveryCostView } from '../parameters/DeliveryCostView';
import { useSalePoints, useParameters } from '../../hooks';
import { companiesApi } from '../../services/adminApi';
import type { Company, SalePoint } from '../../types/company';
import { useEffect, useCallback } from 'react';

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Company data
  const [company, setCompany] = useState<Company | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const fetchCompany = useCallback(async () => {
    if (!id) return;
    setCompanyLoading(true);
    setCompanyError(null);
    try {
      const c = await companiesApi.getById(id);
      setCompany(c);
    } catch (err) {
      setCompanyError(err instanceof Error ? err.message : 'Error al cargar empresa');
    } finally {
      setCompanyLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  // Sale points
  const { salePoints, isLoading: spLoading, refetch: refetchSP } = useSalePoints(id ?? null);

  // Selected sale point for parameters
  const [selectedSP, setSelectedSP] = useState<string | null>(null);
  const { businessHours, deliveryCosts, isLoading: paramsLoading } = useParameters(
    id ?? null,
    selectedSP
  );

  // Modals
  const [companyFormOpen, setCompanyFormOpen] = useState(false);
  const [spFormOpen, setSpFormOpen] = useState(false);
  const [editingSP, setEditingSP] = useState<SalePoint | null>(null);

  // Select first sale point by default
  useEffect(() => {
    if (salePoints.length > 0 && !selectedSP) {
      setSelectedSP(salePoints[0].id);
    }
  }, [salePoints, selectedSP]);

  const handleEditSP = (sp: SalePoint) => {
    setEditingSP(sp);
    setSpFormOpen(true);
  };

  const handleNewSP = () => {
    setEditingSP(null);
    setSpFormOpen(true);
  };

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (companyError || !company) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{companyError || 'Empresa no encontrada'}</p>
          <Button variant="secondary" onClick={() => navigate('/empresas')}>
            Volver a Empresas
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/empresas')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{company.name}</h1>
          <p className="text-sm text-gray-500">
            Creada {format(parseISO(company.created_at), "d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            company.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {company.is_active ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      {/* Company Info */}
      <Card>
        <CardHeader
          title="Información de la Empresa"
          action={
            <Button
              variant="secondary"
              size="sm"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => setCompanyFormOpen(true)}
            >
              Editar
            </Button>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoItem icon={<Building2 className="h-4 w-4" />} label="Nombre" value={company.name} />
          <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={company.email} />
          <InfoItem icon={<Phone className="h-4 w-4" />} label="Teléfono" value={company.phone || '—'} />
          <InfoItem icon={<MapPin className="h-4 w-4" />} label="Dirección" value={company.address || '—'} />
        </div>
      </Card>

      {/* Sale Points */}
      <Card>
        <CardHeader
          title="Sucursales"
          description={`${salePoints.length} sucursal${salePoints.length !== 1 ? 'es' : ''}`}
          action={
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={refetchSP}>
                Actualizar
              </Button>
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={handleNewSP}>
                Nueva
              </Button>
            </div>
          }
        />

        {spLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : salePoints.length === 0 ? (
          <EmptyState
            icon={<Store className="h-12 w-12" />}
            title="Sin sucursales"
            description="Esta empresa aún no tiene sucursales."
            action={
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={handleNewSP}>
                Crear Sucursal
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {salePoints.map((sp) => (
              <SalePointCard key={sp.id} salePoint={sp} onEdit={handleEditSP} />
            ))}
          </div>
        )}
      </Card>

      {/* Parameters Section */}
      {salePoints.length > 0 && (
        <div className="space-y-4">
          {/* Sale point selector */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Parámetros de Sucursal</h2>
            <select
              value={selectedSP ?? ''}
              onChange={(e) => setSelectedSP(e.target.value || null)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {salePoints.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
            {selectedSP && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/empresas/${id}/sucursales/${selectedSP}/grupos`)}
              >
                Gestionar Grupos de Personalización
              </Button>
            )}
          </div>

          {paramsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BusinessHoursView businessHours={businessHours} />
              <DeliveryCostView deliveryCosts={deliveryCosts} />
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CompanyForm
        isOpen={companyFormOpen}
        onClose={() => setCompanyFormOpen(false)}
        onSaved={() => {
          fetchCompany();
        }}
        company={company}
      />

      {id && (
        <SalePointForm
          isOpen={spFormOpen}
          onClose={() => {
            setSpFormOpen(false);
            setEditingSP(null);
          }}
          onSaved={refetchSP}
          companyId={id}
          salePoint={editingSP}
        />
      )}
    </div>
  );
}

// ============================================
// Info Item sub-component
// ============================================

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}
