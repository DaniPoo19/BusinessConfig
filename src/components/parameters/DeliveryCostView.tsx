import { useState } from 'react';
import { Truck, Search, MapPin, DollarSign, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardHeader, Button } from '../ui';
import type { Parameter, DeliveryCostValue, DeliveryNeighbourhood } from '../../types/company';
import { DeliveryCostForm } from './DeliveryCostForm';
import { parametersApi } from '../../services/parametersApi';
import { toast } from '../ui/Toast';

interface DeliveryCostViewProps {
  deliveryCosts: Parameter<DeliveryCostValue> | null;
  companyId: string;
  salePointId: string;
  onSaved: () => void;
}

export function DeliveryCostView({
  deliveryCosts,
  companyId,
  salePointId,
  onSaved,
}: DeliveryCostViewProps) {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNeighbourhood, setEditingNeighbourhood] = useState<DeliveryNeighbourhood | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const barrios = deliveryCosts?.value.data || [];
  const parameterExists = !!deliveryCosts;

  const filtered = barrios.filter((b) =>
    b.neighbourhood.toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = barrios.filter((b) => b.is_active).length;

  const handleAdd = () => {
    setEditingNeighbourhood(null);
    setIsFormOpen(true);
  };

  const handleEdit = (b: DeliveryNeighbourhood) => {
    setEditingNeighbourhood(b);
    setIsFormOpen(true);
  };

  const handleDelete = async (b: DeliveryNeighbourhood) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el barrio "${b.neighbourhood}"?`)) {
      return;
    }

    setIsDeleting(b.neighbourhood);
    try {
      const updatedList = barrios.filter(
        (item) => item.neighbourhood.toLowerCase().trim() !== b.neighbourhood.toLowerCase().trim()
      );

      await parametersApi.update('DELIVERY_COST', {
        company_id: companyId,
        sale_point_id: salePointId,
        value: { data: updatedList },
      });

      toast.success('Barrio eliminado correctamente');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar barrio');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Barrios / Domicilios"
        description={`${barrios.length} barrios (${activeCount} activos)`}
        action={
          <Button
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={handleAdd}
          >
            Agregar
          </Button>
        }
      />

      {/* Search */}
      {barrios.length > 5 && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar barrio..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      )}

      <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-gray-400">
            <Truck className="h-8 w-8 mb-2" />
            <p className="text-xs">
              {search ? `No se encontró "${search}"` : 'Sin barrios configurados'}
            </p>
          </div>
        ) : (
          filtered.map((b, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs border ${
                b.is_active
                  ? 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                  : 'bg-red-50/30 border-red-100 opacity-70'
              } transition-colors`}
            >
              <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <span className="flex-1 font-semibold text-gray-700 truncate">
                {b.neighbourhood}
              </span>
              <span className="flex items-center gap-0.5 font-bold text-gray-900 pr-2">
                <DollarSign className="h-3 w-3 text-gray-400" />
                {b.price.toLocaleString('es-CO')}
              </span>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 mr-2 ${
                  b.is_active ? 'bg-green-500' : 'bg-red-400'
                }`}
                title={b.is_active ? 'Activo' : 'Inactivo'}
              />

              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleEdit(b)}
                  className="p-1 hover:bg-gray-200 text-gray-500 rounded"
                  title="Editar"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(b)}
                  disabled={isDeleting !== null}
                  className="p-1 hover:bg-red-100 text-red-500 rounded disabled:opacity-50"
                  title="Eliminar"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isFormOpen && (
        <DeliveryCostForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSaved={onSaved}
          companyId={companyId}
          salePointId={salePointId}
          neighbourhoodToEdit={editingNeighbourhood}
          existingList={barrios}
          parameterExists={parameterExists}
        />
      )}
    </Card>
  );
}
