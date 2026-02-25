import { useNavigate } from 'react-router-dom';
import { Badge } from '../common';

/**
 * TopClientsTable - Tabla con ranking de mejores clientes.
 * Responsiva: oculta columnas menos importantes en móviles.
 */
const TopClientsTable = ({ data, loading = false, periodo, onPeriodChange }) => {
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                <div className="animate-pulse space-y-2 sm:space-y-3">
                    <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/4"></div>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-10 sm:h-12 bg-gray-100 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 text-center">
                <svg className="mx-auto h-10 w-10 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-gray-400 text-sm">No hay datos de clientes</p>
            </div>
        );
    }

    const getRankingLabel = (index) => {
        return (
            <span className="flex items-baseline gap-0.5">
                <span className="text-[9px] sm:text-[10px] opacity-70 font-semibold text-gray-400">#</span>
                <span className="text-xs sm:text-sm font-bold tracking-tight">{index + 1}</span>
            </span>
        );
    };

    const getRankingColor = (index) => {
        if (index === 0) return 'text-amber-500 border-amber-500';
        if (index === 1) return 'text-blue-500 border-blue-500';
        if (index === 2) return 'text-emerald-500 border-emerald-500';
        return 'text-gray-400 border-transparent';
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between gap-2 sm:gap-4">
                <h3 className="text-sm sm:text-base font-medium text-gray-900">Top Clientes</h3>

                {/* Selector de Periodo Local */}
                <select
                    value={periodo}
                    onChange={(e) => onPeriodChange(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-[9px] sm:text-[10px] font-medium rounded-md focus:ring-blue-500 focus:border-blue-500 block p-1 px-1.5 sm:px-2 shadow-sm min-w-[60px]"
                >
                    <option value="semana">Semana</option>
                    <option value="1m">Mes</option>
                    <option value="2m">2m</option>
                    <option value="3m">3m</option>
                    <option value="6m">6m</option>
                    <option value="año">Año</option>
                    <option value="todo">Todo</option>
                </select>
            </div>
            <div className="overflow-x-auto scrollbar-thin flex-1">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Rk
                            </th>
                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Cliente
                            </th>
                            <th className="hidden lg:table-cell px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Sede
                            </th>
                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                <span className="hidden sm:inline">Compras</span>
                                <span className="sm:hidden">Sub.</span>
                            </th>
                            <th className="hidden md:table-cell px-2 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Min
                            </th>
                            <th className="px-2 py-2 sm:py-3 text-right text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Avg
                            </th>
                            <th className="hidden md:table-cell px-2 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Max
                            </th>
                            <th className="hidden sm:table-cell px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Ficha
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((cliente, index) => (
                            <tr
                                key={index}
                                onClick={() => navigate('/dashboard/clientes', { state: { openClienteId: cliente.id } })}
                                className="group cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                                <td className="px-2 sm:px-3 py-2 sm:py-2.5 whitespace-nowrap">
                                    <div className={`flex items-center gap-1.5 pl-1 border-l-2 transition-colors duration-200 ${getRankingColor(index)}`}>
                                        {getRankingLabel(index)}
                                    </div>
                                </td>
                                <td className="px-2 sm:px-3 py-2 sm:py-2.5 whitespace-nowrap">
                                    <div className="text-xs sm:text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors max-w-[80px] sm:max-w-[120px] truncate" title={cliente.cliente_nombre}>
                                        {cliente.cliente_nombre}
                                    </div>
                                </td>
                                <td className="hidden lg:table-cell px-3 py-2.5 whitespace-nowrap text-[10px] text-gray-500 uppercase">
                                    {cliente.sede}
                                </td>
                                <td className="px-2 sm:px-3 py-2 sm:py-2.5 whitespace-nowrap text-[10px] sm:text-xs text-gray-600">
                                    <span className="font-bold text-gray-900">{cliente.subastas_ganadas}</span>
                                    <span className="hidden sm:inline"> sub.</span>
                                </td>
                                <td className="hidden md:table-cell px-2 py-2.5 whitespace-nowrap text-right">
                                    <span className="text-[10px] text-blue-600 font-medium">
                                        {cliente.monto_minimo ? `S/ ${cliente.monto_minimo.toFixed(2)}` : '-'}
                                    </span>
                                </td>
                                <td className="px-2 py-2 sm:py-2.5 whitespace-nowrap text-right">
                                    <span className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold">
                                        {cliente.monto_promedio ? `S/ ${cliente.monto_promedio.toFixed(2)}` : '-'}
                                    </span>
                                </td>
                                <td className="hidden md:table-cell px-2 py-2.5 whitespace-nowrap text-right">
                                    <span className="text-[10px] text-amber-600 font-medium">
                                        {cliente.monto_maximo ? `S/ ${cliente.monto_maximo.toFixed(2)}` : '-'}
                                    </span>
                                </td>
                                <td className="hidden sm:table-cell px-3 py-2.5 whitespace-nowrap">
                                    <Badge variant={cliente.estatus_ficha === 'recepcionado' ? 'success' : 'warning'} className="text-[9px] px-1.5 py-0">
                                        {cliente.estatus_ficha === 'recepcionado' ? 'Recep.' : 'Pend.'}
                                    </Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TopClientsTable;
