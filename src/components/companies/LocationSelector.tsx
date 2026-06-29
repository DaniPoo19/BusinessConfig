import { useEffect } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import colombiaData from '../../assets/data/colombia-regions.json';

interface LocationSelectorProps {
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  errors: FieldErrors<any>;
  isRequired?: boolean;
}

interface Region {
  id: string;
  name: string;
  municipalities: { id: string; name: string }[];
}

const regions = colombiaData as Region[];

export function LocationSelector({
  register,
  setValue,
  watch,
  errors,
  isRequired = false,
}: LocationSelectorProps) {
  const stateCodeKey = 'state_code';
  const stateKey = 'state';
  const cityCodeKey = 'city_code';
  const cityKey = 'city';

  // Watch state_code and city_code
  const selectedStateCode = watch(stateCodeKey);
  const selectedCityCode = watch(cityCodeKey);

  // Find selected region & municipalities
  const selectedRegion = regions.find((r) => r.id === selectedStateCode);
  const municipalities = selectedRegion ? selectedRegion.municipalities : [];

  // Update text names when code changes
  useEffect(() => {
    if (selectedStateCode) {
      const region = regions.find((r) => r.id === selectedStateCode);
      if (region) {
        setValue(stateKey, region.name, { shouldValidate: true });
      }
    } else {
      setValue(stateKey, '', { shouldValidate: true });
    }
  }, [selectedStateCode, setValue, stateKey]);

  useEffect(() => {
    if (selectedCityCode && selectedRegion) {
      const muni = selectedRegion.municipalities.find((m) => m.id === selectedCityCode);
      if (muni) {
        setValue(cityKey, muni.name, { shouldValidate: true });
      }
    } else {
      setValue(cityKey, '', { shouldValidate: true });
    }
  }, [selectedCityCode, selectedRegion, setValue, cityKey]);

  // Reset city when state changes
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setValue(stateCodeKey, val, { shouldValidate: true });
    setValue(cityCodeKey, '', { shouldValidate: true });
    setValue(cityKey, '', { shouldValidate: true });
  };

  const selectBaseClass = "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-400";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {/* Department Select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Departamento {isRequired && <span className="text-red-500">*</span>}
        </label>
        <select
          {...register(stateCodeKey, {
            required: isRequired ? 'El departamento es obligatorio' : false,
          })}
          onChange={handleStateChange}
          className={`${selectBaseClass} ${errors[stateCodeKey] ? 'border-red-500' : 'border-gray-300'}`}
        >
          <option value="">Selecciona un departamento</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input type="hidden" {...register(stateKey)} />
        {errors[stateCodeKey] && (
          <p className="text-red-500 text-xs mt-1">{errors[stateCodeKey]?.message as string}</p>
        )}
      </div>

      {/* City Select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ciudad / Municipio {isRequired && <span className="text-red-500">*</span>}
        </label>
        <select
          {...register(cityCodeKey, {
            required: isRequired ? 'La ciudad es obligatoria' : false,
          })}
          disabled={!selectedStateCode}
          className={`${selectBaseClass} ${errors[cityCodeKey] ? 'border-red-500' : 'border-gray-300'}`}
        >
          <option value="">
            {selectedStateCode ? "Selecciona un municipio" : "Primero elige un departamento"}
          </option>
          {municipalities.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input type="hidden" {...register(cityKey)} />
        {errors[cityCodeKey] && (
          <p className="text-red-500 text-xs mt-1">{errors[cityCodeKey]?.message as string}</p>
        )}
      </div>
    </div>
  );
}
