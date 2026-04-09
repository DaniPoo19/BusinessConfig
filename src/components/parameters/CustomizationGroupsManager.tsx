import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Database, Download, Copy } from 'lucide-react';
import { Card, CardHeader, Button, Spinner } from '../ui';
import { toast } from '../ui/Toast';
import { productsApi } from '../../services/adminApi';
import type { Product, CustomizationGroup } from '../../types/company';

export function CustomizationGroupsManager() {
  const { id: companyId, salePointId } = useParams<{ id: string; salePointId: string }>();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchProducts = async () => {
    if (!salePointId) return;
    setLoading(true);
    try {
      const data = await productsApi.getBySalePoint(salePointId);
      setProducts(data);
    } catch (err) {
      toast.error('Error al cargar productos para extraer grupos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salePointId]);

  // Extract unique customization groups
  const uniqueGroups = useMemo(() => {
    const map = new Map<string, CustomizationGroup & { productCount: number }>();
    
    products.forEach((p) => {
      const groupsInProduct = new Set<string>();
      
      p.price_variations?.forEach((pv) => {
        pv.customization_groups?.forEach((cg) => {
          if (!map.has(cg.name)) {
            map.set(cg.name, { ...cg, productCount: 0 });
          }
          if (!groupsInProduct.has(cg.name)) {
            groupsInProduct.add(cg.name);
            const entry = map.get(cg.name)!;
            entry.productCount++;
          }
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const handleDelete = async (groupName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el grupo "${groupName}" de TODOS los productos en esta sucursal? Esta acción no se puede deshacer.`)) {
      return;
    }
    
    setDeleting(groupName);
    try {
      const res = await productsApi.deleteCustomizationGroup(salePointId!, companyId!, groupName);
      if (res.errors.length > 0) {
        toast.error(`Eliminado con ${res.errors.length} errores. Revisa la consola.`);
        console.error(res.errors);
      } else {
        toast.success(`Grupo "${groupName}" eliminado correctamente de ${res.updated} productos`);
      }
      await fetchProducts();
    } catch (err) {
      toast.error('Error al intentar borrar el grupo');
    } finally {
      setDeleting(null);
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(uniqueGroups, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `grupos_personalizacion_${salePointId}.json`);
    dlAnchorElem.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/empresas/${companyId}`)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Grupos de Personalización</h1>
          <p className="text-sm text-gray-500">
            Vista unificada de grupos a través de todos los productos de la sucursal
          </p>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Tus Grupos"
          action={
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<Download className="h-4 w-4" />}
                onClick={handleExport}
                disabled={uniqueGroups.length === 0}
              >
                Exportar JSON
              </Button>
              <Button 
                size="sm" 
                icon={<Copy className="h-4 w-4" />}
                onClick={() => navigate('/importar-parametros')}
              >
                Importar de Sucursal
              </Button>
            </div>
          }
        />

        {uniqueGroups.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Database className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p>No se encontraron grupos de personalización en los productos de esta sucursal.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniqueGroups.map((group) => (
              <div key={group.name} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 truncate pr-2">{group.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded border font-medium whitespace-nowrap ${group.type === 'SELECTION' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                    {group.type}
                  </span>
                </div>
                
                <p className="text-sm text-gray-500 mb-4">
                  Usado en <span className="font-semibold text-gray-700">{group.productCount}</span> producto(s)
                </p>

                <div className="text-xs text-gray-600 mb-4 flex-1">
                  <p className="mb-1 font-medium">Opciones ({group.options.length}):</p>
                  <ul className="list-disc pl-4 space-y-1 max-h-24 overflow-y-auto">
                    {group.options.map(opt => (
                      <li key={opt.id || opt.name} className="truncate">
                        {opt.name} {opt.price > 0 ? `(+$${opt.price})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-end">
                  <Button 
                    variant="danger" 
                    size="sm" 
                    icon={deleting === group.name ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                    disabled={deleting !== null}
                    onClick={() => handleDelete(group.name)}
                  >
                    Eliminar de todos
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
