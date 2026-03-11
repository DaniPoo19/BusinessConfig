import { useState } from 'react';
import { Truck, Search, MapPin, DollarSign } from 'lucide-react';
import { Card, CardHeader } from '../ui';
import type { Parameter, DeliveryCostValue } from '../../types/company';

interface DeliveryCostViewProps {
  deliveryCosts: Parameter<DeliveryCostValue> | null;
}

export function DeliveryCostView({ deliveryCosts }: DeliveryCostViewProps) {
  const [search, setSearch] = useState('');

  if (!deliveryCosts) {
    return (
      <Card>
        <CardHeader title="Barrios / Domicilios" />
        <div className="flex flex-col items-center py-6 text-gray-400">
          <Truck className="h-8 w-8 mb-2" />
          <p className="text-sm">Sin barrios configurados</p>
        </div>
      </Card>
    );
  }

  const barrios = deliveryCosts.value.data || [];
  const filtered = barrios.filter((b) =>
    b.neighbourhood.toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = barrios.filter((b) => b.is_active).length;

  return (
    <Card>
      <CardHeader
        title="Barrios / Domicilios"
        description={`${barrios.length} barrios (${activeCount} activos)`}
      />

      {/* Search */}
      {barrios.length > 10 && (
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
          <p className="text-center text-gray-400 text-xs py-4">
            {search ? `No se encontró "${search}"` : 'Sin barrios'}
          </p>
        ) : (
          filtered.map((b, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs ${
                b.is_active
                  ? 'bg-gray-50 hover:bg-gray-100'
                  : 'bg-red-50/50 opacity-60'
              } transition-colors`}
            >
              <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <span className="flex-1 font-medium text-gray-700 truncate">
                {b.neighbourhood}
              </span>
              <span className="flex items-center gap-1 font-semibold text-gray-900">
                <DollarSign className="h-3 w-3" />
                {b.price.toLocaleString('es-CO')}
              </span>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  b.is_active ? 'bg-green-500' : 'bg-red-400'
                }`}
              />
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
