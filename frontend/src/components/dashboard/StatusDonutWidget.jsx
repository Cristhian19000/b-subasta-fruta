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

    const statusColors = {
        'Programada': '#60a5fa',
        'Activa': '#22c55e',
        'Finalizada': '#94a3b8',
        'Cancelada': '#ef4444',
        'Proyectado': '#f59e0b',
        'En subasta': '#3b82f6',
        'Finalizado': '#10b981',
        'Anulado': '#7f1d1d',
        'Activos': '#10b981',
        'Pendientes': '#f97316',
    };

    const schemes = {
        blue: ['#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
        green: ['#22c55e', '#4ade80', '#86efac', '#dcfce7'],
        purple: ['#a855f7', '#c084fc', '#d8b4fe', '#f3e8ff'],
    };

    const fallbackColors = schemes[colorScheme] || schemes.blue;
    const getCellColor = (name, index) => statusColors[name] || fallbackColors[index % fallbackColors.length];

    const chartData = Object.entries(data)
        .filter(([key]) => key !== 'TOTAL')
        .map(([key, value], index) => {
            const name = key.charAt(0) + key.slice(1).toLowerCase().replace('_', ' ');
            return {
                name,
                value: value,
                fill: getCellColor(name, index)
            };
        })
        .filter(item => item.value > 0);

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

    // Función para renderizar etiquetas limpias dentro del segmento
    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name, fill }) => {
        const RADIAN = Math.PI / 180;
        // Posicionar la etiqueta en el centro del segmento
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                    fontSize: '16px',
                    fontWeight: '800',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    pointerEvents: 'none'
                }}
            >
                {value}
            </text>
        );
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
                    <div className="flex items-center gap-4">
                        {/* Gráfico de dona */}
                        <div className="flex-1 relative">
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    />
                                    <Tooltip
                                        content={<CustomTooltip />}
                                        wrapperStyle={{ zIndex: 50, outline: 'none' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Indicador central */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10">
                                <div className="text-2xl font-black text-gray-900 leading-none">
                                    {formatNumber(data.TOTAL || 0)}
                                </div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                    Total
                                </div>
                            </div>
                        </div>

                        {/* Lista de estadísticas al costado */}
                        <div className="flex flex-col gap-2 min-w-[140px]">
                            {chartData.map((item, index) => {
                                const total = chartData.reduce((sum, i) => sum + i.value, 0);
                                const percent = ((item.value / total) * 100).toFixed(1);

                                return (
                                    <div key={index} className="flex items-center gap-2">
                                        {/* Indicador de color */}
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: item.fill }}
                                        />

                                        {/* Información */}
                                        <div className="flex-1">
                                            <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-tight leading-tight">
                                                {item.name}
                                            </div>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-sm font-bold text-gray-900">
                                                    {item.value}
                                                </span>
                                                <span className="text-[11px] font-medium text-gray-500">
                                                    ({percent}%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
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
