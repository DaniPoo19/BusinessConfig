import { useState, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, ChevronRight, Check } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { toast } from '../components/ui/Toast';
import { companiesApi } from '../services/adminApi';
import type { CreateCompanyRequest, BusinessType } from '../types/company';
import { BUSINESS_TEMPLATES } from '../types/company';

// ============================================
// Template Selector Card (Step 1)
// ============================================

interface TemplateSelectorProps {
  selectedTemplate: BusinessType | null;
  onSelect: (template: BusinessType) => void;
}

function TemplateSelector({ selectedTemplate, onSelect }: TemplateSelectorProps) {
  const templates = Object.values(BUSINESS_TEMPLATES);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
        <Building2 className="h-5 w-5 text-indigo-600" />
        <span className="text-sm text-indigo-700 font-medium">
          ¿Qué tipo de tienda es esta empresa?
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => {
          const isSelected = selectedTemplate === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className={`
                relative flex flex-col items-start p-5 rounded-xl border-2 text-left
                transition-all duration-200 hover:shadow-md
                ${isSelected
                  ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}

              {/* Icon */}
              <span className="text-3xl mb-3">{template.icon}</span>

              {/* Name */}
              <h3 className={`text-lg font-semibold mb-1 ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                {template.name}
              </h3>

              {/* Description */}
              <p className={`text-sm mb-4 ${isSelected ? 'text-indigo-700' : 'text-gray-500'}`}>
                {template.description}
              </p>

              {/* Modules preview */}
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {template.modules.kitchen && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                    Cocina
                  </span>
                )}
                {template.modules.delivery && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                    Domicilios
                  </span>
                )}
                {template.modules.inventory && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                    Inventario
                  </span>
                )}
                {template.modules.metrics && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                    Métricas
                  </span>
                )}
                {template.modules.waiter && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                    Toma de Pedidos
                  </span>
                )}
              </div>

              {/* Sale types */}
              <div className="mt-3 pt-3 border-t border-gray-100 w-full">
                <p className="text-xs text-gray-400 font-medium mb-1">Tipos de venta:</p>
                <div className="flex flex-wrap gap-1">
                  {template.saleTypes.map((st) => (
                    <span
                      key={st}
                      className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono"
                    >
                      {st === 'ON_SITE' ? 'En sitio' :
                       st === 'PICKUP' ? 'Recoger' :
                       st === 'DELIVERY' ? 'Domicilio' :
                       st === 'COUNTER_SALE' ? 'Mostrador' : st}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Company Create Page (Multi-step)
// ============================================

export function CompanyCreatePage() {
  const navigate = useNavigate();

  // Step management
  const [step, setStep] = useState<1 | 2>(1);

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<BusinessType | null>(null);

  // Company form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [nit, setNit] = useState('');

  // Owner state
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  const [saving, setSaving] = useState(false);

  const handleTemplateSelect = useCallback((template: BusinessType) => {
    setSelectedTemplate(template);
  }, []);

  const handleNextStep = useCallback(() => {
    if (!selectedTemplate) {
      toast.error('Selecciona un tipo de tienda');
      return;
    }
    setStep(2);
  }, [selectedTemplate]);

  const handleBackToStep1 = useCallback(() => {
    setStep(1);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) {
      toast.error('Selecciona un tipo de tienda');
      return;
    }
    if (!name.trim() || !email.trim() || !ownerName.trim() || !ownerEmail.trim() || !ownerPassword.trim() || ownerPassword.length < 8) {
      toast.error('Completa los campos obligatorios. La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setSaving(true);
    try {
      const payload: CreateCompanyRequest = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        nit: nit.trim() || undefined,
        owner_name: ownerName.trim(),
        owner_email: ownerEmail.trim(),
        owner_password: ownerPassword,
        business_template: selectedTemplate,
      };
      const created = await companiesApi.create(payload);
      toast.success('Empresa creada exitosamente');
      navigate(`/empresas/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear empresa');
    } finally {
      setSaving(false);
    }
  };

  const templateLabel = selectedTemplate
    ? BUSINESS_TEMPLATES[selectedTemplate]
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => step === 2 ? handleBackToStep1() : navigate('/empresas')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Nueva Empresa</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          step === 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-500 text-white'
        }`}>
          {step > 1 ? <Check className="h-3.5 w-3.5" /> : null}
          <span>1. Tipo de tienda</span>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300" />
        <div className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          step === 2 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'
        }`}>
          2. Datos de empresa
        </div>
      </div>

      <Card>
        {/* ====== Step 1: Template Selection ====== */}
        {step === 1 && (
          <div className="space-y-5">
            <TemplateSelector
              selectedTemplate={selectedTemplate}
              onSelect={handleTemplateSelect}
            />

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button
                type="button"
                disabled={!selectedTemplate}
                onClick={handleNextStep}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ====== Step 2: Company Form ====== */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Template badge */}
            {templateLabel && (
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                <span className="text-xl">{templateLabel.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-indigo-800">{templateLabel.name}</p>
                  <p className="text-xs text-indigo-600">{templateLabel.description}</p>
                </div>
                <button
                  type="button"
                  onClick={handleBackToStep1}
                  className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 underline"
                >
                  Cambiar
                </button>
              </div>
            )}

            {/* Company fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de Empresa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Heladería Ejemplo S.A.S"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de Empresa <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="admin@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="+57 300 123 4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Calle 10 #15-20, Centro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
                <input
                  type="text"
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="123456789-0"
                />
              </div>
            </div>

            {/* Owner section */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-md font-semibold text-gray-800 mb-4">Datos del Propietario (Dueño)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Dueño <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email del Dueño <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="juan@ejemplo.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña de acceso <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button variant="secondary" type="button" onClick={() => navigate('/empresas')} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={saving} disabled={!name.trim() || !email.trim()}>
                Crear Empresa
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
