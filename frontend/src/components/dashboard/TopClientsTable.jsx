import { useNavigate } from 'react-router-dom';
import { Badge } from '../common';

/**
 * TopClientsTable - Tabla con ranking de mejores clientes.
 */
const TopClientsTable = ({ data, loading = false, periodo, onPeriodChange }) => {
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
                <p className="text-gray-400">No hay datos de clientes</p>
            </div>
        );
    }

    const getRankingLabel = (index) => {
        return (
            <span className="flex items-baseline gap-0.5">
                <span className="text-[10px] opacity-70 font-semibold text-gray-400">#</span>
                <span className="text-sm font-bold tracking-tight">{index + 1}</span>
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
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
                <h3 className="text-base font-medium text-gray-900">Top Clientes</h3>

                {/* Selector de Periodo Local */}
                <select
                    value={periodo}
                    onChange={(e) => onPeriodChange(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-[10px] font-medium rounded-md focus:ring-blue-500 focus:border-blue-500 block p-1 px-2 shadow-sm"
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
            <div className="overflow-x-auto flex-1">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Rk
                            </th>
                            <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Cliente
                            </th>
                            <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Sede
                            </th>
                            <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Compras
                            </th>
                            <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
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
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                    <div className={`flex items-center gap-1.5 pl-1 border-l-2 transition-colors duration-200 ${getRankingColor(index)}`}>
                                        {getRankingLabel(index)}
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors max-w-[120px] truncate" title={cliente.cliente_nombre}>
                                        {cliente.cliente_nombre}
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap text-[10px] text-gray-500 uppercase">
                                    {cliente.sede}
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">
                                    <span className="font-bold text-gray-900">{cliente.subastas_ganadas}</span> sub.
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
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
