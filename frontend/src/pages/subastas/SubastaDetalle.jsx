/**
 * Componente para ver el detalle de una subasta.
 * 
 * RF-03: Muestra el cliente ganador, monto y historial de ofertas.
 */

import { useState, useEffect } from 'react';
import { Badge, Button, Alert } from '../../components/common';
import { getSubasta, getHistorialOfertas } from '../../api/subastas';

// Colores para estados
const ESTADO_COLORS = {
    'PROGRAMADA': 'warning',
    'ACTIVA': 'success',
    'FINALIZADA': 'default',
    'CANCELADA': 'error'
};

const SubastaDetalle = ({ subasta: initialSubasta, onClose, onUpdate }) => {
    const [subasta, setSubasta] = useState(initialSubasta);
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tiempoRestante, setTiempoRestante] = useState(0);
    
    // Cargar detalle completo
    useEffect(() => {
        const cargarDetalle = async () => {
            try {
                setLoading(true);
                const [detalleRes, historialRes] = await Promise.all([
                    getSubasta(initialSubasta.id),
                    getHistorialOfertas(initialSubasta.id)
                ]);
                
                setSubasta(detalleRes.data);
                setHistorial(historialRes.data.historial || []);
                setTiempoRestante(detalleRes.data.tiempo_restante || 0);
            } catch (err) {
                console.error('Error cargando detalle:', err);
                setError('Error al cargar el detalle de la subasta');
            } finally {
                setLoading(false);
            }
        };
        
        cargarDetalle();
    }, [initialSubasta.id]);
    
    // Actualizar tiempo restante cada segundo si está activa
    useEffect(() => {
        if (subasta?.estado_actual !== 'ACTIVA') return;
        
        const interval = setInterval(() => {
            setTiempoRestante((prev) => Math.max(0, prev - 1));
        }, 1000);
        
        return () => clearInterval(interval);
    }, [subasta?.estado_actual]);
    
    // Formatters
    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('es-PE', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN'
        }).format(amount || 0);
    };
    
    const formatKg = (kg) => {
        return new Intl.NumberFormat('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(kg || 0) + ' kg';
    };
    
    const formatTiempo = (segundos) => {
        if (segundos <= 0) return '00:00:00';
        
        const horas = Math.floor(segundos / 3600);
        const minutos = Math.floor((segundos % 3600) / 60);
        const segs = segundos % 60;
        
        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`;
    };
    
    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }
    
    if (error) {
        return <Alert type="error">{error}</Alert>;
    }
    
    if (!subasta) return null;
    
    const ganador = historial.find(o => o.es_ganadora);
    
    return (
        <div className="space-y-6">
            {/* Estado y tiempo restante */}
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <Badge 
                        variant={ESTADO_COLORS[subasta.estado_actual]} 
                        className="text-lg px-4 py-2"
                    >
                        {subasta.estado_actual === 'ACTIVA' ? '🔴 EN VIVO' : subasta.estado_actual}
                    </Badge>
                </div>
                
                {subasta.estado_actual === 'ACTIVA' && (
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Tiempo restante</div>
                        <div className="text-3xl font-mono font-bold text-red-600">
                            {formatTiempo(tiempoRestante)}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Información del producto */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-xs text-blue-600 uppercase">Tipo de Fruta</div>
                    <div className="text-lg font-semibold text-blue-900">{subasta.tipo_fruta_nombre}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-xs text-green-600 uppercase">Empresa</div>
                    <div className="text-lg font-semibold text-green-900">{subasta.empresa_nombre}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-xs text-purple-600 uppercase">Fecha Producción</div>
                    <div className="text-lg font-semibold text-purple-900">
                        {subasta.dia_display} - {subasta.fecha_produccion}
                    </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-xs text-orange-600 uppercase">Kilos</div>
                    <div className="text-lg font-semibold text-orange-900">{formatKg(subasta.kilos)}</div>
                </div>
            </div>
            
            {/* Horario de la subasta */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                    Horario de la Subasta
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-gray-500">Inicio</div>
                        <div className="text-sm font-medium">{formatDateTime(subasta.fecha_hora_inicio)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Fin</div>
                        <div className="text-sm font-medium">{formatDateTime(subasta.fecha_hora_fin)}</div>
                    </div>
                </div>
            </div>
            
            {/* Precios */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                    <div className="text-xs text-gray-500 uppercase">Precio Base</div>
                    <div className="text-2xl font-bold text-gray-700">{formatCurrency(subasta.precio_base)}</div>
                </div>
                <div className="bg-green-100 p-4 rounded-lg text-center">
                    <div className="text-xs text-green-600 uppercase">Precio Actual</div>
                    <div className="text-2xl font-bold text-green-700">{formatCurrency(subasta.precio_actual)}</div>
                </div>
            </div>
            
            {/* Ganador actual */}
            {ganador && (
                <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-yellow-700 uppercase mb-2">
                        🏆 {subasta.estado_actual === 'FINALIZADA' ? 'Ganador' : 'Ganando'}
                    </h3>
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-lg font-bold text-yellow-900">{ganador.cliente_nombre}</div>
                            <div className="text-sm text-yellow-700">{ganador.cliente_ruc_dni}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-yellow-900">{formatCurrency(ganador.monto)}</div>
                            <div className="text-xs text-yellow-600">
                                {new Date(ganador.fecha_oferta).toLocaleString('es-PE')}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Historial de ofertas */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                    Historial de Ofertas ({historial.length})
                </h3>
                
                {historial.length > 0 ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        #
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Cliente
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Monto
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Fecha/Hora
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {historial.map((oferta, index) => (
                                    <tr 
                                        key={oferta.id} 
                                        className={`${oferta.es_ganadora ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                                    >
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {index + 1}
                                            {oferta.es_ganadora && ' 🏆'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900">
                                                {oferta.cliente_nombre}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {oferta.cliente_ruc_dni}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`font-medium ${oferta.es_ganadora ? 'text-yellow-700' : 'text-gray-900'}`}>
                                                {formatCurrency(oferta.monto)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs text-gray-500">
                                            {new Date(oferta.fecha_oferta).toLocaleString('es-PE')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-500">No hay ofertas registradas</p>
                    </div>
                )}
            </div>
            
            {/* Imágenes */}
            {subasta.imagenes && subasta.imagenes.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                        Imágenes del Producto
                    </h3>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {subasta.imagenes.map((img, index) => (
                            <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                                <img
                                    src={img.imagen_url || img.imagen}
                                    alt={img.descripcion || `Imagen ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button variant="secondary" onClick={onClose}>
                    Cerrar
                </Button>
            </div>
        </div>
    );
};

export default SubastaDetalle;
