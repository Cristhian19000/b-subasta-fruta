import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * RecentAuctionsTable - Tabla con las últimas subastas finalizadas.
 */
const RecentAuctionsTable = ({ data, loading = false }) => {
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-12 bg-gray-100 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-400">No hay subastas recientes</p>
            </div>
        );
    }

    const getFruitStyle = (tipo) => {
        const lowerTipo = tipo?.toLowerCase() || '';
        if (lowerTipo.includes('congelado')) {
            return 'bg-indigo-50 text-indigo-700 border-indigo-100';
        }
        if (lowerTipo.includes('campo')) {
            return 'bg-amber-50 text-amber-700 border-amber-100';
        }
        if (lowerTipo.includes('proceso')) {
            return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        }
        return 'bg-blue-50 text-blue-700 border-blue-100';
    };

    const formatKg = (kg) => {
        if (kg >= 1000) {
            return `${(kg / 1000).toFixed(1)} t`;
        }
        return `${kg.toFixed(0)} kg`;
    };

    const formatCurrency = (value) => {
        return `S/ ${value.toLocaleString('es-PE')}`;
    };

    const formatRelativeTime = (isoDate) => {
        const date = new Date(isoDate);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
            return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        } else {
            return 'Hace poco';
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-base font-medium text-gray-900">Subastas Recientes</h3>
            </div>
            <div className="overflow-x-auto flex-1">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Fruta
                            </th>
                            <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Prod.
                            </th>
                            <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Cant.
                            </th>
                            <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Precio
                            </th>
                            <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Ganador
                            </th>
                            <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Finalizó
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((subasta) => (
                            <tr
                                key={subasta.id}
                                className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                onClick={() => navigate('/dashboard/subastas', { state: { openSubastaId: subasta.id } })}
                            >
                                <td className="px-3 py-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getFruitStyle(subasta.tipo_fruta)}`}>
                                        {subasta.tipo_fruta}
                                    </span>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap">
                                    <div className="text-[11px] text-gray-900 font-medium leading-tight">{subasta.dia_produccion}</div>
                                    <div className="text-[9px] text-gray-500">{subasta.fecha_produccion}</div>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-900 font-medium">
                                    {formatKg(subasta.kg)}
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-xs font-bold text-green-700">
                                    {formatCurrency(subasta.precio_final)}
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap">
                                    <div className="text-xs text-gray-900 max-w-[90px] truncate font-medium" title={subasta.ganador}>
                                        {subasta.ganador}
                                    </div>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap">
                                    <div className="text-[11px] text-gray-900 leading-tight">{formatRelativeTime(subasta.fecha_fin)}</div>
                                    <div className="text-[9px] text-gray-500">
                                        {new Date(subasta.fecha_fin).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RecentAuctionsTable;
