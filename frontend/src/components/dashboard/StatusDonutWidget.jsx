import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend
} from 'recharts';

/**
 * StatusDonutWidget - Muestra un resumen de estados en un gráfico de dona.
 */
const StatusDonutWidget = ({ title, data, loading = false, colorScheme = 'blue', icon, showLegend = true }) => {
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse h-64">
                <div className="flex justify-between mb-4">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-6 w-6 bg-gray-200 rounded"></div>
                </div>
                <div className="flex justify-center items-center h-40">
                    <div className="w-32 h-32 rounded-full border-4 border-gray-100 flex items-center justify-center">
                        <div className="w-16 h-1 bg-gray-100"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    // ... (logic remains same)
    const chartData = Object.entries(data)
        .filter(([key]) => key !== 'TOTAL')
        .map(([key, value]) => ({
            name: key.charAt(0) + key.slice(1).toLowerCase().replace('_', ' '),
            value: value
        }))
        .filter(item => item.value > 0);

    // ... (statusColors mapping)
    const statusColors = {
        'Programada': '#60a5fa', 'Activa': '#22c55e', 'Finalizada': '#94a3b8', 'Cancelada': '#ef4444',
        'Proyectado': '#f59e0b', 'En subasta': '#3b82f6', 'Finalizado': '#10b981', 'Anulado': '#7f1d1d',
        'Activos': '#10b981', 'Pendientes': '#f97316',
    };

    const schemes = {
        blue: ['#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
        green: ['#22c55e', '#4ade80', '#86efac', '#dcfce7'],
        purple: ['#a855f7', '#c084fc', '#d8b4fe', '#f3e8ff'],
    };

    const fallbackColors = schemes[colorScheme] || schemes.blue;
    const getCellColor = (name, index) => statusColors[name] || fallbackColors[index % fallbackColors.length];

    // Formatear números grandes (ej: 1.5k)
    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return num;
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg outline-none">
                    <p className="text-sm font-semibold text-gray-900">{payload[0].name}</p>
                    <p className="text-xs text-gray-600">
                        Cantidad: <span className="font-bold">{payload[0].value}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow h-full flex flex-col overflow-hidden">
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    {title}
                </h3>
                <div className={`opacity-70 ${colorScheme === 'blue' ? 'text-blue-600' :
                    colorScheme === 'green' ? 'text-green-600' :
                        'text-purple-600'
                    }`}>
                    {icon}
                </div>
            </div>

            <div className="flex-1 min-h-[160px] w-full relative">
                {chartData.length > 0 && isMounted ? (
                    <>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={75}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getCellColor(entry.name, index)} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                {showLegend && (
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        formatter={(value) => <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-tight">{value}</span>}
                                    />
                                )}
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Indicador central */}
                        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <div className="text-xl font-black text-gray-900 leading-none">
                                {formatNumber(data.TOTAL || 0)}
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                Total
                            </div>
                        </div>
                    </>
                ) : chartData.length > 0 ? (
                    <div className="h-[220px] w-full" />
                ) : (
                    <div className="h-[220px] flex flex-col items-center justify-center text-gray-400">
                        <p className="text-sm italic">Sin datos registrados</p>
                    </div>
                )}
            </div>

        </div>
    );
};

export default StatusDonutWidget;
