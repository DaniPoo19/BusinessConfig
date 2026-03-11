import { Store, Pencil, Phone, MapPin } from 'lucide-react';
import type { SalePoint } from '../../types/company';

interface SalePointCardProps {
  salePoint: SalePoint;
  onEdit: (sp: SalePoint) => void;
}

export function SalePointCard({ salePoint, onEdit }: SalePointCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white hover:shadow-sm transition-shadow">
      <div className="p-2 bg-blue-50 rounded-lg">
        <Store className="h-5 w-5 text-blue-600" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-gray-900 text-sm truncate">{salePoint.name}</h4>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              salePoint.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {salePoint.is_active ? 'Activa' : 'Inactiva'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {salePoint.address && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {salePoint.address}
            </span>
          )}
          {salePoint.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> {salePoint.phone}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onEdit(salePoint)}
        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
        title="Editar sucursal"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}
