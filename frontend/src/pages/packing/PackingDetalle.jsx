/**
 * Componente para mostrar el detalle de un Packing Semanal.
 * 
 * Muestra la información completa del packing incluyendo
 * todos los tipos de fruta con su producción diaria.
 */

import { Button, Badge } from '../../components/common';

// Configuración de colores para estados
const ESTADO_COLORS = {
    'PROYECTADO': 'warning',
    'EN_SUBASTA': 'success',
    'FINALIZADO': 'default',
    'ANULADO': 'error'
};

const PackingDetalle = ({ packing, onClose, onEdit }) => {
    if (!packing) return null;

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('es-PE', { 
            weekday: 'long', 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
        });
    };

    const formatDateShort = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('es-PE', { 
            day: '2-digit', 
            month: 'short'
        });
    };

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
            'DOMINGO': 'Domingo',
        };
        return dias[dia] || dia;
    };

    const calcularTotalTipo = (detalles) => {
        if (!detalles) return 0;
        return detalles.reduce((sum, d) => sum + (parseFloat(d.py) || 0), 0);
    };

    return (
        <div className="space-y-6">
            {/* Información General */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                    📋 Información del Packing
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-xs text-gray-500">Empresa</p>
                        <p className="text-sm font-medium text-gray-900">{packing.empresa_nombre}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Estado</p>
                        <Badge variant={ESTADO_COLORS[packing.estado] || 'default'}>
                            {packing.estado_display || packing.estado}
                        </Badge>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Semana</p>
                        <p className="text-sm font-medium text-gray-900">
                            {formatDateShort(packing.fecha_inicio_semana)} - {formatDateShort(packing.fecha_fin_semana)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Total Semanal</p>
                        <p className="text-lg font-bold text-green-600">{formatKg(packing.total_kg)} kg</p>
                    </div>
                    {packing.observaciones && (
                        <div className="col-span-2 md:col-span-4">
                            <p className="text-xs text-gray-500">Observaciones</p>
                            <p className="text-sm text-gray-700">{packing.observaciones}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Tipos de Fruta */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                    📊 Producción por Tipo de Fruta
                </h3>
                
                {packing.tipos && packing.tipos.length > 0 ? (
                    <div className="space-y-4">
                        {packing.tipos.map((tipo) => (
                            <div key={tipo.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Header del tipo */}
                                <div className="bg-blue-50 px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="info">{tipo.tipo_fruta_nombre}</Badge>
                                    </div>
                                    <span className="text-sm font-semibold text-blue-700">
                                        {formatKg(tipo.kg_total || calcularTotalTipo(tipo.detalles))} kg
                                    </span>
                                </div>

                                {/* Tabla de detalles */}
                                {tipo.detalles && tipo.detalles.length > 0 ? (
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Día
                                                </th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Fecha
                                                </th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                                    PY
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {tipo.detalles.map((detalle, index) => (
                                                <tr key={detalle.id || index} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                                        {getDiaLabel(detalle.dia)}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-500">
                                                        {formatDateShort(detalle.fecha)}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                                                        {formatKg(detalle.py)} kg
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="px-4 py-3 text-sm text-gray-500">
                                        Sin detalles registrados
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Total General */}
                        <div className="bg-green-50 p-4 rounded-lg flex justify-between items-center border border-green-200">
                            <span className="text-sm font-semibold text-green-700 uppercase">
                                Total General Semanal:
                            </span>
                            <span className="text-xl font-bold text-green-700">
                                {formatKg(packing.total_kg)} kg
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-500">No hay tipos de fruta registrados</p>
                    </div>
                )}
            </div>

            {/* Información adicional */}
            <div className="text-xs text-gray-400 border-t pt-4">
                <p>Registrado: {packing.fecha_registro ? new Date(packing.fecha_registro).toLocaleString('es-PE') : '-'}</p>
                {packing.fecha_actualizacion && (
                    <p>Última actualización: {new Date(packing.fecha_actualizacion).toLocaleString('es-PE')}</p>
                )}
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button variant="secondary" onClick={onClose}>
                    Cerrar
                </Button>
                <Button onClick={onEdit}>
                    Editar
                </Button>
            </div>
        </div>
    );
};

export default PackingDetalle;
