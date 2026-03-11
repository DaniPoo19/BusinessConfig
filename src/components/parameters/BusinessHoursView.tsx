import { Clock } from 'lucide-react';
import { Card, CardHeader } from '../ui';
import type { Parameter, BusinessHoursValue } from '../../types/company';

interface BusinessHoursViewProps {
  businessHours: Parameter<BusinessHoursValue> | null;
}

export function BusinessHoursView({ businessHours }: BusinessHoursViewProps) {
  if (!businessHours) {
    return (
      <Card>
        <CardHeader title="Horarios" />
        <div className="flex flex-col items-center py-6 text-gray-400">
          <Clock className="h-8 w-8 mb-2" />
          <p className="text-sm">Sin horarios configurados</p>
        </div>
      </Card>
    );
  }

  const val = businessHours.value;

  return (
    <Card>
      <CardHeader title="Horarios de Atención" />
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${val.enabled ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className="text-sm font-medium text-gray-700">
            {val.enabled ? 'Abierto' : 'Cerrado'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 font-medium mb-1">Apertura</p>
            <p className="text-lg font-bold text-green-700">{val.open_time}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-xs text-red-600 font-medium mb-1">Cierre</p>
            <p className="text-lg font-bold text-red-700">{val.close_time}</p>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Zona horaria: <span className="font-medium">{val.timezone}</span>
        </div>
      </div>
    </Card>
  );
}
