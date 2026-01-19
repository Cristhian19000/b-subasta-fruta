/**
 * Formulario para programar una nueva subasta.
 * 
 * RF-01: Permite seleccionar un packing detalle y configurar
 * fecha/hora de inicio, fin y precio base.
 */

import { useState, useEffect } from 'react';
import { Button, Input, Select, Alert } from '../../components/common';
import { createSubasta } from '../../api/subastas';
import api from '../../api/axios';

const SubastaForm = ({ onSuccess, onCancel }) => {
    // Estados para selección
    const [empresas, setEmpresas] = useState([]);
    const [packingsSemanales, setPackingsSemanales] = useState([]);
    const [packingDetalles, setPackingDetalles] = useState([]);
    
    // Selecciones
    const [empresaId, setEmpresaId] = useState('');
    const [packingSemanalId, setPackingSemanalId] = useState('');
    const [packingDetalleId, setPackingDetalleId] = useState('');
    
    // Datos de la subasta
    const [formData, setFormData] = useState({
        fecha_hora_inicio: '',
        fecha_hora_fin: '',
        precio_base: ''
    });
    
    // Estados de UI
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState(null);
    const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);
    
    // Cargar empresas
    useEffect(() => {
        const cargarEmpresas = async () => {
            try {
                const response = await api.get('/empresas/', { params: { activo: true } });
                // Manejar respuesta paginada o array directo
                const data = response.data?.results || response.data || [];
                setEmpresas(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error cargando empresas:', err);
            } finally {
                setLoadingData(false);
            }
        };
        
        cargarEmpresas();
    }, []);
    
    // Cargar packings semanales cuando se selecciona empresa
    useEffect(() => {
        if (!empresaId) {
            setPackingsSemanales([]);
            setPackingSemanalId('');
            return;
        }
        
        const cargarPackings = async () => {
            try {
                const response = await api.get('/packing-semanal/', { 
                    params: { empresa: empresaId, estado: 'EN_SUBASTA' } 
                });
                // Manejar respuesta paginada o array directo
                const data = response.data?.results || response.data || [];
                setPackingsSemanales(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error cargando packings:', err);
            }
        };
        
        cargarPackings();
    }, [empresaId]);
    
    // Cargar detalles cuando se selecciona packing semanal
    useEffect(() => {
        if (!packingSemanalId) {
            setPackingDetalles([]);
            setPackingDetalleId('');
            return;
        }
        
        const cargarDetalles = async () => {
            try {
                const response = await api.get(`/packing-semanal/${packingSemanalId}/`);
                const packing = response.data;
                
                // Extraer todos los detalles de todos los tipos
                const detalles = [];
                packing.tipos?.forEach(tipo => {
                    tipo.detalles?.forEach(detalle => {
                        detalles.push({
                            ...detalle,
                            tipo_fruta_nombre: tipo.tipo_fruta_nombre,
                            tipo_fruta_id: tipo.tipo_fruta,
                            packing_tipo_id: tipo.id
                        });
                    });
                });
                
                setPackingDetalles(detalles);
            } catch (err) {
                console.error('Error cargando detalles:', err);
            }
        };
        
        cargarDetalles();
    }, [packingSemanalId]);
    
    // Actualizar detalle seleccionado
    useEffect(() => {
        if (!packingDetalleId) {
            setDetalleSeleccionado(null);
            return;
        }
        
        const detalle = packingDetalles.find(d => d.id === parseInt(packingDetalleId));
        setDetalleSeleccionado(detalle);
    }, [packingDetalleId, packingDetalles]);
    
    // Handlers
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!packingDetalleId) {
            setError('Debe seleccionar una producción diaria');
            return;
        }
        
        if (!formData.fecha_hora_inicio || !formData.fecha_hora_fin || !formData.precio_base) {
            setError('Todos los campos son requeridos');
            return;
        }
        
        try {
            setLoading(true);
            setError(null);
            
            await createSubasta({
                packing_detalle: parseInt(packingDetalleId),
                fecha_hora_inicio: formData.fecha_hora_inicio,
                fecha_hora_fin: formData.fecha_hora_fin,
                precio_base: parseFloat(formData.precio_base)
            });
            
            onSuccess();
        } catch (err) {
            console.error('Error creando subasta:', err);
            const errorMsg = err.response?.data?.packing_detalle?.[0] 
                || err.response?.data?.detail 
                || err.response?.data?.error
                || 'Error al crear la subasta';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };
    
    // Formatters
    const formatKg = (kg) => {
        return new Intl.NumberFormat('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(kg || 0);
    };
    
    const getDiaLabel = (dia) => {
        const dias = {
            'LUNES': 'Lunes',
            'MARTES': 'Martes',
            'MIERCOLES': 'Miércoles',
            'JUEVES': 'Jueves',
            'VIERNES': 'Viernes',
            'SABADO': 'Sábado',
        };
        return dias[dia] || dia;
    };
    
    if (loadingData) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }
    
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <Alert type="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            
            {/* Paso 1: Seleccionar Producción */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase">
                    1. Seleccionar Producción Diaria
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Empresa
                        </label>
                        <Select
                            value={empresaId}
                            onChange={(e) => setEmpresaId(e.target.value)}
                            options={[
                                { value: '', label: 'Seleccionar empresa...' },
                                ...empresas.map(e => ({ value: e.id, label: e.nombre }))
                            ]}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Packing Semanal
                        </label>
                        <Select
                            value={packingSemanalId}
                            onChange={(e) => setPackingSemanalId(e.target.value)}
                            disabled={!empresaId}
                            options={[
                                { value: '', label: 'Seleccionar semana...' },
                                ...packingsSemanales.map(p => ({ 
                                    value: p.id, 
                                    label: `Semana ${p.fecha_inicio_semana} - ${p.fecha_fin_semana}` 
                                }))
                            ]}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Producción (Día)
                        </label>
                        <Select
                            value={packingDetalleId}
                            onChange={(e) => setPackingDetalleId(e.target.value)}
                            disabled={!packingSemanalId}
                            options={[
                                { value: '', label: 'Seleccionar día...' },
                                ...packingDetalles.map(d => ({ 
                                    value: d.id, 
                                    label: `${getDiaLabel(d.dia)} - ${d.tipo_fruta_nombre} (${formatKg(d.py)} kg)` 
                                }))
                            ]}
                        />
                    </div>
                </div>
                
                {/* Resumen de la selección */}
                {detalleSeleccionado && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-blue-600">Tipo de Fruta:</span>
                                <div className="font-semibold">{detalleSeleccionado.tipo_fruta_nombre}</div>
                            </div>
                            <div>
                                <span className="text-blue-600">Día:</span>
                                <div className="font-semibold">{getDiaLabel(detalleSeleccionado.dia)}</div>
                            </div>
                            <div>
                                <span className="text-blue-600">Fecha:</span>
                                <div className="font-semibold">{detalleSeleccionado.fecha}</div>
                            </div>
                            <div>
                                <span className="text-blue-600">Kilos:</span>
                                <div className="font-semibold text-green-600">{formatKg(detalleSeleccionado.py)} kg</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Paso 2: Configurar Subasta */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase">
                    2. Configurar Subasta
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha y Hora de Inicio *
                        </label>
                        <Input
                            type="datetime-local"
                            name="fecha_hora_inicio"
                            value={formData.fecha_hora_inicio}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha y Hora de Fin *
                        </label>
                        <Input
                            type="datetime-local"
                            name="fecha_hora_fin"
                            value={formData.fecha_hora_fin}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Precio Base (S/) *
                        </label>
                        <Input
                            type="number"
                            name="precio_base"
                            value={formData.precio_base}
                            onChange={handleChange}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            required
                        />
                    </div>
                </div>
            </div>
            
            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button type="button" variant="secondary" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading || !packingDetalleId}>
                    {loading ? 'Creando...' : 'Programar Subasta'}
                </Button>
            </div>
        </form>
    );
};

export default SubastaForm;
