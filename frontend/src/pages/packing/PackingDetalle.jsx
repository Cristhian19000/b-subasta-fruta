/**
 * Componente para mostrar el detalle de un Packing.
 * 
 * Muestra la información completa del packing incluyendo
 * la tabla de producción diaria.
 */

import { Button, Badge } from '../../components/common';

const PackingDetalle = ({ packing, onClose, onEdit }) => {
    if (!packing) return null;

    const formatDate = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('es-PE', { 
            weekday: 'long', 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
        });
    };

    const formatDateShort = (dateStr) => {
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
        }).format(kg);
    };

    const getDiaLabel = (dia) => {
        const dias = {
            lunes: 'Lunes',
            martes: 'Martes',
            miercoles: 'Miércoles',
            jueves: 'Jueves',
            viernes: 'Viernes',
            sabado: 'Sábado',
            domingo: 'Domingo',
        };
        return dias[dia] || dia;
    };

    return (
        <div className="space-y-6">
            {/* Información General */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                    📋 Información del Packing
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-500">Empresa</p>
                        <p className="text-sm font-medium text-gray-900">{packing.empresa_nombre}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Tipo de Fruta</p>
                        <Badge variant="info">{packing.tipo_fruta_nombre}</Badge>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Semana de Proyección</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(packing.fecha_proyeccion)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Total Semanal</p>
                        <p className="text-lg font-bold text-green-600">{formatKg(packing.kg_total)} kg</p>
                    </div>
                    {packing.observaciones && (
                        <div className="col-span-2">
                            <p className="text-xs text-gray-500">Observaciones</p>
                            <p className="text-sm text-gray-700">{packing.observaciones}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabla de Producción Diaria */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                    📊 Producción Diaria
                </h3>
                
                {packing.detalles && packing.detalles.length > 0 ? (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Día
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Fecha
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        PY
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Kilogramos
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {packing.detalles.map((detalle) => (
                                    <tr key={detalle.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {getDiaLabel(detalle.dia)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {formatDateShort(detalle.fecha)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            <code className="bg-gray-100 px-2 py-0.5 rounded">
                                                {detalle.py}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                                            {formatKg(detalle.kg)} kg
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-green-50">
                                <tr>
                                    <td colSpan="3" className="px-4 py-3 text-right text-sm font-bold text-gray-700">
                                        TOTAL SEMANAL:
                                    </td>
                                    <td className="px-4 py-3 text-right text-lg font-bold text-green-700">
                                        {formatKg(packing.kg_total)} kg
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-500">No hay detalles registrados</p>
                    </div>
                )}
            </div>

            {/* Información adicional */}
            <div className="text-xs text-gray-400 border-t pt-4">
                <p>Creado: {new Date(packing.fecha_creacion).toLocaleString('es-PE')}</p>
                {packing.fecha_actualizacion && (
                    <p>Última actualización: {new Date(packing.fecha_actualizacion).toLocaleString('es-PE')}</p>
                )}
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button variant="secondary" onClick={onClose}>
                    Cerrar
                </Button>
                <Button onClick={onEdit}>
                    Editar Packing
                </Button>
            </div>
        </div>
    );
};

export default PackingDetalle;
